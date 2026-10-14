# Diagnostico de IA docente

## 1. Objetivo de la IA docente

La IA docente ayuda al autor en Studio a generar o modificar contenido educativo dentro de una unidad IA Assistant. Su objetivo no es guardar directamente ni reemplazar al editor manual, sino producir propuestas estructuradas que el docente puede aplicar, revisar y guardar.

El flujo esperado es:

```text
Prompt docente
-> deteccion de intencion en frontend
-> handler XBlock segun modo
-> servicio backend
-> OpenRouter
-> JSON IA
-> validacion y normalizacion backend
-> propuesta pendiente en Studio
-> docente aplica o descarta
-> docente guarda manualmente
```

## 2. Que problema resuelve el chatbar

El `chatbar_ia` resuelve la entrada natural del docente. En vez de obligar al docente a elegir siempre entre acciones tecnicas, permite escribir indicaciones como:

- "Genera una unidad sobre recursividad con teoria, quiz y dos preguntas abiertas."
- "Crea un componente de codigo sobre Fibonacci recursivo."
- "Enriquece este componente de teoria con mas explicacion."

El chatbar traduce esa indicacion en una accion concreta de Studio:

| Intencion | Accion Studio | Resultado esperado |
| --- | --- | --- |
| Generar unidad | Reemplazar unidad actual por una propuesta completa | `State.replaceUnit(unit)` |
| Crear componente | Agregar un componente nuevo a la unidad | `State.addGeneratedComponent(component)` |
| Editar componente | Reemplazar el componente activo | `State.replaceComponent(component)` |
| Idle/ambiguo | No llama IA o bloquea aplicacion | Mensaje de aclaracion/advertencia |

## 3. Integracion visual en Studio

El chatbar esta definido en `studio.html` como un formulario fijo al final de Studio y estilizado por `chatbar_ia.css`.

Caracteristicas visuales:

| Elemento | Funcion |
| --- | --- |
| `textarea` | Entrada del prompt docente. |
| Indicador de intencion | Muestra "Generar unidad", "Crear componente", "Editar" o estado idle/warning. |
| Boton submit | Lanza generacion de propuesta. |
| Estado | Muestra loading, exito, advertencia o error. |
| Botones Aplicar/Descartar | Aparecen solo cuando hay propuesta pendiente. |

El CSS posiciona el chatbar como `position: fixed`, centrado abajo, con ancho responsive. Cuando el chatbar esta activo, Studio recibe la clase `ia-assistant-studio--with-floating-chatbar` para reservar espacio inferior. El widget se oculta automaticamente si esta abierto el panel JSON o la vista previa alumno.

## 4. Como se detecta la intencion del prompt

La deteccion ocurre completamente en frontend, en `chat_ia_detector_prompt.js`, mediante heuristicas de texto. No usa IA para clasificar la intencion.

Proceso general:

```text
prompt
-> normalizeText()
-> detectComponentType()
-> calcular unitScore/createScore/editScore
-> resolver modo con mayor puntaje
-> calcular confianza
-> aplicar reglas de seguridad contextual
-> devolver { mode, componentType, confidence, scores, reason }
```

El detector normaliza minusculas y tildes, busca frases fuertes, verbos, sustantivos, deicticos como "este/esta/actual", y tipos de componente.

## 5. Modos detectados

| Modo | Valor interno | Cuando ocurre | Endpoint usado |
| --- | --- | --- | --- |
| Generar unidad | `unit` | El prompt pide unidad, tema, clase, modulo o curso completo. | `generate_teacher_unit` |
| Crear componente | `create` | El prompt pide agregar/crear un componente especifico. | `generate_teacher_component_create` |
| Editar componente | `edit` | El prompt pide mejorar, corregir, reescribir o enriquecer el componente activo. | `generate_teacher_component_edit` |
| Ambiguo/idle | `idle` | Prompt vacio, sin accion clara, sin tipo de componente o sin componente activo suficiente. | Ninguno, o queda bloqueado por validacion frontend. |

## 6. Como funciona `chat_ia_detector_prompt.js`

El detector expone:

```javascript
window.IAAssistant.Studio.ChatbarIntentDetector.detect(prompt, options)
```

Devuelve un objeto aproximado:

```json
{
  "mode": "create",
  "componentType": "codigo",
  "confidence": "high",
  "scores": {
    "unit": 0,
    "create": 8.5,
    "edit": 0
  },
  "reason": "Se detecto intencion de agregar o crear un componente."
}
```

### Deteccion de tipo de componente

`detectComponentType()` busca coincidencias fuertes y debiles:

| Tipo | Senales fuertes | Senales debiles |
| --- | --- | --- |
| `pregunta_abierta` | pregunta abierta, respuesta abierta, desarrollo, reflexion, rubrica | pregunta, preguntas |
| `quiz_multiple` | quiz, opcion multiple, seleccion multiple, test | cuestionario |
| `codigo` | codigo, python, java, javascript, c++, c#, php, html | programacion, algoritmo, ejercicio, practica |
| `teoria` | teoria, teorico, teorica, contenido teorico | explicacion, concepto, lectura, contenido |

### Puntajes

El detector acumula:

- `unitScore`: frases como "genera una unidad", "crea un tema", "prepara una clase", menciones de unidad completa y combinaciones de varios componentes.
- `createScore`: verbos como crear/agregar/anadir, sustantivos como componente/actividad/ejercicio y tipo detectado.
- `editScore`: verbos como mejora/corrige/reescribe/ajusta/enriquece, deicticos como este/actual/seleccionado y targets como feedback/rubrica/redaccion.

Despues aplica reglas para evitar falsos positivos debiles. Por ejemplo, "un quiz de recursividad" queda `idle` porque menciona un tipo, pero no tiene accion suficientemente clara.

## 7. Como se valido con dataset

Existe un dataset local en:

```text
ia_assistant/static/studio/widgets/chatbar_ia/chatbar_intent_dataset.json
```

Y un runner Node en:

```text
ia_assistant/static/studio/widgets/chatbar_ia/chatbar_intent_dataset_runner.js
```

Ejecute el runner:

```text
node ia_assistant/static/studio/widgets/chatbar_ia/chatbar_intent_dataset_runner.js
```

Resultado observado:

```text
Total: 200
Passed: 200
Failed: 0
```

Todas las categorias reportadas pasaron al 100%.

## 8. Que significa el dataset de 200 casos

El dataset contiene 200 prompts etiquetados para probar el detector. Su metadata declara:

| Grupo | Cantidad |
| --- | --- |
| `unit` | 50 |
| `create` | 50 |
| `edit` | 50 |
| `idle` | 50 |

Distribucion por tipo esperado:

| Tipo esperado | Cantidad |
| --- | --- |
| Sin tipo (`""`) | 150 |
| `teoria` | 13 |
| `quiz_multiple` | 13 |
| `pregunta_abierta` | 12 |
| `codigo` | 12 |

El dataset cubre prompts claros, prompts con componentes mezclados dentro de una unidad, creacion por tipo, ediciones con componente activo y casos ambiguos que no deben disparar una accion fuerte.

## 9. Que hace el runner del dataset

`chatbar_intent_dataset_runner.js`:

1. Lee el detector `chat_ia_detector_prompt.js`.
2. Lee `chatbar_intent_dataset.json`.
3. Ejecuta el detector dentro de un `vm` de Node con un `window.IAAssistant` simulado.
4. Para casos que requieren componente activo, inyecta un componente demo.
5. Compara `result.mode` y `result.componentType` contra lo esperado.
6. Agrupa resultados por categoria.
7. Si hay fallos, muestra hasta 10 casos y termina con `process.exit(1)`.

El runner no valida `confidence`, aunque el dataset la declara. La comparacion efectiva es modo + tipo.

## 10. Conexion entre `chatbar_ia.js` y el detector

`chatbar_ia.js` llama:

```text
Detector.detect(prompt, { activeComponent: State.getActiveComponent() })
```

Esto ocurre al escribir, al hacer click en Studio y antes de generar. El resultado se usa para:

- mostrar etiqueta visual de intencion;
- asignar clase CSS del modo (`unit`, `create`, `edit`, `warning`, `idle`);
- validar si se puede llamar a IA;
- elegir el endpoint correcto.

Si el detector no esta disponible, el fallback actual devuelve `mode: "unit"` con baja confianza. Esto evita romper el flujo, pero puede generar una unidad por defecto ante ausencia del detector.

## 11. Conexion con `Api.generateTeacherUnit`

Cuando el modo es `unit`, `chatbar_ia.js` llama:

```javascript
Api.generateTeacherUnit(prompt, State.getUnit())
```

`api.js` hace POST a la URL configurada para `generate_teacher_unit`:

```json
{
  "prompt_docente": "Genera una unidad sobre recursividad...",
  "contexto": {
    "version": 1,
    "titulo": "Unidad sin titulo",
    "componentes": []
  }
}
```

En backend:

```text
xblock.py generate_teacher_unit
-> unit_service.generate_unit_from_teacher_prompt()
-> build_teacher_unit_system_prompt()
-> build_teacher_unit_user_prompt()
-> OpenRouterClient.generate_text()
-> parse_ai_json_response()
-> validate_and_normalize_generated_unit()
```

Respuesta esperada al frontend:

```json
{
  "ok": true,
  "unit": {
    "version": 1,
    "titulo": "string",
    "componentes": []
  },
  "warnings": []
}
```

## 12. Conexion con `Api.generateTeacherComponentCreate`

Cuando el modo es `create`, el detector debe devolver tambien `componentType`.

`chatbar_ia.js` llama:

```javascript
Api.generateTeacherComponentCreate(
  prompt,
  intent.componentType,
  State.getUnit()
)
```

Payload:

```json
{
  "prompt_docente": "Crea un componente de codigo sobre Fibonacci recursivo.",
  "target_component_type": "codigo",
  "unit_context": {
    "version": 1,
    "titulo": "Unidad actual",
    "componentes": []
  }
}
```

Backend:

```text
xblock.py generate_teacher_component_create
-> component_service.generate_component_create_from_teacher_prompt()
-> validar target_component_type
-> build_teacher_component_create_system_prompt()
-> build_teacher_component_create_user_prompt()
-> OpenRouterClient.generate_text()
-> parse_ai_json_response()
-> validate_and_normalize_generated_component(expected_type=...)
```

Respuesta esperada:

```json
{
  "ok": true,
  "component": {
    "id": "codigo_1",
    "tipo": "codigo",
    "nombre": "string",
    "data": {
      "enunciado": "string",
      "lenguaje": "python",
      "codigo_base": "string",
      "instrucciones": "string"
    }
  },
  "warnings": []
}
```

## 13. Conexion con `Api.generateTeacherComponentEdit`

Cuando el modo es `edit`, el chatbar necesita un componente activo. Si no existe, `validateBeforeGenerate()` bloquea la solicitud y muestra una advertencia.

Si existe componente activo:

```javascript
Api.generateTeacherComponentEdit(
  prompt,
  State.getActiveComponent(),
  State.getUnit()
)
```

Payload:

```json
{
  "prompt_docente": "Enriquece este componente de teoria con mas explicacion.",
  "active_component": {
    "id": "teoria_1",
    "tipo": "teoria",
    "nombre": "Concepto base",
    "data": {}
  },
  "unit_context": {
    "version": 1,
    "titulo": "Unidad actual",
    "componentes": []
  }
}
```

Backend:

```text
xblock.py generate_teacher_component_edit
-> component_service.generate_component_edit_from_teacher_prompt()
-> validar id y tipo del componente activo
-> build_teacher_component_edit_system_prompt()
-> build_teacher_component_edit_user_prompt()
-> OpenRouterClient.generate_text()
-> parse_ai_json_response()
-> validate_and_normalize_generated_component(expected_type=..., expected_id=...)
```

La validacion exige conservar el mismo `id` y el mismo `tipo`.

## 14. Uso del componente activo para editar

`chatbar_ia.js` consulta:

```text
State.getActiveComponent()
```

Ese componente se usa en tres puntos:

1. El detector recibe `activeComponent` para decidir si una edicion es posible.
2. La UI muestra una etiqueta como "Editar - componente activo - tipo".
3. El backend recibe `active_component` y lo usa como contrato de identidad.

En `component_service.py`, `_get_component_identity()` valida:

- `active_component` debe ser dict;
- debe tener `id`;
- debe tener `tipo`;
- el tipo debe estar dentro de los tipos IA authorable: `teoria`, `quiz_multiple`, `pregunta_abierta`, `codigo`.

## 15. Propuesta pendiente

La propuesta pendiente vive solo dentro de la clausura de `ChatbarIA.init()`:

```text
var pendingProposal = null;
```

No esta en `unidad_json`, no esta en `State`, no se persiste y se pierde al recargar la pagina.

Cuando la IA responde correctamente, `createProposalFromPayload()` transforma la respuesta en:

```json
{
  "kind": "create",
  "component": {}
}
```

o:

```json
{
  "kind": "unit",
  "unit": {}
}
```

Luego `setPendingProposal()` muestra los botones "Aplicar" y "Descartar".

## 16. Como se aplica una propuesta

Al pulsar "Aplicar":

| `pendingProposal.kind` | Accion |
| --- | --- |
| `create` | `State.addGeneratedComponent(pendingProposal.component)` |
| `edit` | `State.replaceComponent(pendingProposal.component)` |
| `unit` | `State.replaceUnit(pendingProposal.unit)` |

Si la accion devuelve falso/null, se muestra error. Si funciona:

```text
Renderer.render()
-> se limpia pendingProposal
-> se muestra "Propuesta aplicada. Revisa y presiona Guardar."
```

Esto confirma que aplicar una propuesta solo cambia el estado local de Studio.

## 17. El chatbar NO guarda automaticamente

Confirmado: `chatbar_ia.js` no llama `Api.saveUnit()` ni al handler `save_unit`.

El chatbar:

- genera propuesta;
- permite aplicar o descartar;
- renderiza el editor;
- muestra mensaje de que el docente debe guardar.

No persiste `unidad_json`.

## 18. El docente sigue guardando manualmente

Confirmado: despues de aplicar una propuesta, el mensaje dice:

```text
Propuesta aplicada. Revisa y presiona Guardar.
```

El guardado real sigue en `events.js`:

```text
boton Guardar
-> Events.saveCurrentUnit()
-> Api.saveUnit()
-> xblock.py save_unit
-> self.unidad_json = json.dumps(unit, ensure_ascii=False)
```

Tambien existe autosave de Studio, pero no es disparado directamente por el chatbar.

## 19. No toca respuestas del alumno

Confirmado: la IA docente opera sobre:

- `State.getUnit()`
- componente activo
- endpoints `generate_teacher_*`
- servicios `unit_service.py` y `component_service.py`

No llama:

- `save_student_answers`
- `request_student_review`
- `student_answers`
- `student_review_result`

Los datos de alumno viven en `Scope.user_state`; la IA docente trabaja con contenido docente y estado local Studio.

## 20. Como se llama OpenRouter desde backend

`OpenRouterClient` centraliza la llamada:

```text
OpenRouterClient.generate_text(system_prompt, user_prompt)
```

Configuracion:

| Valor | Fuente |
| --- | --- |
| API key | `OPENROUTER_API_KEY` |
| Modelo | `OPENROUTER_MODEL`, default `openrouter/auto` |
| Base URL | `OPENROUTER_BASE_URL`, default `https://openrouter.ai/api/v1` |
| Timeout | `OPENROUTER_TIMEOUT`, default `30` |
| Fallbacks | `OPENROUTER_FALLBACK_MODELS` |

El cliente usa `urllib.request` y envia un POST a:

```text
{base_url}/chat/completions
```

Payload:

```json
{
  "model": "openrouter/auto",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

Si hay fallbacks, usa `models` con el modelo principal y hasta dos fallback adicionales.

Errores controlados:

| Caso | Codigo |
| --- | --- |
| Falta API key | `missing_openrouter_api_key` |
| 401 | `openrouter_unauthorized` |
| 402 | `openrouter_payment_required` |
| 429 | `openrouter_rate_limited` |
| 5xx | `openrouter_server_error` |
| Timeout | `openrouter_timeout` |
| Conexion | `openrouter_connection_error` |
| Respuesta invalida | `openrouter_invalid_json` / `openrouter_empty_content` |

## 21. Prompts backend de generacion y edicion

Los prompts se arman desde `prompt_builder.py` y `services/prompts/`.

### Unidad completa

`general_unit_prompt.py` construye:

- rol: asistente para docentes que genera unidades educativas interactivas;
- reglas de solo JSON;
- reglas de calidad textual;
- contrato de unidad;
- tipos permitidos;
- schemas de componentes;
- reglas especificas para teoria, quiz, pregunta abierta y codigo.

El user prompt incluye:

- indicacion del docente;
- titulo actual;
- cantidad de componentes actuales;
- tipos existentes;
- instruccion de generar una unidad completa.

### Crear componente

`create_component_prompt.py` construye:

- "crea un unico componente educativo";
- no devolver unidad completa;
- no devolver lista;
- no modificar componentes existentes;
- usar teoria existente como referencia;
- no reutilizar ids existentes;
- tipo exacto solicitado;
- schema del componente.

El user prompt incluye:

- indicacion docente;
- tipo solicitado;
- resumen de unidad;
- teoria existente como contexto.

### Editar componente

`edit_component_prompt.py` construye:

- "edita un unico componente educativo";
- devolver solo el componente activo modificado;
- conservar campos no solicitados;
- mantener exactamente el mismo `id`;
- mantener exactamente el mismo `tipo`;
- no cambiar proposito salvo pedido explicito;
- usar teoria existente para coherencia;
- reglas especificas para ediciones localizadas, especialmente feedbacks en quiz.

El user prompt incluye:

- indicacion docente;
- JSON del componente activo;
- teoria de contexto;
- instruccion de devolver nueva version del mismo componente.

## 22. Validaciones y normalizacion de salida IA

`unit_service.py` y `component_service.py` parsean la respuesta IA con `parse_ai_json_response()`. Este parser:

- acepta JSON directo;
- remueve fences ```json si la IA los devuelve;
- exige objeto JSON;
- falla si esta vacio, no es texto, no es JSON o no es objeto.

Luego `validators.py` normaliza y valida.

### Unidad IA

`validate_and_normalize_generated_unit()` exige:

- objeto dict;
- `version == UNIT_SCHEMA_VERSION`;
- componentes normalizables;
- maximo `MAX_GENERATED_COMPONENTS = 12`;
- al menos un componente valido;
- titulo no vacio o fallback `Unidad generada con IA`.

### Componente IA

`validate_and_normalize_generated_component()` exige:

- objeto dict;
- tipo dentro de `AI_AUTHORABLE_COMPONENT_TYPES`;
- si hay `expected_type`, debe coincidir;
- si hay `expected_id`, debe conservarse;
- normaliza datos por tipo.

### Seguridad de contenido

`strip_disallowed_markdown()` remueve:

- imagenes Markdown;
- etiquetas `<img>`;
- HTML peligroso: `<script>`, `<iframe>`, `<object>`, `<embed>`.

La normalizacion fuerza contratos por tipo:

| Tipo | Normalizacion |
| --- | --- |
| `teoria` | `formato = "markdown"`, limpia titulo/contenido. |
| `quiz_multiple` | opciones `opcion_n`, respuestas correctas solo existentes, elimina duplicadas. |
| `pregunta_abierta` | limpia `enunciado` y `rubrica`. |
| `codigo` | limpia `enunciado`, `lenguaje`, `codigo_base`, `instrucciones`. |

## 23. Riesgos detectados

| Riesgo | Impacto |
| --- | --- |
| Detector heuristico | Puede fallar ante frases nuevas no cubiertas por dataset. |
| Fallback del detector a `unit` si no carga | Si el archivo falla, podria intentar generar unidad por defecto. |
| Dataset no valida `confidence` | El runner solo compara modo y tipo; no asegura confianza esperada. |
| Texto ambiguo no tiene UI de aclaracion rica | Se muestra warning, pero no hay flujo guiado para elegir modo/tipo. |
| Propuesta pendiente solo en memoria | Si el docente recarga antes de aplicar, se pierde. Esto es aceptable, pero debe saberse. |
| Aplicar unidad reemplaza todo el estado local | Puede borrar cambios no guardados si el docente acepta sin revisar. |
| Autosave de Studio puede guardar despues de aplicar | Aunque el chatbar no guarda, el autosave general podria persistir una propuesta aplicada si pasa el intervalo. |
| Dependencia de API key | Sin `OPENROUTER_API_KEY`, los handlers devuelven error controlado. |
| OpenRouter usa red sin reintentos propios | Hay fallback de modelos, pero no retry HTTP/backoff interno. |
| Prompt injection en contexto | Los prompts advierten que teoria/contexto son referencia, pero siempre hay riesgo con contenido previo malicioso. |
| Validacion backend no garantiza calidad pedagogica completa | Normaliza estructura y seguridad, pero no asegura profundidad, exactitud conceptual ni alineacion perfecta. |
| Encoding visible | Hay textos con caracteres corruptos en varios recursos; conviene normalizar UTF-8. |

## 24. Recomendaciones antes de produccion

1. Cambiar el fallback del detector: si `ChatbarIntentDetector` no existe, devolver `idle` en vez de `unit`.
2. Hacer que el runner valide tambien `expectedConfidence`.
3. Agregar pruebas automatizadas del runner al pipeline.
4. Agregar UI de aclaracion cuando `confidence === "ambiguous"` o `mode === "idle"`.
5. Mostrar resumen/diff antes de aplicar propuestas que reemplazan toda la unidad.
6. Pausar o advertir autosave despues de aplicar una propuesta IA hasta confirmacion manual.
7. Registrar warnings de normalizacion en la UI, no solo devolverlos en payload.
8. Agregar tests backend para unidad, creacion y edicion de componente con clientes IA fake.
9. Revisar encoding UTF-8 de archivos y textos visibles.
10. Agregar limites de longitud para prompt docente en frontend y backend.
11. Considerar auditoria de prompts para reducir prompt injection desde contenido de unidad.
12. Documentar claramente configuracion `OPENROUTER_API_KEY`, modelo y fallbacks en despliegue.

## Ejemplo 1: generar unidad sobre recursividad

Prompt docente:

```text
Genera una unidad sobre recursividad con teoria, quiz y dos preguntas abiertas.
```

### Intencion detectada

| Campo | Valor esperado |
| --- | --- |
| `mode` | `unit` |
| `componentType` | `""` |
| `confidence` | `high` |

El detector prioriza unidad porque encuentra una frase fuerte tipo "genera una unidad" y menciona varios componentes internos como partes de una unidad completa.

### Endpoint y servicio

| Paso | Valor |
| --- | --- |
| Frontend | `Api.generateTeacherUnit(prompt, State.getUnit())` |
| Handler | `generate_teacher_unit` |
| Servicio | `generate_unit_from_teacher_prompt()` |
| Prompt backend | `build_teacher_unit_system_prompt()` + `build_teacher_unit_user_prompt()` |
| Validacion | `validate_and_normalize_generated_unit()` |

### Resultado esperado

```json
{
  "ok": true,
  "unit": {
    "version": 1,
    "titulo": "Recursividad",
    "componentes": [
      {
        "id": "teoria_1",
        "tipo": "teoria",
        "nombre": "Introduccion a la recursividad",
        "data": {
          "titulo": "Introduccion a la recursividad",
          "formato": "markdown",
          "contenido": "..."
        }
      },
      {
        "id": "quiz_multiple_1",
        "tipo": "quiz_multiple",
        "nombre": "Quiz de recursividad",
        "data": {
          "pregunta": "...",
          "opciones": [],
          "respuestas_correctas": []
        }
      },
      {
        "id": "pregunta_abierta_1",
        "tipo": "pregunta_abierta",
        "nombre": "Analisis de caso base",
        "data": {
          "enunciado": "...",
          "rubrica": "..."
        }
      },
      {
        "id": "pregunta_abierta_2",
        "tipo": "pregunta_abierta",
        "nombre": "Reflexion sobre llamadas recursivas",
        "data": {
          "enunciado": "...",
          "rubrica": "..."
        }
      }
    ]
  },
  "warnings": []
}
```

### Como se aplica a Studio

```text
payload.unit
-> createProposalFromPayload()
-> pendingProposal = { kind: "unit", unit: ... }
-> docente pulsa Aplicar
-> State.replaceUnit(unit)
-> Renderer.render()
-> docente revisa
-> docente pulsa Guardar
```

## Ejemplo 2: crear componente de codigo sobre Fibonacci

Prompt docente:

```text
Crea un componente de codigo sobre Fibonacci recursivo.
```

### Intencion detectada

| Campo | Valor esperado |
| --- | --- |
| `mode` | `create` |
| `componentType` | `codigo` |
| `confidence` | `high` |

Detecta creacion por "crea un componente" y tipo `codigo` por la palabra "codigo".

### Endpoint y servicio

| Paso | Valor |
| --- | --- |
| Frontend | `Api.generateTeacherComponentCreate(prompt, "codigo", State.getUnit())` |
| Handler | `generate_teacher_component_create` |
| Servicio | `generate_component_create_from_teacher_prompt()` |
| Prompt backend | `build_create_component_system_prompt("codigo")` + user prompt |
| Validacion | `validate_and_normalize_generated_component(expected_type="codigo")` |

### Resultado esperado

```json
{
  "ok": true,
  "component": {
    "id": "codigo_1",
    "tipo": "codigo",
    "nombre": "Fibonacci recursivo",
    "data": {
      "enunciado": "Completa una funcion recursiva para calcular el termino n de Fibonacci.",
      "lenguaje": "python",
      "codigo_base": "def fibonacci(n):\n    # TODO: completa el caso base y la llamada recursiva\n    pass",
      "instrucciones": "Usa casos base para n == 0 y n == 1, y una llamada recursiva para los demas casos."
    }
  },
  "warnings": []
}
```

### Como se agrega a la unidad

```text
payload.component
-> pendingProposal = { kind: "create", component: ... }
-> docente pulsa Aplicar
-> State.addGeneratedComponent(component)
-> activeComponentId = component.id
-> Renderer.render()
-> docente revisa y guarda manualmente
```

## Ejemplo 3: enriquecer componente de teoria activo

Prompt docente:

```text
Enriquece este componente de teoria con mas explicacion.
```

### Necesidad de componente activo

Este prompt depende de "este componente". Debe existir un componente activo en `State.getActiveComponent()`. Si no hay componente activo, el detector/validador frontend deja el flujo en warning y no deberia llamar al backend.

### Intencion detectada

| Campo | Valor esperado |
| --- | --- |
| `mode` | `edit` |
| `componentType` | `""` |
| `confidence` | `high` si hay componente activo |

En edit, `componentType` se limpia porque el tipo real lo define el componente activo, no el texto del prompt.

### Endpoint y servicio

| Paso | Valor |
| --- | --- |
| Frontend | `Api.generateTeacherComponentEdit(prompt, State.getActiveComponent(), State.getUnit())` |
| Handler | `generate_teacher_component_edit` |
| Servicio | `generate_component_edit_from_teacher_prompt()` |
| Prompt backend | `build_edit_component_system_prompt("teoria")` + user prompt |
| Validacion | `validate_and_normalize_generated_component(expected_type="teoria", expected_id="teoria_1")` |

### Como se reemplaza el componente

La IA debe devolver el mismo `id` y `tipo`:

```json
{
  "ok": true,
  "component": {
    "id": "teoria_1",
    "tipo": "teoria",
    "nombre": "Concepto base",
    "data": {
      "titulo": "Recursividad",
      "formato": "markdown",
      "contenido": "Contenido enriquecido..."
    }
  },
  "warnings": []
}
```

Aplicacion:

```text
payload.component
-> pendingProposal = { kind: "edit", component: ... }
-> docente pulsa Aplicar
-> State.replaceComponent(component)
-> se reemplaza solo el componente con id teoria_1
-> Renderer.render()
-> docente revisa y guarda manualmente
```

## Conclusion del diagnostico

La IA docente esta lista para un MVP controlado. El flujo principal esta bien separado: el chatbar detecta intencion, llama endpoints especificos, backend usa servicios dedicados, OpenRouter queda encapsulado, la salida se parsea y normaliza, y la propuesta no se guarda automaticamente. El docente conserva el control: aplica o descarta, revisa y guarda manualmente.

Antes de produccion conviene endurecer la UX de ambiguedad, validar `confidence` en el dataset, mostrar warnings de normalizacion, revisar encoding, agregar tests backend con clientes fake y proteger mejor el flujo contra reemplazos amplios no revisados.
