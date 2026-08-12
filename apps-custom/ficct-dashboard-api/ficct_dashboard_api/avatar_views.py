"""
Proxy del LLM del asistente avatar.

Antes el MFE `learning` llamaba a OpenRouter directamente desde el navegador con la
API key tomada de `getConfig().OPENROUTER_API_KEY`. Esa key se publicaba en MFE_CONFIG,
que el LMS sirve sin autenticacion en `GET /api/mfe_config/v1`: cualquiera podia leerla
y gastar con ella.

Ahora la key vive solo en los settings de Django (`FICCT_AVATAR`, ver el plugin de Tutor
`avatar_asistente.py`) y el MFE pregunta aca. Como el gasto lo paga el servidor, el
endpoint exige usuario autenticado y limita la tasa por usuario.
"""
import logging

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
    'nunca digas que no tienes informacion si el temario esta presente. Responde en '
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
