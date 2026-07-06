# Módulo Asistente Avatar 3D

## Descripción

Asistente virtual 3D flotante integrado en el MFE `frontend-app-learning`. Aparece en la esquina inferior derecha de las páginas de cursos. Usa síntesis de voz (Azure Speech Services), animación lip sync, y un LLM (via OpenRouter) para responder preguntas de los estudiantes.

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
    ├── azureSpeechService.js  ← Síntesis de voz con Azure + lip sync
    ├── ToursConfig.js         ← Scripts del tour por MFE
    └── qaService.js           ← Cliente del backend de preguntas
```

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

## Configuración requerida (Tutor)

```bash
# Habilitar el avatar
tutor config save --set AVATAR_ENABLED=true

# Azure Speech Services (síntesis de voz)
tutor config save --set AZURE_SPEECH_KEY=tu_clave_azure
tutor config save --set AZURE_SPEECH_REGION=eastus

# LLM para responder preguntas (OpenRouter)
tutor config save --set OPENROUTER_API_KEY=tu_clave_openrouter
tutor config save --set OPENROUTER_MODEL=openai/gpt-4o-mini

# Aplicar
tutor local restart lms
```

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

| ID | Emoji | Voz Azure |
|----|-------|-----------|
| default | 🧑 | es-MX-JorgeNeural |
| avatar1 | 🧑 | es-MX-JorgeNeural |
| avatar2 | 🧑 | es-MX-JorgeNeural |
| avatar3 | 🧑 | es-MX-JorgeNeural |
| avatar4 | 👩 | es-MX-DaliaNeural |
| avatar6 | 👩 | es-MX-DaliaNeural |

## Verificar que el avatar está activo

```bash
# Verificar que AVATAR_ENABLED llegó al MFE
curl -s "http://167.172.142.82.nip.io/api/mfe_config/v1?mfe=learning" | python3 -m json.tool | grep AVATAR

# Verificar que el código del avatar está en el bundle
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ 2>/dev/null | head -3"
```

## Flujo de síntesis de voz (Azure)

```
AvatarTour
  ├── azureSpeech.textToSpeech(texto, voz)
  │     ├── Azure Speech SDK → audio ArrayBuffer
  │     └── visemas 0-21 → convertidos a letras A-H (ARKit)
  ├── new Blob([audioData]) → URL.createObjectURL → Audio()
  ├── audio.play()
  └── Avatar.useFrame:
        currentTime → buscar cue activo → arkitMapping[letra]
        → lerp en morphTargetInfluences de Streamozi_Head
```
