"""
Proxy del LLM y emisor de tokens de voz del asistente avatar.

Antes el MFE `learning` llamaba a OpenRouter directamente desde el navegador con la
API key tomada de `getConfig().OPENROUTER_API_KEY`. Esa key se publicaba en MFE_CONFIG,
que el LMS sirve sin autenticacion en `GET /api/mfe_config/v1`: cualquiera podia leerla
y gastar con ella.

Ahora la key vive solo en los settings de Django (`FICCT_AVATAR`, ver el plugin de Tutor
`avatar_asistente.py`) y el MFE pregunta aca. Como el gasto lo paga el servidor, el
endpoint exige usuario autenticado y limita la tasa por usuario.

El servicio de voz (`services/avatar-tts`) sigue un patron distinto: el LMS NO proxea
el audio, solo emite un token corto (ver AvatarTtsTokenView) que el navegador usa para
hablar directo con el contenedor de TTS. Motivo: el LMS corre con solo 2 workers de
uwsgi (UWSGI_WORKERS=2) y una sintesis tarda 5-10 s, asi que proxear el audio dejaria
la plataforma sin workers para el resto de los alumnos durante cada frase del avatar.
"""
import hashlib
import hmac
import logging
import time

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

log = logging.getLogger(__name__)

# Recortes defensivos: el contexto lo arma el navegador, asi que su tamano no es
# confiable y cada token se paga.
MAX_QUESTION_CHARS = 1000
MAX_CONTEXT_CHARS = 8000

MAX_TOKENS = 300
REQUEST_TIMEOUT = 30

DEFAULT_MODEL = 'openai/gpt-4o-mini'
DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
DEFAULT_THROTTLE_RATE = '20/min'

# El contenedor de TTS impone su propio tope duro (TOKEN_MAX_TTL_SECONDS en app.py) por
# si este valor cambiara sin avisarle; 300s da margen de sobra para el tour mas largo.
TTS_TOKEN_TTL_SECONDS = 300
DEFAULT_TTS_TOKEN_THROTTLE_RATE = '60/min'

# Mismo esquema de token que TTS, pero para el gateway del LLM local
# (services/avatar-llm-gateway, ver AvatarLlmTokenView mas abajo).
LLM_TOKEN_TTL_SECONDS = 300
DEFAULT_LLM_TOKEN_THROTTLE_RATE = '60/min'

# Vivia en AvatarTour.jsx, es decir que el cliente lo mandaba y por lo tanto podia
# reemplazarlo. Del lado del servidor es fijo.
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


def _avatar_settings():
    """Config del avatar. Namespaced para no chocar con el OPENROUTER_API_KEY de nivel
    superior que define el plugin `iaassistant.py` para su propio XBlock."""
    return getattr(settings, 'FICCT_AVATAR', {})


class AvatarAskThrottle(UserRateThrottle):
    """Limite por usuario autenticado, configurable desde Tutor."""

    scope = 'ficct_avatar_ask'

    def get_rate(self):
        return _avatar_settings().get('THROTTLE_RATE') or DEFAULT_THROTTLE_RATE


class AvatarAskView(APIView):
    """
    Pregunta libre del estudiante al asistente avatar.

    **Ejemplo**
        POST /api/ficct/avatar/ask/
        {"pregunta": "¿de que trata el curso?", "contexto": "..."}

    **Respuesta**
        {"respuesta": "..."}

    Requiere autenticacion: sin eso seria una pasarela abierta a un LLM que pagamos
    nosotros. Como APIView de DRF, las clases de autenticacion por defecto del LMS
    (JWT + sesion) resuelven la llamada desde el MFE, que vive en otro subdominio.
    """

    permission_classes = (IsAuthenticated,)
    throttle_classes = (AvatarAskThrottle,)

    def post(self, request):
        pregunta = str(request.data.get('pregunta') or '').strip()[:MAX_QUESTION_CHARS]
        contexto = str(request.data.get('contexto') or '').strip()[:MAX_CONTEXT_CHARS]

        if not pregunta:
            return Response(
                {'error': 'La pregunta esta vacia.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = _avatar_settings()
        api_key = config.get('OPENROUTER_API_KEY')
        if not api_key:
            log.warning('FICCT_AVATAR["OPENROUTER_API_KEY"] no esta configurada.')
            return Response(
                {'error': 'El modulo de preguntas no esta disponible.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        base_url = (config.get('OPENROUTER_BASE_URL') or DEFAULT_BASE_URL).rstrip('/')
        mensaje = f'{contexto}\n\nPregunta del estudiante: {pregunta}' if contexto else pregunta

        try:
            response = requests.post(
                f'{base_url}/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': config.get('OPENROUTER_MODEL') or DEFAULT_MODEL,
                    'messages': [
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user', 'content': mensaje},
                    ],
                    'max_tokens': MAX_TOKENS,
                },
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException:
            # exc_info sin el cuerpo de la request: los headers llevan la key.
            log.exception('Fallo la llamada a OpenRouter para el avatar.')
            return Response(
                {'error': 'No pude responder esa pregunta en este momento.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            log.exception('OpenRouter devolvio una respuesta que no es JSON.')
            return Response(
                {'error': 'No pude responder esa pregunta en este momento.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        choices = data.get('choices') or []
        respuesta = choices[0].get('message', {}).get('content', '') if choices else ''

        return Response({'respuesta': respuesta})


class AvatarTtsTokenThrottle(UserRateThrottle):
    """Limite por usuario autenticado, configurable desde Tutor. El token dura varios
    minutos, asi que el MFE lo pide una vez y lo reusa -- este limite es una defensa
    contra un cliente roto o malicioso pidiendo tokens en bucle, no el trafico normal."""

    scope = 'ficct_avatar_tts_token'

    def get_rate(self):
        return _avatar_settings().get('TTS_TOKEN_THROTTLE_RATE') or DEFAULT_TTS_TOKEN_THROTTLE_RATE


class AvatarTtsTokenView(APIView):
    """
    Emite un token de corta duracion para hablar directo con el servicio de voz
    (`services/avatar-tts`), sin que el audio pase por el LMS.

    **Ejemplo**
        GET /api/ficct/avatar/tts-token/

    **Respuesta**
        {"token": "<user_id>.<exp>.<sig>", "expires_in": 300}

    El token es HMAC de `request.user.id` + expiracion, firmado con el mismo secreto
    que el contenedor de TTS recibe por variable de entorno (`AVATAR_TTS_SECRET`, ver
    el plugin de Tutor `avatar_tts.py`). El contenedor lo valida el mismo, sin llamar
    de vuelta al LMS -- por eso una peticion de sintesis no compite por los 2 workers
    de uwsgi que tiene el LMS.

    Es GET porque no muta nada del lado del servidor (a diferencia de AvatarAskView,
    que si dispara una llamada facturable a OpenRouter).
    """

    permission_classes = (IsAuthenticated,)
    throttle_classes = (AvatarTtsTokenThrottle,)

    def get(self, request):
        config = _avatar_settings()
        secret = config.get('TTS_SECRET')
        if not secret:
            log.warning('FICCT_AVATAR["TTS_SECRET"] no esta configurada.')
            return Response(
                {'error': 'El modulo de voz no esta disponible.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        exp = int(time.time()) + TTS_TOKEN_TTL_SECONDS
        payload = f'{request.user.id}.{exp}'
        sig = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()

        return Response({'token': f'{payload}.{sig}', 'expires_in': TTS_TOKEN_TTL_SECONDS})


class AvatarLlmTokenThrottle(UserRateThrottle):
    """Limite por usuario autenticado, configurable desde Tutor. Mismo espiritu que
    AvatarTtsTokenThrottle: el token dura varios minutos y se reusa, este limite es
    defensa contra un cliente pidiendo tokens en bucle, no el trafico normal."""

    scope = 'ficct_avatar_llm_token'

    def get_rate(self):
        return _avatar_settings().get('LLM_TOKEN_THROTTLE_RATE') or DEFAULT_LLM_TOKEN_THROTTLE_RATE


class AvatarLlmTokenView(APIView):
    """
    Emite un token de corta duracion para hablar directo con el gateway del LLM local
    (`services/avatar-llm-gateway`), sin que la inferencia pase por el LMS. Mismo
    mecanismo que AvatarTtsTokenView (HMAC de `request.user.id` + expiracion), pero
    firmado con un secreto propio (`AVATAR_LLM_SECRET`) para poder rotarlo sin afectar
    el token de voz.

    Solo tiene sentido cuando `FICCT_AVATAR["LLM_PROVIDER"] == "local"`, pero no se
    valida eso aca: si el operador no configuro `AVATAR_LLM_SECRET`, el gateway
    tampoco puede validar el token igual, asi que alcanza con fallar cerrado por falta
    de secreto. El MFE simplemente no llama a este endpoint en modo "openrouter".

    **Ejemplo**
        GET /api/ficct/avatar/llm-token/

    **Respuesta**
        {"token": "<user_id>.<exp>.<sig>", "expires_in": 300}
    """

    permission_classes = (IsAuthenticated,)
    throttle_classes = (AvatarLlmTokenThrottle,)

    def get(self, request):
        config = _avatar_settings()
        secret = config.get('LLM_SECRET')
        if not secret:
            log.warning('FICCT_AVATAR["LLM_SECRET"] no esta configurada.')
            return Response(
                {'error': 'El modulo de preguntas locales no esta disponible.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        exp = int(time.time()) + LLM_TOKEN_TTL_SECONDS
        payload = f'{request.user.id}.{exp}'
        sig = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()

        return Response({'token': f'{payload}.{sig}', 'expires_in': LLM_TOKEN_TTL_SECONDS})
