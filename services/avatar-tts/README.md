# Servicio de voz del avatar (TTS + visemas)

Genera el audio que habla el avatar del MFE `learning` y los **visemas** que mueven su
boca. Kokoro sintetiza la voz y MMS_FA (torchaudio) hace *forced alignment* del audio
real contra el texto, de donde salen los tiempos de cada visema.

Lo consume `mfes/frontend-app-learning/src/asistente/config/ttsService.js`, que llama a
la URL de `AVATAR_TTS_API_URL`.

```
POST {AVATAR_TTS_API_URL}
  request : {"text": "...", "voice": "dora" | "alex" | "santa"}
  response: {"audio_base64": "<WAV>", "visemes": [{"viseme": "A".."H", "start": s, "duration": s}]}
```

## Dos formas de desplegarlo

| | Modal (actual) | Contenedor propio |
|---|---|---|
| Codigo | `modal/modal_api_v3.py` | `app.py` + `Dockerfile` |
| Hardware | GPU T4 | CPU del servidor |
| Estado en reposo | escala a cero a los 5 min | siempre caliente |
| Primera peticion tras inactividad | cold start (carga modelos + GPU) | ya cargado |
| Costo | por segundo de GPU | ninguno (el servidor ya esta pago) |
| Migracion | no depende del servidor | se va con el servidor |
| Acceso | publico, sin auth (`allow_origins=["*"]`) | detras del Caddy propio, CORS acotado |

**Cambiar de una a otra es un solo comando**, sin rebuild de imagenes:

```bash
tutor config save --set AVATAR_TTS_API_URL=<la otra url> && tutor local restart lms
```

Por eso conviene medir antes de decidir, y la medicion se hace con el contenedor real.

## Medir en el servidor nuevo

⚠️ Medir en el servidor viejo no sirve: tiene 4 vCPU contra 8 y otro modelo de CPU, y
con ~2 GB de RAM libres cargar torch + Kokoro + MMS_FA puede disparar el OOM killer
sobre el LMS.

```bash
cd /root/openedx-ficct/services/avatar-tts

# 1. Construir (~10 min la primera vez: baja torch y hornea los modelos)
docker build -t ficct-avatar-tts .

# 2. Levantar suelto, sin tocar el stack de Tutor
docker run --rm -p 8899:80 --name tts-bench ficct-avatar-tts

# 3. En otra terminal: esperar a que carguen los modelos
until curl -sf localhost:8899/health | grep -q '"ready":true'; do sleep 2; done

# 4. Cronometrar una respuesta tipica del avatar (3 oraciones)
curl -s -o /dev/null -w 'total: %{time_total}s\n' \
  -X POST localhost:8899/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hola, llevas el sesenta por ciento del curso completado. Tu proxima entrega es el ejercicio de funciones recursivas. Te recomiendo reforzar el tema de listas.","voice":"dora"}'
```

Repetir 3 o 4 veces y quedarse con el tiempo estable (el primero incluye warm-up).

**Como leer el numero:**

- **menos de ~5 s** → self-hosting gana claro: sin cold starts, sin dependencia externa,
  sin costo por peticion.
- **entre 5 y 15 s** → zona gris. Depende de si tus alumnos usan el avatar seguido (a
  favor de Modal, que estaria caliente) o esporadicamente (a favor del contenedor, porque
  en Modal casi toda peticion pagaria cold start).
- **mas de ~15 s** → quedate en Modal.

Si el tiempo es alto, antes de descartarlo probar subiendo `AVATAR_TTS_THREADS`
(`docker run -e AVATAR_TTS_THREADS=8 ...`): el default deja la mitad de los cores libres
para el resto del stack, y en una prueba aislada eso lo penaliza.

## Desplegarlo dentro de Tutor

```bash
docker build -t ficct-avatar-tts /root/openedx-ficct/services/avatar-tts

tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_tts.py
tutor plugins enable avatar_tts
tutor config save --set AVATAR_TTS_API_URL=http://tts.$(tutor config printvalue LMS_HOST)/synthesize
tutor local start -d
```

El plugin agrega el servicio `avatar-tts` al compose y un vhost `tts.<LMS_HOST>` en el
Caddy de Tutor. Variables: `AVATAR_TTS_HOST`, `AVATAR_TTS_DOCKER_IMAGE`,
`AVATAR_TTS_THREADS`.

⚠️ La imagen se construye **en cada servidor**; no se publica en ningun registry. Si se
migra de host hay que volver a construirla (o `docker save`/`docker load`).

## Redesplegar en Modal

```bash
pip install modal && modal setup
modal deploy modal/modal_api_v3.py
tutor config save --set AVATAR_TTS_API_URL=<url que imprime modal>/synthesize
tutor local restart lms
```

## Mantener las dos versiones en sincronia

`app.py` y `modal/modal_api_v3.py` comparten toda la logica: `VOICE_MAP`,
`PHONEME_TO_VISEME`, `get_word_phonemes`, `build_visemes`, `align_visemes` y
`synthesize_speech`. **Un cambio en la tabla de visemas o en la normalizacion del
espanol hay que aplicarlo en los dos archivos.** `app.py` agrega solo: carga de modelos
al startup, `torch.set_num_threads()`, CORS configurable y `/health`.

## Pendiente

El endpoint no tiene autenticacion en ninguna de las dos variantes: cualquiera que lea
`AVATAR_TTS_API_URL` de `/api/mfe_config/v1` puede mandarle texto. El CORS acotado del
contenedor propio corta el abuso desde otras paginas, pero no desde un `curl`. La
solucion de fondo es proxear el TTS por el LMS, como se hizo con OpenRouter en
`/api/ficct/avatar/ask/` (ver `apps-custom/ficct-dashboard-api/avatar_views.py`).
