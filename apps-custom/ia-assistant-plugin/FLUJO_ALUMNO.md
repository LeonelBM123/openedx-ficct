# Diagnostico del flujo alumno

## 1. Objetivo del flujo alumno

El flujo alumno del XBlock IA Assistant renderiza la unidad persistida por el docente, muestra sus componentes en modo Student, permite responder actividades interactivas, guarda esas respuestas en `Scope.user_state` y restaura el progreso cuando el alumno recarga la vista.

El contrato central es:

```text
unidad_json docente
-> student_view
-> initial_unit
-> Student.State
-> Student.Renderer
-> players por componente
-> Student.Answers
-> AutoSave
-> save_student_answers
-> student_answers en Scope.user_state
```

## 2. Como se carga `student_view`

`student_view()` en `ia_assistant/xblock.py` carga la vista LMS/alumno.

Flujo:

```text
student_view()
-> si sdk_view_mode == "studio", delega temporalmente a studio_view()
-> _get_initial_unit()
-> Fragment(STUDENT_HTML_PATH)
-> agrega STUDENT_CSS_PATHS
-> agrega STUDENT_JS_PATHS
-> initialize_js("IAAssistantStudent", initArgs)
```

`_get_initial_unit()` lee `self.unidad_json`, lo parsea y valida con `_is_valid_unit()`. Si no existe, esta vacio, no parsea o no cumple estructura minima, devuelve `get_default_unit()` y opcionalmente `load_warning`.

## 3. Datos iniciales que recibe Student

`student_view()` inicializa JavaScript con:

```json
{
  "initial_unit": {
    "version": 1,
    "titulo": "Unidad sin titulo",
    "componentes": []
  },
  "initial_student_answers": {},
  "load_warning": ""
}
```

| Dato | Origen | Uso |
| --- | --- | --- |
| `initial_unit` | `unidad_json` parseado y validado | Se carga en `Student.State`. |
| `initial_student_answers` | `self.student_answers` si es dict | Se carga en `Student.Answers`. |
| `load_warning` | `_get_initial_unit()` | Se muestra como aviso si la unidad guardada no pudo cargarse. |

`student_answers` es un campo `Dict` con `Scope.user_state`, por lo que pertenece al alumno y no al contenido global del XBlock.

## 4. Como Student renderiza `unidad_json`

`student.js` es el punto de entrada:

```text
IAAssistantStudent(runtime, element, initArgs)
-> Student.Dom.getRoot(element)
-> Student.State.loadUnit(initial_unit)
-> Student.Answers.loadAnswers(initial_student_answers)
-> Student.AutoSave.init(runtime, element, root)
-> Student.Events.init(root, initArgs)
-> Student.Renderer.render(root)
```

`student/state.js` normaliza la unidad:

- exige objeto;
- exige `version === 1`;
- exige `titulo` string;
- exige `componentes` array;
- filtra componentes que no tengan `id`, `tipo`, `nombre` y `data` validos.

`student/renderer.js`:

1. Escribe el titulo en `[data-ia-assistant-student-title]`.
2. Limpia el contenedor de componentes.
3. Si no hay componentes, muestra estado vacio.
4. Renderiza una tarjeta por componente.
5. Si hay componentes auditables (`quiz_multiple`, `pregunta_abierta`, `codigo`) y no existe `revision`, agrega un componente sintetico `__revision_auto__`.

## 5. Render de cada tipo de componente

| Componente | Player | Comportamiento | Persistencia |
| --- | --- | --- | --- |
| `teoria` | `TeoriaPlayer` | Muestra titulo y contenido Markdown. | No guarda respuesta. |
| `quiz_multiple` | `QuizMultiplePlayer` | Muestra opciones, permite seleccionar y comprobar. | Guarda seleccion y metadata. |
| `pregunta_abierta` | `PreguntaAbiertaPlayer` | Muestra enunciado y textarea. | Guarda texto escrito. |
| `codigo` | `CodigoPlayer` | Muestra consigna, lenguaje, instrucciones y textarea de codigo. | Guarda codigo escrito. |
| `revision` | `RevisionPlayer` | Resume respuestas y permite solicitar revision. | Lee respuestas; guarda resultado de revision en backend. |

## 6. Componentes interactivos

Son interactivos:

- `quiz_multiple`
- `pregunta_abierta`
- `codigo`
- `revision`

`revision` es interactivo porque tiene botones de actualizar resumen y solicitar revision. Sin embargo, no produce una respuesta de actividad propia en `student_answers`.

## 7. `teoria` es solo lectura

`teoria_player.js` renderiza:

- `data.titulo`;
- `data.contenido`;
- `data.formato`.

Si el formato es `markdown`, intenta usar Toast UI Viewer. Si el viewer no esta disponible o falla, usa fallback con `<pre>`.

No hay inputs, no llama `Student.Answers.setAnswer()` y no participa en autoguardado.

## 8. `quiz_multiple` permite seleccionar y comprobar

`quiz_multiple_player.js`:

- lee `data.pregunta`;
- lee `data.opciones`;
- lee `data.respuestas_correctas`;
- usa `radio` si hay una respuesta correcta;
- usa `checkbox` si hay multiples respuestas correctas;
- preselecciona respuestas previas desde `Student.Answers.getAnswer(component.id)`;
- guarda en cada cambio de seleccion;
- al pulsar `Comprobar`, muestra feedback y guarda metadata `checked`.

Respuesta guardada aproximada:

```json
{
  "componentId": "quiz_multiple_1",
  "tipo": "quiz_multiple",
  "value": "opcion_1",
  "metadata": {
    "checked": true,
    "isCorrect": true
  }
}
```

Si hay multiples opciones seleccionadas, `value` puede ser una lista.

## 9. `pregunta_abierta` permite escribir

`pregunta_abierta_player.js`:

- muestra `data.enunciado`;
- crea un textarea;
- restaura respuesta previa si existe;
- en cada `input`, llama `Student.Answers.setAnswer()`.

Respuesta guardada:

```json
{
  "componentId": "pregunta_abierta_1",
  "tipo": "pregunta_abierta",
  "value": "Texto escrito por el alumno.",
  "metadata": {}
}
```

Nota: el texto visible "Tu respuesta no se guarda todavia en esta vista previa" queda desactualizado para LMS real, porque el flujo actual si guarda mediante `Student.Answers` + `AutoSave`.

## 10. `codigo` permite escribir o editar codigo

`codigo_player.js`:

- muestra `data.enunciado`;
- muestra `data.lenguaje`;
- muestra `data.instrucciones`;
- inicializa el textarea con `data.codigo_base`;
- restaura respuesta previa si existe;
- soporta Tab, Shift+Tab y Enter con indentacion;
- permite restaurar el codigo base;
- guarda en cada `input` o al restaurar.

Respuesta guardada:

```json
{
  "componentId": "codigo_1",
  "tipo": "codigo",
  "value": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "metadata": {
    "lenguaje": "python"
  }
}
```

## 11. Confirmacion: `codigo` NO se ejecuta

Confirmado: `codigo_player.js` solo ofrece un textarea y helpers de edicion. No hay interprete, sandbox, llamada a backend para ejecutar, consola ni evaluador automatico de codigo.

El codigo escrito se trata como texto y se guarda como `value`.

## 12. `Student.Answers`

`Student.Answers` vive dentro de `student/js/state.js`. Mantiene un `answersMap` en memoria, indexado por `componentId`.

API principal:

| Funcion | Proposito |
| --- | --- |
| `setAnswer(componentId, answerPayload)` | Guarda/actualiza una respuesta en memoria y emite evento. |
| `getAnswer(componentId)` | Devuelve una respuesta individual. |
| `getAllAnswers()` | Devuelve lista de respuestas. |
| `getAllAnswersMap()` | Devuelve mapa `{ componentId: answer }`. |
| `loadAnswers(initialAnswers)` | Carga respuestas iniciales del backend. |
| `clearAnswer(componentId)` | Borra una respuesta y emite evento. |
| `hasAnswers()` | Indica si hay respuestas en memoria. |

`Student.Answers` no persiste por si solo; solo prepara estado frontend para `AutoSave`.

## 13. Estructura de una respuesta guardada

Formato normal:

```json
{
  "componentId": "codigo_1",
  "tipo": "codigo",
  "value": "respuesta del alumno",
  "metadata": {}
}
```

En backend, `save_student_answers()` normaliza cada respuesta y la guarda como:

```json
{
  "codigo_1": {
    "componentId": "codigo_1",
    "tipo": "codigo",
    "value": "respuesta del alumno",
    "metadata": {}
  }
}
```

Validaciones backend por tipo:

| Tipo | `value` permitido |
| --- | --- |
| `quiz_multiple` | `null`, `""`, lista vacia, string/numero, o lista de valores convertibles a string. |
| `pregunta_abierta` | string, maximo 8000 caracteres. |
| `codigo` | string, maximo 20000 caracteres. |

El backend rechaza:

- respuestas que no sean dict;
- componentes inexistentes;
- componentes no auditables;
- tipo de respuesta distinto al tipo del componente;
- `metadata` que no sea dict.

## 14. Evento de cambio de respuesta

Cada player interactivo llama:

```text
Student.Answers.setAnswer(component.id, payload)
```

`setAnswer()`:

1. Normaliza la respuesta.
2. Guarda copia en `answersMap`.
3. Llama `notifyAnswersChanged()`.
4. Dispara `CustomEvent("ia-assistant:student-answer-change")`.

Detalle del evento:

```json
{
  "componentId": "codigo_1",
  "answer": {
    "componentId": "codigo_1",
    "tipo": "codigo",
    "value": "...",
    "metadata": {}
  },
  "answers": []
}
```

`AutoSave` escucha ese evento. `RevisionPlayer` tambien lo escucha para actualizar el resumen.

## 15. Como funciona el autoguardado

`student/js/autosave.js` se inicializa con:

```text
Student.AutoSave.init(runtime, element, root)
```

Durante init:

- guarda referencias a `runtime` y `element`;
- crea/ubica un status visual de guardado;
- inicializa `lastSavedPayload` con las respuestas cargadas;
- escucha `ia-assistant:student-answer-change`;
- escucha `beforeunload` para intentar `flushPendingSave()`.

Flujo de autoguardado:

```text
answer change
-> scheduleSave()
-> status "Cambios pendientes"
-> espera 1000 ms
-> saveNow()
-> Api.saveAnswers(runtime, element, answers)
-> handler save_student_answers
-> status "Guardado" o error
```

## 16. Debounce

El debounce esta en `scheduleSave()`:

```text
si ya existe saveTimer:
    clearTimeout(saveTimer)
crear nuevo setTimeout(saveNow, 1000)
```

Esto significa que cada cambio reinicia una espera de 1 segundo. El guardado ocurre cuando el alumno deja de cambiar la respuesta durante ese intervalo.

## 17. Como se evita guardar por cada letra

En `pregunta_abierta` y `codigo`, cada tecla dispara `input` y por tanto `Student.Answers.setAnswer()`. Sin debounce, eso podria generar un POST por letra.

La proteccion es:

```text
input por letra
-> setAnswer()
-> evento global
-> AutoSave.scheduleSave()
-> cancela timer anterior
-> espera 1000 ms desde el ultimo cambio
-> un solo saveNow()
```

Ademas, `saveNow()` compara el JSON actual contra `lastSavedPayload`. Si no hay cambios reales, no vuelve a enviar.

## 18. Como se llama `save_student_answers`

`Student.Api.saveAnswers()`:

1. Construye payload `{ answers: answers || {} }`.
2. Obtiene URL con `runtime.handlerUrl(element, "save_student_answers")`.
3. Envia POST JSON.
4. Usa `fetch` si existe, o XHR como fallback.
5. Ejecuta callback con la respuesta del backend.

Payload:

```json
{
  "answers": {
    "quiz_multiple_1": {
      "componentId": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "value": "opcion_1",
      "metadata": {
        "checked": true,
        "isCorrect": true
      }
    }
  }
}
```

Respuesta exitosa:

```json
{
  "ok": true,
  "success": true,
  "saved_count": 1
}
```

## 19. CSRF y credentials

`student/js/api.js` obtiene CSRF desde la cookie `csrftoken`.

Con `fetch`:

```json
{
  "method": "POST",
  "credentials": "same-origin",
  "headers": {
    "Content-Type": "application/json",
    "X-CSRFToken": "..."
  }
}
```

Con XHR:

- `xhr.withCredentials = true`;
- header `Content-Type: application/json;charset=UTF-8`;
- header `X-CSRFToken` si existe.

Si no hay runtime, handler URL o respuesta valida, se devuelve error por callback.

## 20. Persistencia en `Scope.user_state`

En `xblock.py`:

```python
student_answers = Dict(
    default={},
    scope=Scope.user_state,
)
```

`save_student_answers()` normaliza el mapa entrante y asigna:

```python
self.student_answers = normalized_answers
```

Como el scope es `user_state`, esas respuestas quedan asociadas al alumno actual, no al contenido global del curso ni al docente.

## 21. Restauracion de respuestas al recargar

Al recargar:

```text
student_view()
-> initial_student_answers = self.student_answers
-> IAAssistantStudent(...)
-> Student.Answers.loadAnswers(initial_student_answers)
-> Renderer.render()
-> cada player consulta Answers.getAnswer(component.id)
-> prefill de inputs/textareas
```

Restauracion por componente:

| Tipo | Restauracion |
| --- | --- |
| `quiz_multiple` | Marca radio/checkbox si `value` coincide con opcion. |
| `pregunta_abierta` | Llena textarea con `value`. |
| `codigo` | Llena textarea con `value`; si no hay respuesta usa `codigo_base`. |
| `revision` | Resume respuestas desde `Student.Answers`. |

## 22. Condicion de carrera entre autosave y solicitar revision

La revision backend usa `self.student_answers` ya guardado en servidor:

```text
request_student_review()
-> answers = self.student_answers
-> generate_student_review(unit, answers, ...)
```

Riesgo:

```text
alumno escribe respuesta
-> setAnswer actualiza memoria frontend
-> autosave queda pendiente por debounce
-> alumno pulsa "Solicitar revision" antes de que termine el guardado
-> backend podria revisar student_answers anterior
```

Esa es la condicion de carrera: la UI local tiene respuestas nuevas, pero el backend puede recibir la solicitud de revision antes de persistirlas.

## 23. Mitigacion con `flushPendingSave`

`RevisionPlayer` intenta mitigar la carrera:

```text
click Solicitar revision
-> AutoSave.flushPendingSave()
-> proceedRequest()
-> Api.requestReview(...)
```

`flushPendingSave()`:

```text
si hay saveTimer:
    clearTimeout(saveTimer)
    saveNow()
```

Esto mitiga parcialmente porque fuerza el guardado pendiente sin esperar el debounce.

Pero hay un punto flojo importante: `saveNow()` usa callback asincrono y `flushPendingSave()` no devuelve una promesa real que espere a que el POST termine. `RevisionPlayer` contempla un posible `.then()`, pero en la implementacion actual `flushPendingSave()` devuelve `undefined`; por eso `proceedRequest()` se ejecuta inmediatamente despues de iniciar el guardado.

Conclusion: la carrera esta detectada y parcialmente mitigada, pero no completamente eliminada. Puede persistir si la revision llega al backend antes de que termine `save_student_answers`.

## 24. Riesgos o puntos flojos detectados

| Riesgo | Impacto |
| --- | --- |
| `flushPendingSave()` no espera el POST | La revision puede usar respuestas anteriores. |
| `saveNow()` ignora cambios si `isSaving` ya esta activo | Un cambio durante guardado podria quedar pendiente hasta otro evento. |
| No hay retry de autosave | Error de red deja estado visual de error, pero no reintenta automaticamente. |
| Texto desactualizado en pregunta abierta | Dice que no guarda todavia, aunque el flujo actual si guarda. |
| `revision` sintetico no forma parte de `unidad_json` | Es correcto para UX, pero puede confundir al diagnosticar orden de componentes. |
| `teoria` depende de Toast UI Viewer | Hay fallback, pero la experiencia visual baja si no carga. |
| No se ejecuta ni valida codigo | Correcto por seguridad, pero no hay feedback automatico de codigo. |
| `quiz_multiple` guarda al cambiar y tambien al comprobar | Puede haber estados "respondido sin comprobar"; esta contemplado por revision. |
| Validacion backend no valida que opcion de quiz exista | Normaliza strings/listas, pero no cruza `value` contra IDs de opciones. |
| `requestReview` envia `component_ids: []` | Backend interpreta lista vacia como revisar todos; esta bien, pero depende de esa convencion. |
| Encoding de textos visibles | Hay caracteres con mojibake en algunos archivos; conviene normalizar UTF-8. |

## 25. Recomendaciones antes de produccion

1. Hacer que `AutoSave.saveNow()` y `flushPendingSave()` devuelvan una `Promise` que termine cuando el backend responda.
2. En `RevisionPlayer`, esperar esa promesa antes de llamar `requestReview`.
3. Manejar cambios ocurridos mientras `isSaving` esta activo, programando otro guardado si el payload cambio.
4. Agregar retry/backoff para fallos transitorios de autosave.
5. Corregir el texto de pregunta abierta sobre guardado.
6. Mostrar timestamp o estado mas claro: pendiente, guardando, guardado, error.
7. Validar en backend que respuestas de quiz apunten a opciones existentes.
8. Agregar tests de `save_student_answers` para valores validos e invalidos.
9. Agregar prueba de carrera: escribir respuesta y solicitar revision inmediatamente.
10. Documentar que `codigo` no se ejecuta ni se evalua automaticamente.
11. Revisar encoding UTF-8 de recursos Student.

## Ejemplo completo: unidad "Recursividad"

### `initial_unit`

```json
{
  "version": 1,
  "titulo": "Recursividad",
  "componentes": [
    {
      "id": "teoria_1",
      "tipo": "teoria",
      "nombre": "Introduccion",
      "data": {
        "titulo": "Introduccion a la recursividad",
        "formato": "markdown",
        "contenido": "La recursividad permite resolver un problema llamando a la misma funcion con casos mas pequenos."
      }
    },
    {
      "id": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "nombre": "Condicion de salida",
      "data": {
        "pregunta": "Que evita que una funcion recursiva continue indefinidamente?",
        "opciones": [
          {
            "id": "opcion_1",
            "texto": "Un caso base",
            "feedback": "Correcto. El caso base detiene la recursion."
          },
          {
            "id": "opcion_2",
            "texto": "Una variable global",
            "feedback": "No es una condicion necesaria."
          }
        ],
        "respuestas_correctas": ["opcion_1"]
      }
    },
    {
      "id": "pregunta_abierta_1",
      "tipo": "pregunta_abierta",
      "nombre": "Caso base",
      "data": {
        "enunciado": "Explica por que el caso base es importante en una funcion recursiva.",
        "rubrica": "Debe mencionar terminacion y evitar llamadas infinitas."
      }
    },
    {
      "id": "codigo_1",
      "tipo": "codigo",
      "nombre": "Fibonacci",
      "data": {
        "enunciado": "Completa una funcion recursiva para Fibonacci.",
        "lenguaje": "python",
        "codigo_base": "def fibonacci(n):\n    # TODO\n    pass",
        "instrucciones": "Usa casos base para 0 y 1."
      }
    }
  ]
}
```

### Flujo simulado

```text
1. Alumno abre la unidad.
2. student_view envia initial_unit e initial_student_answers.
3. Student.State.loadUnit(initial_unit).
4. Student.Answers.loadAnswers(initial_student_answers).
5. Renderer renderiza teoria, quiz, pregunta abierta, codigo y revision sintetica.
6. Alumno selecciona "opcion_1" en el quiz.
7. QuizMultiplePlayer llama Student.Answers.setAnswer().
8. Alumno escribe respuesta abierta.
9. PreguntaAbiertaPlayer llama Student.Answers.setAnswer().
10. Alumno escribe codigo Fibonacci.
11. CodigoPlayer llama Student.Answers.setAnswer().
12. Cada setAnswer dispara ia-assistant:student-answer-change.
13. AutoSave espera debounce de 1000 ms.
14. AutoSave llama save_student_answers.
15. Backend guarda en student_answers.
16. Alumno recarga.
17. student_view vuelve a enviar initial_student_answers.
18. Players restauran seleccion, texto y codigo.
19. Revision muestra resumen actualizado.
```

### `student_answers`

```json
{
  "quiz_multiple_1": {
    "componentId": "quiz_multiple_1",
    "tipo": "quiz_multiple",
    "value": "opcion_1",
    "metadata": {
      "checked": true,
      "isCorrect": true
    }
  },
  "pregunta_abierta_1": {
    "componentId": "pregunta_abierta_1",
    "tipo": "pregunta_abierta",
    "value": "El caso base detiene la recursion y evita que la funcion se llame infinitamente.",
    "metadata": {}
  },
  "codigo_1": {
    "componentId": "codigo_1",
    "tipo": "codigo",
    "value": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)",
    "metadata": {
      "lenguaje": "python"
    }
  }
}
```

### Payload de `save_student_answers`

```json
{
  "answers": {
    "quiz_multiple_1": {
      "componentId": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "value": "opcion_1",
      "metadata": {
        "checked": true,
        "isCorrect": true
      }
    },
    "pregunta_abierta_1": {
      "componentId": "pregunta_abierta_1",
      "tipo": "pregunta_abierta",
      "value": "El caso base detiene la recursion y evita que la funcion se llame infinitamente.",
      "metadata": {}
    },
    "codigo_1": {
      "componentId": "codigo_1",
      "tipo": "codigo",
      "value": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)",
      "metadata": {
        "lenguaje": "python"
      }
    }
  }
}
```

### Respuesta del handler

```json
{
  "ok": true,
  "success": true,
  "saved_count": 3
}
```

### Revision actualizada

`RevisionPlayer` lee `Student.State.getComponents()` y `Student.Answers.getAnswer(component.id)` para cada componente auditable. Con las respuestas anteriores muestra:

| Componente | Estado esperado |
| --- | --- |
| Quiz | `Correcto` si se comprobo y `isCorrect` es true. |
| Pregunta abierta | `Respondido`. |
| Codigo | `Codigo escrito`. |

Si el alumno pulsa "Solicitar revision", el player intenta hacer `flushPendingSave()` antes de llamar `request_student_review`, para que el backend revise las respuestas mas recientes.

## Conclusion del diagnostico

El flujo alumno esta listo para MVP con una salvedad importante. La renderizacion de unidad, restauracion de respuestas, interaccion de quiz/pregunta/codigo, autoguardado con debounce y persistencia en `Scope.user_state` estan implementados y separados del flujo docente.

El punto mas delicado antes de produccion es la condicion de carrera entre autosave y solicitud de revision: existe mitigacion con `flushPendingSave()`, pero no espera de forma fiable a que termine el POST. Para un MVP controlado el flujo alumno es funcional; para produccion conviene cerrar esa carrera, mejorar reintentos de guardado, validar mejor respuestas de quiz y corregir textos/encoding.
