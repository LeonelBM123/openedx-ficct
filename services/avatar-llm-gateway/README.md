# Gateway del LLM local del avatar

Backend local (alternativa a OpenRouter) para las preguntas del asistente avatar,
respondidas con un modelo corriendo en Ollama en el mismo servidor (CPU, sin GPU).

Lo consume `mfes/frontend-app-learning/src/asistente/config/llmService.js`, que llama
a la URL de `AVATAR_LLM_API_URL` directo desde el navegador (la inferencia **no** pasa
por el LMS — ver "Autenticación" abajo).

```
POST {AVATAR_LLM_API_URL}
  headers : Authorization: Bearer <token>
  request : {"pregunta": "...", "contexto": "..."}
  response: {"respuesta": "..."}
```

Corre como contenedor propio (`app.py` + `Dockerfile`) dentro del stack de Tutor, junto
a otro contenedor con Ollama sin modificar (servicio `avatar-llm`, ver
`tutor-plugins/avatar_llm_local.py`). Mucho más liviano que `services/avatar-tts`: no
carga modelos propios, solo valida el token, arma el prompt y reenvía a Ollama.

## Autenticación (token corto firmado por el LMS)

El endpoint `/ask` exige `Authorization: Bearer <token>`. El token lo emite el LMS en
`GET /api/ficct/avatar/llm-token/` (requiere sesión autenticada, ver
`AvatarLlmTokenView` en `apps-custom/ficct-dashboard-api/ficct_dashboard_api/avatar_views.py`):

```
navegador
  ├─ GET  {LMS_BASE_URL}/api/ficct/avatar/llm-token/     ← IsAuthenticated + throttle
  │        ↳ {"token": "<uid>.<exp>.<sig>", "expires_in": 300}
  └─ POST {AVATAR_LLM_API_URL}/ask                        ← este contenedor
           Authorization: Bearer <token>
           ↳ {respuesta}
```

**Por qué el LMS no proxea la inferencia directamente** (como sí hace con OpenRouter en
`/api/ficct/avatar/ask/`): el LMS corre con solo **2 workers de uwsgi**
(`UWSGI_WORKERS=2`), y una inferencia en CPU sin GPU puede tardar 10-60+ s (muy por
encima de los 1-3 s típicos de OpenRouter). Proxear esa espera dejaría la plataforma
sin workers libres para el resto de los alumnos durante cada pregunta al avatar.
Emitir un token, en cambio, cuesta milisegundos de uwsgi — exactamente el mismo
razonamiento que ya se aplicó para la voz (`services/avatar-tts`).

El token es un HMAC: `"<user_id>.<exp>.<sig>"`, firmado con `AVATAR_LLM_SECRET` (mismo
secreto en el LMS y en este contenedor, ver `tutor-plugins/avatar_asistente.py` y
`tutor-plugins/avatar_llm_local.py`). Este servicio lo valida sin llamar de vuelta al
LMS. Detalles en `app.py` (`verify_token`):

- Falla **cerrado**: sin `AVATAR_LLM_SECRET` configurado, `/ask` responde 503 en vez de
  aceptar cualquier petición.
- Tope duro de vigencia de 10 min (`TOKEN_MAX_TTL_SECONDS`), aunque el token pida más.
- Límite de tasa por usuario (`AVATAR_LLM_RATE_PER_MIN`, default 5/min — más estricto
  que el de TTS porque cada pregunta es mucho más cara en CPU) además del throttle que
  ya aplica el LMS al emitir el token.
- Límites de longitud (`MAX_QUESTION_CHARS`/`MAX_CONTEXT_CHARS`, copiados de
  `avatar_views.py`), con o sin token.

El `SYSTEM_PROMPT` es una copia deliberada del que usa el proxy de OpenRouter en
`avatar_views.py` — no hay import posible entre imágenes de contenedores distintos.
Si el prompt cambia ahí, hay que actualizarlo acá a mano.

El servicio no vive en un subdominio propio (`llm.<LMS_HOST>`) sino colgado como ruta
(`/avatar-llm/*`) dentro del mismo vhost del LMS, vía Caddy — mismo patrón que
`/avatar-tts/*`. El navegador igual lo ve como un origen distinto al del MFE, así que
el CORS acotado al origen del MFE (`AVATAR_LLM_CORS_ORIGINS`) sigue haciendo falta como
defensa en profundidad sobre el token, no como la única barrera.

## Por qué un contenedor separado de Ollama

`avatar-llm` (Ollama sin modificar) y `avatar-llm-gateway` (este servicio) son dos
contenedores distintos:

- Ollama no valida tokens ni impone el `SYSTEM_PROMPT` del servidor — si el navegador
  hablara directo con él, cualquiera podría reemplazar el system prompt (mismo tipo de
  problema que ya forzó sacar la API key de OpenRouter de `MFE_CONFIG`).
- Mantiene a Ollama fuera de la red pública: solo el gateway lo alcanza, en la red
  interna de docker-compose.
- Permite cambiar el motor de inferencia (vLLM, llama.cpp) más adelante tocando solo
  este contenedor, sin tocar Django ni el MFE.

## Medir latencia en el servidor real

```bash
cd /root/openedx-ficct/services/avatar-llm-gateway

# 1. Construir (rápido: no hay modelos que hornear)
docker build -t ficct-avatar-llm-gateway .

# 2. Levantar suelto, apuntando a un Ollama ya corriendo con el modelo bajado
docker run --rm -p 8898:80 \
  -e AVATAR_LLM_SECRET=bench \
  -e OLLAMA_URL=http://<ip-o-host-de-ollama>:11434/v1 \
  --name llm-gateway-bench ficct-avatar-llm-gateway

# 3. Generar un token de prueba con el mismo algoritmo que el LMS
TOKEN=$(python3 -c "
import hmac, hashlib, time
secret, uid = 'bench', 1
exp = int(time.time()) + 300
payload = f'{uid}.{exp}'
sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
print(f'{payload}.{sig}')
")

# 4. Cronometrar una respuesta típica del avatar
curl -s -o /dev/null -w 'total: %{time_total}s\n' \
  -X POST localhost:8898/ask \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pregunta":"¿Qué es la recursividad?","contexto":"Curso: Introducción a Python"}'
```

## Desplegarlo dentro de Tutor

```bash
docker build -t ficct-avatar-llm-gateway /root/openedx-ficct/services/avatar-llm-gateway

tutor config save --set AVATAR_LLM_SECRET=$(openssl rand -hex 32)
tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_llm_local.py
tutor plugins enable avatar_llm_local
tutor config save --set AVATAR_LLM_API_URL=http://$(tutor config printvalue LMS_HOST)/avatar-llm/ask
tutor local start -d
docker exec tutor_local-avatar-llm-1 ollama pull gemma3:4b   # baja el modelo (AVATAR_LOCAL_LLM_MODEL)
tutor config save --set AVATAR_LLM_PROVIDER=local
tutor local restart lms mfe
```

El plugin agrega los servicios `avatar-llm` (Ollama) y `avatar-llm-gateway` al
compose, y una ruta `/avatar-llm/*` dentro del vhost del LMS en el Caddy de Tutor.
Variables: `AVATAR_LLM_GATEWAY_DOCKER_IMAGE`, `AVATAR_LOCAL_LLM_MODEL`,
`AVATAR_LOCAL_LLM_TIMEOUT`, `AVATAR_LLM_RATE_PER_MIN`.

⚠️ `tutor local do init` **no** baja el modelo automáticamente: Tutor 21 solo corre
esos jobs contra un servicio `<nombre>-job` explícito, que este plugin no define (ver
el comentario en `avatar_llm_local.py`). El `docker exec ... ollama pull` de arriba es
el paso real — es idempotente y el modelo persiste en el volumen aunque se recreen los
contenedores, así que solo hay que repetirlo si cambia `AVATAR_LOCAL_LLM_MODEL`.

El endpoint del token (`GET /api/ficct/avatar/llm-token/`) vive en la imagen `openedx`
(paquete `apps-custom/ficct-dashboard-api`), así que además hace falta:

```bash
tutor config save --set FICCT_DASHBOARD_API_REF=<commit-sha>
tutor images build openedx
```

Y, como `AvatarTour.jsx`/`llmService.js` cambian, también hace falta la imagen nueva
del MFE (ver `CLAUDE.md`, sección "Cambios en los MFEs").

⚠️ La imagen de este gateway se construye **en cada servidor**; no se publica en ningún
registry — mismo criterio que `services/avatar-tts`.

## Rollback

Si el LLM local en CPU no rinde, volver a OpenRouter es una línea, sin rebuild:

```bash
tutor config save --set AVATAR_LLM_PROVIDER=openrouter
tutor local restart lms mfe
```
