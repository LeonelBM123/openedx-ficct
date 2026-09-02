"""
Gateway del LLM local del asistente avatar.

Recibe la pregunta+contexto directo del navegador (sin pasar por el LMS), arma el
prompt con el SYSTEM_PROMPT fijo del servidor, y llama a Ollama (contenedor
"avatar-llm", solo alcanzable en la red interna de docker-compose).

Mismo motivo que services/avatar-tts: el LMS corre con 2 workers de uwsgi
(UWSGI_WORKERS=2) y una inferencia en CPU sin GPU puede tardar 10-60+ s. Proxear esa
espera por Django dejaria la plataforma sin workers libres para el resto de los
alumnos. El LMS solo emite un token corto (GET /api/ficct/avatar/llm-token/, ver
AvatarLlmTokenView en apps-custom/ficct-dashboard-api/ficct_dashboard_api/avatar_views.py)
que este proceso valida sin llamar de vuelta al LMS.

MAX_QUESTION_CHARS, MAX_CONTEXT_CHARS y SYSTEM_PROMPT son copias deliberadas de
avatar_views.py -- no hay import cross-imagen posible (contenedores distintos).
Mantener sincronizados a mano si el prompt o los limites cambian ahi.

Contrato (el que consume mfes/frontend-app-learning/src/asistente/config/llmService.js):
    POST /ask
        headers: Authorization: Bearer <token>
        body:    {pregunta, contexto}
        ->       {respuesta}
"""
import hashlib
import hmac
import os
import threading
import time
from collections import deque

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- 1. FASTAPI + CORS ---

web_app = FastAPI(title="Avatar LLM Gateway")

# Defensa en profundidad sobre el token: no es autenticacion (un curl con el token
# correcto lo saltea igual), pero corta peticiones directas desde otras paginas.
_origins = os.environ.get("AVATAR_LLM_CORS_ORIGINS", "*")
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. MODELOS DE DATOS ---

# Mismos topes que MAX_QUESTION_CHARS/MAX_CONTEXT_CHARS en avatar_views.py: evitan que
# una sola peticion monopolice la CPU. Se aplican con o sin token.
MAX_QUESTION_CHARS = 1000
MAX_CONTEXT_CHARS = 8000

# Mismo valor que MAX_TOKENS en avatar_views.py (OpenRouter). Se probo primero
# qwen3:4b, pero es un modelo hibrido "thinking" que gasta la mayoria del presupuesto
# de tokens en un razonamiento interno oculto antes de responder -- con 300 tokens el
# "content" salia vacio, y ni "think": false ni el truco "/no_think" lograron
# desactivarlo en esta version de Ollama. Se cambio a gemma3:4b (sin ese modo), que
# responde directo: 5-16s medidos en este servidor, sin desperdiciar tokens.
MAX_TOKENS = 300

# Copia exacta de SYSTEM_PROMPT en avatar_views.py. Vivia en AvatarTour.jsx (el
# cliente lo mandaba y por lo tanto podia reemplazarlo); del lado del servidor es
# fijo, igual que en el proxy de OpenRouter.
SYSTEM_PROMPT = (
    'Eres el asistente academico virtual del estudiante en esta plataforma. En el '
    'contexto recibes el titulo, la descripcion y el temario del curso (sus secciones '
    'y lecciones), su ubicacion actual (curso, seccion, leccion y unidad), su progreso '
    'de completitud, su calificacion, sus proximas entregas y entregas vencidas, y las '
    'areas que debe reforzar (temas o tipos de actividad por debajo del 60%). Usa esos '
    'datos concretos para responder. Preguntas generales como "¿de que trata el curso?" '
    'o "¿que temas cubre?" respondelas resumiendo el titulo y el temario del contexto; '
    'nunca digas que no tienes informacion si el temario esta presente. Si el estudiante '
    'solo te saluda o escribe un mensaje breve sin una pregunta clara (por ejemplo '
    '"hola", "buenas"), saluda brevemente y pregunta en que puedes ayudarlo -- no '
    'resumas el contexto del curso a menos que te lo pidan explicitamente. Responde en '
    'espanol, claro, conciso y con tono alentador, maximo 3 oraciones. Reserva el "no '
    'tengo esa informacion" solo para el contenido interno especifico de una leccion '
    'que no aparece en el contexto.'
)


class AskRequest(BaseModel):
    pregunta: str
    contexto: str = ""


class AskResponse(BaseModel):
    respuesta: str


# --- 3. AUTENTICACION (token firmado por el LMS) ---

AVATAR_LLM_SECRET = os.environ.get("AVATAR_LLM_SECRET", "")

# Tope duro de vigencia, aunque el token pida mas: si el secreto se filtrara algun dia,
# esto acota la ventana en la que un token forjado sigue siendo valido.
TOKEN_MAX_TTL_SECONDS = 600


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_token(authorization: str | None = Header(None)) -> int:
    """Devuelve el user_id del token si es valido. Falla cerrado: sin
    AVATAR_LLM_SECRET configurado, /ask no funciona en vez de aceptar cualquier
    peticion. Identico al esquema de services/avatar-tts/app.py, con secreto propio."""
    if not AVATAR_LLM_SECRET:
        raise HTTPException(
            status_code=503,
            detail="LLM local no configurado (falta AVATAR_LLM_SECRET).",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized("Falta el token.")

    token = authorization[len("Bearer "):]
    parts = token.split(".")
    if len(parts) != 3:
        raise _unauthorized("Token malformado.")

    user_id_raw, exp_raw, sig = parts
    try:
        user_id = int(user_id_raw)
        exp = int(exp_raw)
    except ValueError:
        raise _unauthorized("Token malformado.")

    expected_sig = hmac.new(
        AVATAR_LLM_SECRET.encode("utf-8"),
        f"{user_id_raw}.{exp_raw}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise _unauthorized("Token invalido.")

    now = int(time.time())
    if exp < now:
        raise _unauthorized("Token vencido.")
    if exp - now > TOKEN_MAX_TTL_SECONDS:
        raise _unauthorized("Token con vigencia excesiva.")

    return user_id


# --- 4. LIMITE DE TASA POR USUARIO ---

# El token dura varios minutos y podria reusarse sin limite dentro de esa ventana. Un
# solo contenedor, asi que un dict en memoria alcanza -- no hace falta Redis. Mas
# estricto que el de TTS por defecto: cada pregunta es mucho mas cara en CPU.
RATE_PER_MIN = int(os.environ.get("AVATAR_LLM_RATE_PER_MIN", "5"))

_rate_lock = threading.Lock()
_rate_history: dict[int, deque] = {}


def check_rate_limit(user_id: int) -> None:
    now = time.monotonic()
    window_start = now - 60
    with _rate_lock:
        history = _rate_history.setdefault(user_id, deque())
        while history and history[0] < window_start:
            history.popleft()
        if len(history) >= RATE_PER_MIN:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas preguntas. Espera un momento.",
            )
        history.append(now)


# --- 5. LLAMADA A OLLAMA ---

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://avatar-llm:11434/v1")
LOCAL_LLM_MODEL = os.environ.get("AVATAR_LOCAL_LLM_MODEL", "qwen3:4b")
REQUEST_TIMEOUT = int(os.environ.get("AVATAR_LOCAL_LLM_TIMEOUT", "60"))


@web_app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest, user_id: int = Depends(verify_token)):
    check_rate_limit(user_id)

    pregunta = (request.pregunta or "").strip()[:MAX_QUESTION_CHARS]
    if not pregunta:
        raise HTTPException(status_code=400, detail="La pregunta esta vacia.")
    contexto = (request.contexto or "").strip()[:MAX_CONTEXT_CHARS]
    mensaje = f"{contexto}\n\nPregunta del estudiante: {pregunta}" if contexto else pregunta

    try:
        response = requests.post(
            f"{OLLAMA_URL}/chat/completions",
            json={
                "model": LOCAL_LLM_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": mensaje},
                ],
                "max_tokens": MAX_TOKENS,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        raise HTTPException(
            status_code=502,
            detail="No pude responder esa pregunta en este momento.",
        )

    choices = data.get("choices") or []
    respuesta = choices[0].get("message", {}).get("content", "") if choices else ""
    return AskResponse(respuesta=respuesta)


# --- 6. HEALTHCHECK ---

@web_app.get("/health")
def health():
    """Para el healthcheck del contenedor. Sin auth a proposito -- Docker necesita
    poder pegarle sin token. No valida Ollama en si (evita que un Ollama lento
    arrancando tumbe el healthcheck del gateway)."""
    return {"ready": True}
