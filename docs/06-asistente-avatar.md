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
    └── ttsService.js          ← Cliente del servicio de voz propio (services/avatar-tts) + lip sync
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

El navegador **no habla con OpenRouter**. El MFE hace `POST /api/ficct/avatar/ask/`
(paquete `apps-custom/ficct-dashboard-api`, módulo `avatar_views.py`) y el LMS hace la
llamada al LLM.

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
