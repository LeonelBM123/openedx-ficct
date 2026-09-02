# Módulo Asistente Avatar 3D

## Descripción

Asistente virtual 3D flotante integrado en el MFE `frontend-app-learning`. Aparece en la esquina inferior derecha de las páginas de cursos. Usa síntesis de voz propia (Kokoro + MMS_FA, `services/avatar-tts`), animación lip sync, y un LLM (via OpenRouter) para responder preguntas de los estudiantes.

## Archivos del módulo

```
mfes/frontend-app-learning/src/asistente/
├── AvatarTour.jsx          ← Componente principal — orquesta todo
├── Avatar.jsx              ← Renderizado 3D (Three.js / react-three-fiber)
├── AvatarSwitcher.jsx      ← Lista de avatares disponibles y selector
├── StatsPanel.jsx          ← Panel de progreso del curso
├── TourUI.jsx              ← UI de chat, botones, input de preguntas
├── index.scss              ← Estilos (mínimos, mayoría es inline CSS)
└── config/
    ├── ToursConfig.js         ← Scripts del tour por MFE
    ├── ttsService.js          ← Cliente del servicio de voz propio (services/avatar-tts) + lip sync
    └── llmService.js          ← Cliente del gateway del LLM local (services/avatar-llm-gateway), modo AVATAR_LLM_PROVIDER=local
```

> `azureSpeechService.js`, `qaService.js` y `useTts.js` fueron eliminados: la voz pasó a
> generarse en el servicio propio (`services/avatar-tts`) y las preguntas van al
> endpoint del LMS.

## Assets 3D (en public/)

```
mfes/frontend-app-learning/public/
├── avatar.glb       ← Avatar por defecto (hombre)
├── avatar-1.glb     ← Avatar alternativo
├── avatar-2.glb
├── avatar-3.glb
├── avatar-4.glb     ← Avatar femenino (DaliaNeural)
├── avatar-6.glb     ← Avatar femenino alternativo
└── animacion.fbx    ← Animación idle (ciclo en loop)
```

Los archivos GLB deben tener el nodo `Streamozi_Head` con morph targets ARKit para el lip sync.

En producción, las rutas usan `process.env.PUBLIC_PATH` (= `/learning/`) porque Caddy sirve los MFEs con prefijo de ruta.

## Cómo se registra en el LMS

El avatar se inyecta en el slot de plugins del header del MFE learning desde `docker/mfe/env.config.jsx`:

```jsx
if (process.env.APP_ID == 'learning') {
  addPlugins(config, 'org.openedx.frontend.layout.header_learning.v1', [{
    op: PLUGIN_OPERATIONS.Insert,
    widget: { id: 'avatar_tour_widget', type: DIRECT_PLUGIN, ... }
  }]);
}
```

## Cómo se responden las preguntas

Depende de `getConfig().AVATAR_LLM_PROVIDER` (publicado en `MFE_CONFIG`, ver
`avatar_asistente.py`):

**Modo `openrouter` (default)** — el navegador **no habla con OpenRouter**. El MFE
hace `POST /api/ficct/avatar/ask/` (paquete `apps-custom/ficct-dashboard-api`, módulo
`avatar_views.py`) y el LMS hace la llamada al LLM:

```
TourUI → AvatarTour.handleAskQuestion()
   ↓ getAuthenticatedHttpClient().post({ pregunta, contexto })
POST {LMS_BASE_URL}/api/ficct/avatar/ask/     ← IsAuthenticated + throttle por usuario
   ↓ requests.post (key desde settings.FICCT_AVATAR)
https://openrouter.ai/api/v1/chat/completions
   ↓ { respuesta }
speakText() → ver "Cómo se genera la voz" abajo
```

Antes la key de OpenRouter se publicaba en `MFE_CONFIG`, que el LMS sirve **sin
autenticación** en `GET /api/mfe_config/v1`: era legible por cualquiera. Por eso ningún
secreto puede volver a ese patch. El *system prompt* también vive en el servidor, para
que el cliente no pueda reemplazarlo.

**Modo `local`** — igual que la voz (ver abajo), el LMS **no proxea la inferencia**:
solo emite un token corto y el navegador habla directo con un contenedor propio (ver
la sección "LLM local" más abajo).

## Cómo se genera la voz

El navegador **tampoco proxea el audio por el LMS** (a diferencia de las preguntas al
LLM): el LMS corre con solo 2 workers de uwsgi (`UWSGI_WORKERS=2`), y una síntesis tarda
5-10 s, así que pasar el audio por ahí dejaría la plataforma sin workers para el resto
de los alumnos en cada frase del avatar. En cambio, el LMS solo emite un token corto y
el navegador habla directo con el contenedor de voz:

```
ttsService.getToken()
   ↓ getAuthenticatedHttpClient().get()
GET {LMS_BASE_URL}/api/ficct/avatar/tts-token/     ← IsAuthenticated + throttle
   ↓ { token, expires_in }        (token cacheado en el módulo, se reusa ~5 min)
ttsService.textToSpeech(texto, voz)
   ↓ fetch con Authorization: Bearer <token>
POST {AVATAR_TTS_API_URL}/synthesize               ← services/avatar-tts (contenedor propio)
   ↓ Kokoro (síntesis) + MMS_FA (forced alignment) + cache en disco por (voz, texto)
{ audio_base64, visemes }
```

Detalle completo del servicio, la autenticación por token y la caché en
`services/avatar-tts/README.md`.

## Configuración requerida (Tutor)

```bash
# Habilitar el avatar
tutor config save --set AVATAR_ENABLED=true

# Voz: contenedor propio (services/avatar-tts), URL pública pero protegida por token
tutor config save --set AVATAR_TTS_SECRET=$(openssl rand -hex 32)
tutor config save --set AVATAR_TTS_API_URL=http://$(tutor config printvalue LMS_HOST)/avatar-tts/synthesize

# LLM para responder preguntas (OpenRouter). La key queda solo en los settings de
# Django, nunca en MFE_CONFIG.
tutor config save --set OPENROUTER_API_KEY=tu_clave_openrouter
tutor config save --set OPENROUTER_MODEL=openai/gpt-4o-mini

# Límite de peticiones por usuario al endpoint del LLM (opcional, default 20/min)
tutor config save --set AVATAR_OPENROUTER_THROTTLE_RATE=20/min

# Aplicar
tutor local restart lms
```

⚠️ Cambiar las keys **no requiere rebuild de la imagen del MFE**: solo `tutor config
save` y `tutor local restart lms`. Ninguna de las dos viaja al navegador.

### LLM local (Ollama) como alternativa a OpenRouter

`AVATAR_LLM_PROVIDER` (`openrouter` por defecto, o `local`) elige qué backend responde
las preguntas del avatar y se publica en `MFE_CONFIG` para que el propio MFE decida a
qué endpoint llamar (ver `AvatarTour.handleAskQuestion`).

A diferencia del primer diseño de este modo, el `local` **no proxea la inferencia por
el LMS**: sigue exactamente el mismo patrón que ya usa la voz del avatar (ver "Cómo se
genera la voz" arriba). El LMS solo emite un token corto
(`GET /api/ficct/avatar/llm-token/`, `AvatarLlmTokenView`) y el navegador habla directo
con un contenedor propio, `services/avatar-llm-gateway`, que valida el token, arma el
prompt con el `SYSTEM_PROMPT` fijo del servidor, y llama a Ollama:

```
llmService.getToken()
   ↓ getAuthenticatedHttpClient().get()
GET {LMS_BASE_URL}/api/ficct/avatar/llm-token/     ← IsAuthenticated + throttle
   ↓ { token, expires_in }        (token cacheado en el módulo, se reusa ~5 min)
llmService.askQuestion(pregunta, contexto)
   ↓ fetch con Authorization: Bearer <token>
POST {AVATAR_LLM_API_URL}                           ← services/avatar-llm-gateway (contenedor propio)
   ↓ arma SYSTEM_PROMPT + messages, requests.post interno
http://avatar-llm:11434/v1/chat/completions         ← Ollama (solo red interna de docker)
   ↓ { respuesta }
```

Por qué este diseño y no un proxy simple en el LMS: el LMS corre con solo **2 workers
de uwsgi** (`UWSGI_WORKERS=2`), y una inferencia en CPU sin GPU (el droplet actual no
tiene GPU) puede tardar 10-60+ segundos — muy por encima de los 1-3 s típicos de
OpenRouter. Proxear esa espera por Django dejaría la plataforma sin workers libres para
el resto de los alumnos durante cada pregunta al avatar. Con el token, esa espera ocurre
entera dentro de `avatar-llm-gateway` (un proceso aislado): si se satura con preguntas
concurrentes, las respuestas del avatar se vuelven lentas, pero el resto de la
plataforma sigue funcionando con normalidad. Detalle completo en
`services/avatar-llm-gateway/README.md`.

```bash
# 1. Construir el gateway en el servidor (imagen no publicada, igual que avatar-tts)
docker build -t ficct-avatar-llm-gateway /root/openedx-ficct/services/avatar-llm-gateway

# 2. Instalar y habilitar el plugin (agrega los contenedores avatar-llm + avatar-llm-gateway)
tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_llm_local.py
tutor plugins enable avatar_llm_local

# 3. Secreto compartido LMS <-> gateway, y URL pública del gateway
tutor config save --set AVATAR_LLM_SECRET=$(openssl rand -hex 32)
tutor config save --set AVATAR_LLM_API_URL=http://$(tutor config printvalue LMS_HOST)/avatar-llm/ask

# 4. Levantar los contenedores nuevos
tutor local start -d

# 5. Descargar el modelo (una sola vez; idempotente, persiste en el volumen).
#    `tutor local do init` no sirve aca: Tutor 21 solo corre esos jobs contra un
#    servicio "<nombre>-job" explicito, que este plugin no define.
docker exec tutor_local-avatar-llm-1 ollama pull qwen3:4b

# 6. Activar el modo local (requiere reiniciar tambien el mfe, ver mas abajo)
tutor config save --set AVATAR_LLM_PROVIDER=local
tutor local restart lms mfe
```

⚠️ **Este modo sí requiere una imagen nueva del MFE** (a diferencia de solo cambiar
las keys de OpenRouter): `AvatarTour.jsx` y `llmService.js` cambiaron. Ver `CLAUDE.md`,
sección "Cambios en los MFEs (avatar, código React)", para el flujo de build vía
GitHub Actions antes del paso 6.

**Volver a OpenRouter** en cualquier momento, sin rebuild:
```bash
tutor config save --set AVATAR_LLM_PROVIDER=openrouter
tutor local restart lms mfe
```

**Probar el modelo local directamente** (sin pasar por el navegador ni por Django):
```bash
docker exec -it $(docker ps -qf "name=avatar-llm-gateway") curl -sf localhost:80/health
docker exec -it $(docker ps -qf "name=avatar-llm") ollama run qwen3:4b "Hola, responde en una frase"
```

Variables de este modo:

| Variable | Dónde se define | Default | Uso |
|----------|------------------|---------|-----|
| `AVATAR_LLM_PROVIDER` | `avatar_asistente.py` | `openrouter` | `openrouter` o `local`; se publica en `MFE_CONFIG` |
| `AVATAR_LLM_API_URL` | `avatar_asistente.py` | `""` | URL pública del gateway (no secreta); se publica en `MFE_CONFIG` |
| `AVATAR_LLM_SECRET` | `avatar_asistente.py` | `""` | Secreto HMAC compartido entre el LMS y `avatar-llm-gateway`; nunca sale del servidor |
| `AVATAR_LOCAL_LLM_MODEL` | `avatar_llm_local.py` | `qwen3:4b` | Tag de Ollama; cambiarlo requiere `docker exec tutor_local-avatar-llm-1 ollama pull <tag-nuevo>` |
| `AVATAR_LOCAL_LLM_TIMEOUT` | `avatar_llm_local.py` | `60` (segundos) | Timeout del gateway esperando a Ollama — ya no afecta a uwsgi, así que puede ser generoso |
| `AVATAR_LLM_RATE_PER_MIN` | `avatar_llm_local.py` | `5` | Límite de preguntas por usuario por minuto en el gateway (más estricto que TTS: cada pregunta es cara en CPU) |

## Contexto que el LLM recibe por pregunta

El asistente enriquece cada pregunta con contexto real del curso antes de enviarla al LLM:

```
Curso: Introducción a Python
Sección: Módulo 2 - Funciones
Lección: Funciones recursivas (Homework)
Unidad actual: Ejercicio práctico 1
Progreso: 12/20 unidades completadas (60%)
Nota: 78% · No aprobado

Pregunta del estudiante: ¿Qué es la recursividad?
```

Los datos del curso vienen de Redux (sin llamadas extra). Los datos de progreso y nota solo se incluyen si el estudiante abrió el panel de estadísticas primero.

## Panel de estadísticas

Se abre con el ícono de barras en la UI del avatar. Consume:
```
GET /api/course_home/progress/{courseId}
```

Muestra: % de completitud, calificación general (% + letra + aprobado/no aprobado), detalle por tipo de actividad, y puntos por sección.

## Avatares disponibles

Voz Kokoro por avatar (`AvatarSwitcher.jsx`), mapeada a la voz real del servicio en
`VOICE_MAP` de `services/avatar-tts/app.py`:

| ID | Emoji | Voz (`ttsService`) | Voz Kokoro |
|----|-------|---------------------|------------|
| default | 🧑 | alex | em_alex |
| avatar1 | 🧑 | alex | em_alex |
| avatar2 | 🧑 | alex | em_alex |
| avatar3 | 🧑 | alex | em_alex |
| avatar4 | 👩 | dora | ef_dora |
| avatar6 | 👩 | dora | ef_dora |

La voz `santa` (`em_santa`) existe en el servicio pero no está asignada a ningún avatar
del switcher todavía.

## Verificar que el avatar está activo

```bash
# Verificar que AVATAR_ENABLED llegó al MFE
curl -s "http://167.172.142.82.nip.io/api/mfe_config/v1?mfe=learning" | python3 -m json.tool | grep AVATAR

# Verificar que el código del avatar está en el bundle
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ 2>/dev/null | head -3"
```

## Flujo de reproducción del audio (lip sync)

```
AvatarTour
  ├── ttsService.textToSpeech(texto, voz)   ← ver "Cómo se genera la voz"
  │     └── visemas A-H (ARKit) con start/duration ya calculados por MMS_FA
  ├── new Blob([audioData]) → URL.createObjectURL → Audio()
  ├── audio.play()
  └── Avatar.useFrame:
        currentTime → buscar cue activo → arkitMapping[letra]
        → lerp en morphTargetInfluences de Streamozi_Head
```
