"""
Servicio de voz del avatar (TTS + visemas para lip sync).

Kokoro sintetiza la voz y MMS_FA (torchaudio) hace *forced alignment* del audio real
contra el texto, de donde salen los tiempos de cada visema (fonemas via espeak-ng).

Contrato (el que consume mfes/frontend-app-learning/src/asistente/config/ttsService.js):
    POST /synthesize
        headers: Authorization: Bearer <token>
        body:    {text, voice}
        ->       {audio_base64 (WAV), visemes[{viseme,start,duration}]}

El token lo emite el LMS (GET /api/ficct/avatar/tts-token/, requiere sesion
autenticada) y es un HMAC de vida corta: "<user_id>.<exp>.<sig>" firmado con
AVATAR_TTS_SECRET, el mismo secreto que este proceso recibe por variable de entorno.
El audio nunca pasa por el LMS -- solo el token, que cuesta milisegundos de emitir --
asi que una sintesis de 5-10 s no compite por los workers de uwsgi.

Las respuestas exitosas se cachean en disco por hash de (voz, texto): los pasos del
tour son texto fijo, asi que a partir del segundo alumno salen en milisegundos.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import tempfile
import threading
import time
import traceback
from collections import deque
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- 1. FASTAPI + CORS ---

web_app = FastAPI(title="Avatar TTS")

# Defensa en profundidad sobre el token: no es autenticacion (un curl con el token
# correcto lo salta igual), pero corta peticiones directas desde otras paginas.
_origins = os.environ.get("AVATAR_TTS_CORS_ORIGINS", "*")
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. MODELOS DE DATOS ---

VOICE_MAP = {
    "dora":  "ef_dora",   # Mujer
    "alex":  "em_alex",   # Hombre
    "santa": "em_santa",  # Hombre
}
DEFAULT_VOICE = "dora"

# Mismo tope que MAX_QUESTION_CHARS en avatar_views.py: evita que una sola peticion
# monopolice la CPU. Se aplica con o sin token.
MAX_TEXT_CHARS = 1000


class SynthesisRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE


class Viseme(BaseModel):
    viseme: str
    start: float
    duration: float


class SynthesisResponse(BaseModel):
    audio_base64: str
    visemes: list[Viseme]


# --- 3. AUTENTICACION (token firmado por el LMS) ---

AVATAR_TTS_SECRET = os.environ.get("AVATAR_TTS_SECRET", "")

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
    AVATAR_TTS_SECRET configurado, /synthesize no funciona en vez de aceptar
    cualquier peticion."""
    if not AVATAR_TTS_SECRET:
        raise HTTPException(
            status_code=503,
            detail="TTS no configurado (falta AVATAR_TTS_SECRET).",
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
        AVATAR_TTS_SECRET.encode("utf-8"),
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

# El token dura varios minutos y podria reusarse sin limite dentro de esa ventana.
# Un solo contenedor, asi que un dict en memoria alcanza -- no hace falta Redis.
RATE_PER_MIN = int(os.environ.get("AVATAR_TTS_RATE_PER_MIN", "30"))

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
                detail="Demasiadas peticiones. Espera un momento.",
            )
        history.append(now)


# --- 5. CARGA DE MODELOS ---

kokoro_pipeline = None
mms_model = None
mms_labels = None


def load_models():
    global kokoro_pipeline, mms_model, mms_labels

    import torch

    # Tope de paralelismo de PyTorch mientras sintetiza -- no es una reserva de CPUs:
    # en reposo el proceso no usa nada. 0 = sin limite.
    threads = int(os.environ.get("AVATAR_TTS_THREADS", "4"))
    if threads > 0:
        torch.set_num_threads(threads)

    if kokoro_pipeline is None:
        from kokoro import KPipeline
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Cargando Kokoro en {device} ({torch.get_num_threads()} threads)...")
        kokoro_pipeline = KPipeline(lang_code='e', device=device)
        print("Kokoro listo")

    if mms_model is None:
        import torchaudio
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        bundle = torchaudio.pipelines.MMS_FA
        print(f"Cargando MMS_FA en {device}...")
        mms_model = bundle.get_model().to(device)
        mms_labels = bundle.get_labels(star=None)
        print("MMS_FA listo")


@web_app.on_event("startup")
def _startup():
    """Los modelos se cargan al arrancar, no en la primera peticion: asi el primer
    alumno que pregunte no paga los ~30 s de carga."""
    load_models()


# --- 6. TABLA FONEMA IPA -> VISEMA ---

PHONEME_TO_VISEME = {
    # Bilabiales -> B (labios juntos)
    'p': 'B', 'b': 'B', 'm': 'B',
    # Labiodentales -> F
    'f': 'F', 'v': 'F',
    # Dentales / alveolares -> D
    'd': 'D', 't': 'D', 'n': 'D', 'l': 'D',
    # Sibilantes -> C
    's': 'C', 'z': 'C', 'x': 'C',
    # Velares / vibrantes -> G
    'k': 'G', 'g': 'G', 'r': 'G', 'ɾ': 'G',
    # Vocales abiertas -> A
    'a': 'A', 'ɑ': 'A',
    # Vocales medias / anteriores -> E
    'e': 'E', 'ɛ': 'E', 'i': 'E', 'j': 'E',
    # Vocales cerradas / posteriores -> H
    'o': 'H', 'u': 'H', 'w': 'H',
}


def get_word_phonemes(word: str) -> list[str]:
    import subprocess
    try:
        result = subprocess.run(
            ['espeak-ng', '-v', 'es', '--ipa', '-q', word],
            capture_output=True, text=True, timeout=5,
        )
        ipa = re.sub(r'[ˈˌ.()\n\r ]', '', result.stdout.strip())
        phonemes = []
        i = 0
        while i < len(ipa):
            two = ipa[i:i + 2]
            if two in PHONEME_TO_VISEME:
                phonemes.append(two)
                i += 2
            elif ipa[i] in PHONEME_TO_VISEME:
                phonemes.append(ipa[i])
                i += 1
            else:
                i += 1
        return phonemes or ['a']
    except Exception:
        return ['a']


# --- 7. ALINEACION MMS_FA -> VISEMAS ---

def build_visemes(word_spans, words: list[str], ratio: float) -> list[Viseme]:
    visemes = []
    for word, spans in zip(words, word_spans):
        if not spans:
            continue
        word_start = spans[0].start * ratio
        word_end = (spans[-1].end + 1) * ratio
        duration = word_end - word_start
        if duration < 0.01:
            continue
        phonemes = get_word_phonemes(word)
        ph_dur = duration / len(phonemes)
        for j, ph in enumerate(phonemes):
            visemes.append(Viseme(
                viseme=PHONEME_TO_VISEME.get(ph, 'A'),
                start=round(word_start + j * ph_dur, 3),
                duration=round(ph_dur, 3),
            ))
    return visemes


def align_visemes(wav_path: str, text: str) -> list[Viseme]:
    import torch
    import soundfile as sf
    import torchaudio
    import torchaudio.functional as F

    device = "cuda" if torch.cuda.is_available() else "cpu"
    bundle = torchaudio.pipelines.MMS_FA

    data, sr = sf.read(wav_path, dtype='float32')
    waveform = torch.from_numpy(data).unsqueeze(0)
    if sr != bundle.sample_rate:
        waveform = torchaudio.functional.resample(waveform, sr, bundle.sample_rate)
    waveform = waveform.to(device)

    # Normalizar texto: solo a-z y espacios para el diccionario de MMS_FA
    text_norm = text.lower()
    text_norm = re.sub(r'[áä]', 'a', text_norm)
    text_norm = re.sub(r'[éë]', 'e', text_norm)
    text_norm = re.sub(r'[íï]', 'i', text_norm)
    text_norm = re.sub(r'[óö]', 'o', text_norm)
    text_norm = re.sub(r'[úüù]', 'u', text_norm)
    text_norm = re.sub(r'ñ', 'n', text_norm)
    text_norm = re.sub(r'[^a-z\s]', '', text_norm)

    words = text_norm.split()
    if not words:
        return []

    dictionary = {c: i for i, c in enumerate(mms_labels)}

    def tokenize(word):
        return [dictionary[c] for c in word if c in dictionary]

    word_tokens = [tokenize(w) for w in words]
    valid_pairs = [(w, t) for w, t in zip(words, word_tokens) if t]
    if not valid_pairs:
        return []
    words_valid, word_tokens_valid = zip(*valid_pairs)

    flat_tokens = [t for wt in word_tokens_valid for t in wt]
    word_lengths = [len(wt) for wt in word_tokens_valid]

    with torch.inference_mode():
        emission, _ = mms_model(waveform)

    targets = torch.tensor([flat_tokens], dtype=torch.int32, device=device)
    alignments, scores = F.forced_align(emission, targets, blank=0)
    alignments, scores = alignments[0], scores[0]
    scores = scores.exp()

    token_spans = F.merge_tokens(alignments, scores)

    word_spans = []
    i = 0
    for length in word_lengths:
        word_spans.append(token_spans[i:i + length])
        i += length

    ratio = waveform.shape[1] / emission.shape[1] / bundle.sample_rate
    return build_visemes(word_spans, list(words_valid), ratio)


# --- 8. CACHE EN DISCO (por hash de voz + texto) ---

CACHE_DIR = Path(os.environ.get("AVATAR_TTS_CACHE_DIR", "/cache"))
CACHE_MAX_ENTRIES = int(os.environ.get("AVATAR_TTS_CACHE_MAX_ENTRIES", "500"))

_cache_prune_lock = threading.Lock()


def _cache_key(voice_id: str, text: str) -> str:
    return hashlib.sha256(f"{voice_id}\x00{text}".encode("utf-8")).hexdigest()


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def _cache_read(key: str) -> SynthesisResponse | None:
    try:
        data = json.loads(_cache_path(key).read_text())
        return SynthesisResponse(**data)
    except FileNotFoundError:
        return None
    except Exception:
        # Cache corrupto (escritura interrumpida, etc.): se ignora y se re-sintetiza.
        return None


def _cache_write(key: str, response: SynthesisResponse) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(key)
    # Sufijo unico por proceso+hilo: dos peticiones concurrentes del mismo texto no
    # se pisan el archivo temporal.
    tmp_path = path.with_name(f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    tmp_path.write_text(response.model_dump_json())
    os.replace(tmp_path, path)
    _prune_cache()


def _prune_cache() -> None:
    with _cache_prune_lock:
        entries = sorted(CACHE_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime)
        excess = len(entries) - CACHE_MAX_ENTRIES
        for path in entries[:max(excess, 0)]:
            path.unlink(missing_ok=True)


# --- 9. ENDPOINTS ---

@web_app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_speech(request: SynthesisRequest, user_id: int = Depends(verify_token)):
    check_rate_limit(user_id)

    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="El texto esta vacio.")
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Texto demasiado largo (maximo {MAX_TEXT_CHARS} caracteres).",
        )

    voice_key = (request.voice or DEFAULT_VOICE).lower()
    voice_id = VOICE_MAP.get(voice_key)
    if voice_id is None:
        raise HTTPException(
            status_code=400,
            detail=f"Voz '{request.voice}' no válida. Opciones: {list(VOICE_MAP.keys())}",
        )

    cache_key = _cache_key(voice_id, text)
    cached = _cache_read(cache_key)
    if cached is not None:
        return cached

    load_models()

    print(f"Sintetizando: '{text}' | voz: {voice_id}")
    wav_path = None

    try:
        import numpy as np
        import soundfile as sf

        audio_chunks = []
        for result in kokoro_pipeline(text, voice=voice_id, speed=1.0):
            audio_chunks.append(result[2])

        if not audio_chunks:
            raise ValueError("Kokoro no generó audio.")

        audio = np.concatenate(audio_chunks)

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            wav_path = f.name
        sf.write(wav_path, audio, 24000)

        # Forced alignment con MMS_FA → visemas basados en el audio real
        visemes_list = align_visemes(wav_path, text)

        with open(wav_path, 'rb') as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')

        print(f">>> Listo | Visemas: {len(visemes_list)}")
        response = SynthesisResponse(audio_base64=audio_base64, visemes=visemes_list)
        _cache_write(cache_key, response)
        return response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {e}")

    finally:
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)


@web_app.get("/")
def read_root():
    return {"status": "Servicio de Avatar TTS en linea", "voices": list(VOICE_MAP.keys())}


@web_app.get("/voices")
def list_voices():
    return {"voices": VOICE_MAP}


@web_app.get("/health")
def health():
    """Para el healthcheck del contenedor: responde recien cuando los modelos cargaron.
    Sin auth a proposito -- Docker necesita poder pegarle sin token."""
    ready = kokoro_pipeline is not None and mms_model is not None
    return {"ready": ready}


@web_app.get("/cache-stats")
def cache_stats():
    entries = list(CACHE_DIR.glob("*.json")) if CACHE_DIR.exists() else []
    return {
        "entries": len(entries),
        "bytes": sum(p.stat().st_size for p in entries),
        "max_entries": CACHE_MAX_ENTRIES,
    }
