# Servicio de voz del avatar (TTS + visemas)

Genera el audio que habla el avatar del MFE `learning` y los **visemas** que mueven su
boca. Kokoro sintetiza la voz y MMS_FA (torchaudio) hace *forced alignment* del audio
real contra el texto, de donde salen los tiempos de cada visema.

Lo consume `mfes/frontend-app-learning/src/asistente/config/ttsService.js`, que llama a
la URL de `AVATAR_TTS_API_URL` directo desde el navegador (el audio **no** pasa por el
LMS — ver "Autenticación" abajo).

```
POST {AVATAR_TTS_API_URL}
  headers : Authorization: Bearer <token>
  request : {"text": "...", "voice": "dora" | "alex" | "santa"}
  response: {"audio_base64": "<WAV>", "visemes": [{"viseme": "A".."H", "start": s, "duration": s}]}
```

Corre como contenedor propio (`app.py` + `Dockerfile`) dentro del stack de Tutor, en el
servidor de producción. No requiere GPU: usa la rueda CPU de torch.

## Autenticación (token corto firmado por el LMS)

El endpoint `/synthesize` exige `Authorization: Bearer <token>`. El token lo emite el
LMS en `GET /api/ficct/avatar/tts-token/` (requiere sesión autenticada, ver
`apps-custom/ficct-dashboard-api/ficct_dashboard_api/avatar_views.py`):

```
navegador
  ├─ GET  {LMS_BASE_URL}/api/ficct/avatar/tts-token/     ← IsAuthenticated + throttle
  │        ↳ {"token": "<uid>.<exp>.<sig>", "expires_in": 300}
  └─ POST {AVATAR_TTS_API_URL}                            ← este contenedor
           Authorization: Bearer <token>
           ↳ {audio_base64, visemes}
```

**Por qué el LMS no proxea el audio directamente** (como sí hace con el LLM en
`/api/ficct/avatar/ask/`): el LMS corre con solo **2 workers de uwsgi**
(`UWSGI_WORKERS=2`), y una síntesis tarda 5-10 s. Proxear el audio dejaría la
plataforma sin workers libres para el resto de los alumnos durante cada frase del
avatar — y el avatar llama al TTS en cada paso del tour, no solo al responder una
pregunta. Emitir un token, en cambio, cuesta milisegundos de uwsgi.

El token es un HMAC: `"<user_id>.<exp>.<sig>"`, firmado con `AVATAR_TTS_SECRET` (mismo
secreto en el LMS y en este contenedor, ver `tutor-plugins/avatar_asistente.py` y
`tutor-plugins/avatar_tts.py`). Este servicio lo valida sin llamar de vuelta al LMS.
Detalles en `app.py` (`verify_token`):

- Falla **cerrado**: sin `AVATAR_TTS_SECRET` configurado, `/synthesize` responde 503 en
  vez de aceptar cualquier petición.
- Tope duro de vigencia de 10 min (`TOKEN_MAX_TTL_SECONDS`), aunque el token pida más —
  acota el daño si el secreto se filtrara algún día.
- Límite de tasa por usuario (`AVATAR_TTS_RATE_PER_MIN`, default 30/min) además del
  throttle que ya aplica el LMS al emitir el token.
- Límite de longitud de texto (`MAX_TEXT_CHARS = 1000`), con o sin token — evita que una
  sola petición monopolice la CPU.

El vhost de Caddy (`tts.<LMS_HOST>`) y el CORS acotado al origen del MFE
(`AVATAR_TTS_CORS_ORIGINS`) se mantienen como defensa en profundidad sobre el token, no
como la única barrera.

## Caché en disco

Las síntesis exitosas se cachean en `AVATAR_TTS_CACHE_DIR` (default `/cache`, montado
como volumen persistente por `avatar_tts.py`) por hash de `(voz, texto)`. Los pasos del
tour son texto fijo: a partir del segundo alumno que lo escucha, la respuesta sale en
milisegundos en vez de sintetizarse de nuevo. Las respuestas del LLM (siempre distintas
por pregunta) no se cachean.

`AVATAR_TTS_CACHE_MAX_ENTRIES` (default 500, ~300 MB) poda las entradas más viejas por
fecha de escritura. `GET /cache-stats` muestra cuántas entradas hay y cuánto pesan.

## Medir `AVATAR_TTS_THREADS` en el servidor real

`AVATAR_TTS_THREADS` es un tope de paralelismo de PyTorch **mientras sintetiza** — no
una reserva de CPUs: en reposo el proceso no usa nada, y el contenedor no tiene
`cpuset`/`--cpus`, así que el resto del stack (uwsgi, Celery, MySQL, Mongo) sigue
recibiendo tiempo de CPU con normalidad incluso durante una síntesis.

El default es 4. Antes de subirlo, medir con la carga real del servidor:

```bash
cd /root/openedx-ficct/services/avatar-tts

# 1. Construir (~10 min la primera vez: baja torch y hornea modelos + voces)
docker build -t ficct-avatar-tts .

# 2. Levantar suelto, sin tocar el stack de Tutor
docker run --rm -p 8899:80 -e AVATAR_TTS_SECRET=bench --name tts-bench ficct-avatar-tts

# 3. En otra terminal: esperar a que carguen los modelos
until curl -sf localhost:8899/health | grep -q '"ready":true'; do sleep 2; done

# 4. Generar un token de prueba con el mismo algoritmo que el LMS
TOKEN=$(python3 -c "
import hmac, hashlib, time
secret, uid = 'bench', 1
exp = int(time.time()) + 300
payload = f'{uid}.{exp}'
sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
print(f'{payload}.{sig}')
")

# 5. Cronometrar una respuesta tipica del avatar (3 oraciones, texto distinto cada vez
#    para no medir la cache)
curl -s -o /dev/null -w 'total: %{time_total}s\n' \
  -X POST localhost:8899/synthesize \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"Hola, llevas el sesenta por ciento del curso completado. Tu proxima entrega es el ejercicio de funciones recursivas. Te recomiendo reforzar el tema de listas.","voice":"dora"}'
```

Repetir 3 o 4 veces (variando una palabra del texto para evitar la caché) y quedarse con
el tiempo estable. Si conviene subir `AVATAR_TTS_THREADS`, es una sola variable de
entorno sin rebuild:

```bash
tutor config save --set AVATAR_TTS_THREADS=6
tutor local restart
```

## Desplegarlo dentro de Tutor

```bash
docker build -t ficct-avatar-tts /root/openedx-ficct/services/avatar-tts

tutor config save --set AVATAR_TTS_SECRET=$(openssl rand -hex 32)
tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_tts.py
tutor plugins enable avatar_tts
tutor config save --set AVATAR_TTS_API_URL=http://tts.$(tutor config printvalue LMS_HOST)/synthesize
tutor local start -d
```

El plugin agrega el servicio `avatar-tts` al compose (con el volumen de caché y el
secreto) y un vhost `tts.<LMS_HOST>` en el Caddy de Tutor. Variables: `AVATAR_TTS_HOST`,
`AVATAR_TTS_DOCKER_IMAGE`, `AVATAR_TTS_THREADS`, `AVATAR_TTS_RATE_PER_MIN`,
`AVATAR_TTS_CACHE_MAX_ENTRIES`.

El endpoint del token (`GET /api/ficct/avatar/tts-token/`) vive en la imagen `openedx`
(paquete `apps-custom/ficct-dashboard-api`), así que además hace falta:

```bash
tutor config save --set FICCT_DASHBOARD_API_REF=<commit-sha>
tutor images build openedx
```

⚠️ La imagen del TTS se construye **en cada servidor**; no se publica en ningún
registry. Si se migra de host hay que volver a construirla (o `docker save`/`docker
load`).

## Rollback

Si el TTS en CPU no rinde, apagar la voz es una línea, sin rebuild:

```bash
tutor config save --set AVATAR_ENABLED=false
tutor local restart lms
```
