# Diagnostico de IA alumno

## 1. Objetivo de la IA alumno

La IA alumno revisa las respuestas guardadas de un estudiante para una unidad IA Assistant y devuelve retroalimentacion estructurada por actividad. Su objetivo es ayudar al alumno a entender que esta bien, que esta incompleto y que debe mejorar, usando las consignas, rubricas, criterios e instrucciones definidas por el docente.

Flujo general:

```text
Alumno responde actividades
-> Student.Answers actualiza respuestas locales
-> AutoSave guarda en student_answers
-> Alumno pulsa Solicitar revision
-> RevisionPlayer intenta flush de autosave
-> Student.Api.requestReview()
-> xblock.py request_student_review
-> student_review_service.generate_student_review()
-> OpenRouter
-> JSON de revision
-> validacion backend
-> student_review_result en Scope.user_state
-> frontend muestra feedback
```

## 2. Que es el componente `revision`

`revision` es un componente de sistema para Student. En la vista alumno resume las respuestas de componentes auditables y permite solicitar una revision con IA.

En frontend lo renderiza:

```text
ia_assistant/static/student/components/revision/revision_player.js
```

En `schema.py` esta declarado como:

```json
{
  "type": "revision",
  "allow_multiple": false,
  "authorable": false,
  "reviewable": false,
  "system": true,
  "student_visible": true
}
```

## 3. Por que `revision` solo aparece en Student

`revision` no es contenido pedagogico autorable por el docente; es una herramienta de seguimiento y retroalimentacion para el alumno. Por eso:

- no aparece como opcion normal en el picker de Studio;
- no se guarda como respuesta del alumno;
- no se revisa a si mismo;
- se renderiza en Student cuando hay actividades auditables.

## 4. Confirmacion: `revision` NO es authorable en Studio

Confirmado. Tanto `schema.py` como `common/components/revision/revision.definition.js` marcan:

```json
{
  "authorable": false,
  "system": true
}
```

El picker de Studio usa el registry y filtra por `authorable`, por lo que `revision` no se puede agregar manualmente desde Studio.

## 5. Cuando aparece automaticamente `revision`

`student/js/renderer.js` revisa si la unidad tiene componentes auditables:

```text
quiz_multiple
pregunta_abierta
codigo
```

Si hay al menos uno y la unidad no trae un componente `revision`, agrega un componente sintetico:

```json
{
  "id": "__revision_auto__",
  "tipo": "revision",
  "nombre": "Revision",
  "data": {}
}
```

Ese componente sintetico solo existe en el render frontend. No modifica `unidad_json`.

## 6. Componentes que revisa

| Tipo | Motivo |
| --- | --- |
| `quiz_multiple` | Tiene opciones, respuesta correcta y seleccion del alumno. |
| `pregunta_abierta` | Tiene enunciado/rubrica y texto libre del alumno. |
| `codigo` | Tiene consigna/instrucciones/codigo base y codigo escrito por el alumno. |

## 7. Componentes que ignora

| Tipo | Motivo |
| --- | --- |
| `teoria` | Es contenido de lectura, no respuesta del alumno. |
| `revision` | Es un componente de sistema, no una actividad evaluable. |

Backend y frontend coinciden en esto: los auditables reales son `quiz_multiple`, `pregunta_abierta` y `codigo`.

## 8. Confirmacion: `codigo` NO se ejecuta

Confirmado. La revision de codigo no ejecuta codigo del alumno.

El prompt backend dice explicitamente:

```text
No ejecutes ningun codigo. No simules ejecucion. Para codigo, haz analisis estatico del texto proporcionado.
```

El frontend solo guarda el codigo como texto. El backend lo envia a IA como texto truncado y la IA debe revisarlo por analisis estatico.

## 9. Como `revision` lee respuestas locales

`RevisionPlayer` usa:

```text
Student.State.getComponents()
Student.Answers.getAnswer(component.id)
```

Con eso construye tarjetas de resumen por cada componente auditable. Cada tarjeta indica estado local:

| Componente | Estado local posible |
| --- | --- |
| `quiz_multiple` | `Pendiente`, `Respondido sin comprobar`, `Correcto`, `Revisar` |
| `pregunta_abierta` | `Pendiente`, `Respondido` |
| `codigo` | `Pendiente`, `Codigo escrito` |

Tambien escucha el evento:

```text
ia-assistant:student-answer-change
```

Cuando cambian respuestas, refresca el resumen activo.

## 10. Como solicita revision IA

El boton "Solicitar revision" en `revision_player.js`:

```text
click
-> deshabilita boton
-> limpia resultado anterior
-> intenta AutoSave.flushPendingSave()
-> obtiene runtime/element desde AutoSave.getRuntimeElement()
-> Student.Api.requestReview(runtime, element, [])
-> renderiza respuesta o error
```

`component_ids: []` se envia como lista vacia. El backend interpreta lista vacia como "revisar todos los componentes auditables".

## 11. Por que se hace flush/autosave antes de revisar

La revision backend no usa las respuestas locales en memoria del frontend. Usa `self.student_answers`, es decir, respuestas ya persistidas.

Por eso, antes de llamar `request_student_review`, el frontend intenta guardar cualquier cambio pendiente:

```text
respuesta local nueva
-> autosave pendiente por debounce
-> alumno pulsa Solicitar revision
-> flushPendingSave()
-> requestReview()
```

Esto busca evitar que la IA revise respuestas anteriores.

Punto importante: en la implementacion actual `flushPendingSave()` dispara `saveNow()`, pero no devuelve una promesa que espere el POST. La mitigacion existe, pero no elimina por completo la carrera.

## 12. Handler `request_student_review`

En `xblock.py`:

```python
@XBlock.json_handler
def request_student_review(self, data, suffix=""):
```

Responsabilidades:

1. Extrae payload.
2. Lee `component_ids`.
3. Carga la unidad con `_get_initial_unit()`.
4. Valida la unidad.
5. Construye mapa de componentes auditables desde `unidad_json`.
6. Filtra por `component_ids` si la lista no esta vacia.
7. Si no hay auditables, devuelve error con debug.
8. Lee `self.student_answers`.
9. Llama `generate_student_review(unit, answers, component_ids=...)`.
10. Si el servicio falla, devuelve payload de error.
11. Si funciona, guarda `self.student_review_result = review`.
12. Devuelve `{ ok: true, success: true, review }`.

## 13. Que lee el backend

El backend lee:

| Dato | Campo | Scope | Uso |
| --- | --- | --- | --- |
| Unidad | `unidad_json` | `Scope.content` | Fuente de componentes, consignas, rubricas y opciones. |
| Respuestas | `student_answers` | `Scope.user_state` | Respuestas guardadas del alumno actual. |
| Resultado revision | `student_review_result` | `Scope.user_state` | Persistencia del ultimo resultado IA del alumno. |

## 14. El backend no confia en respuestas enviadas por frontend

Confirmado. `request_student_review` no acepta un mapa `answers` desde el payload. El frontend solo puede pedir `component_ids`.

El backend usa:

```python
answers = self.student_answers if isinstance(self.student_answers, dict) else {}
```

Esto evita que el frontend inyecte respuestas arbitrarias en el momento de pedir revision. La contrapartida es que depende de que autosave haya terminado antes de revisar.

## 15. Seleccion de componentes auditables

En `request_student_review`:

```text
allowed_types = {"quiz_multiple", "pregunta_abierta", "codigo"}
```

El handler reconstruye `component_map` desde `unidad_json` y solo incluye componentes con:

- objeto dict;
- `id` no vacio;
- `tipo` no vacio;
- tipo permitido.

Si `component_ids` viene como lista no vacia, solo conserva IDs que existan en `component_map`. Si no viene o viene vacia, revisa todos los auditables.

## 16. Como se construye el payload para IA

`student_review_service.py` prepara los datos en `_prepare_components_for_ai(unit, student_answers, component_ids)`.

Flujo:

```text
unit.componentes
-> filtrar quiz_multiple/pregunta_abierta/codigo
-> cruzar con student_answers por componentId
-> extraer campos pedagogicos del componente
-> truncar campos largos
-> convertir respuesta del alumno a formato legible
-> devolver components_for_ai
```

Tambien devuelve `comp_map`, usado despues para validar que la IA no invente componentes.

## 17. Campos incluidos para IA

El item preparado puede incluir:

| Campo | Fuente |
| --- | --- |
| `componentId` | `component.id` |
| `tipo` | `component.tipo` |
| `nombre` | `component.nombre` |
| `pregunta` | `data.pregunta` |
| `enunciado` | `data.enunciado` |
| `titulo` | `data.titulo` |
| `criterio` | `data.criterio` o `data.criterios` |
| `criterios` | JSON de `data.criterios` si existe |
| `rubrica` | `data.rubrica` o `data.rúbrica` |
| `instrucciones` | `data.instrucciones` |
| `lenguaje` | `data.lenguaje` o metadata de respuesta |
| `codigo_base` | `data.codigo_base` |
| `opciones` | IDs y textos de opciones de quiz |
| `respuesta_correcta` | `data.respuesta_correcta` o `data.respuestas_correctas` |
| `respuesta` | respuesta guardada del alumno |

### Particularidades por tipo

| Tipo | Preparacion |
| --- | --- |
| `quiz_multiple` | Convierte IDs seleccionados a textos de opciones cuando puede; conserva respuesta correcta. |
| `pregunta_abierta` | Usa texto libre del alumno. |
| `codigo` | Usa `{ lenguaje, codigo }`; incluye codigo base separado. |

## 18. Prompt de revision IA

`student_review_prompt.py` construye dos prompts:

### System prompt

Indica que la IA debe:

- revisar respuestas de estudiantes;
- devolver feedback por componente;
- evaluar segun consigna, criterios, rubricas e instrucciones del docente;
- usar rubrica/criterio explicito como referencia principal;
- no inventar rubricas;
- no ejecutar codigo ni simular ejecucion;
- devolver solo JSON valido;
- responder en espanol;
- respetar reglas comunes de solo JSON y calidad textual.

### User prompt

Incluye:

- resumen de unidad con `build_unit_summary_text(unit)`;
- lista JSON de componentes auditables preparados;
- instrucciones de salida;
- estados permitidos;
- reglas de evaluacion;
- limites de longitud.

## 19. Como la IA debe devolver JSON

La IA debe devolver solo un objeto JSON, sin Markdown, sin fences y sin texto extra.

Estructura esperada:

```json
{
  "status": "ai",
  "resumen_general": "...",
  "componentes": [
    {
      "componentId": "...",
      "tipo": "quiz_multiple",
      "estado": "bien",
      "comentario": "...",
      "sugerencia": "..."
    }
  ],
  "recomendaciones": ["..."]
}
```

## 20. Formato esperado

| Campo | Tipo | Regla |
| --- | --- | --- |
| `status` | string | Debe ser exactamente `"ai"`. |
| `resumen_general` | string | Resumen breve, truncado a 500 chars en backend. |
| `componentes` | lista | Obligatoria. Cada item debe ser objeto. |
| `componentes[].componentId` | string | Debe existir en componentes auditables reales. |
| `componentes[].tipo` | string | Debe ser `quiz_multiple`, `pregunta_abierta` o `codigo`. |
| `componentes[].estado` | string | Debe estar en estados permitidos. |
| `componentes[].comentario` | string | Truncado a 500 chars. |
| `componentes[].sugerencia` | string | Truncado a 650 chars. |
| `recomendaciones` | lista | Maximo 4 items. |

## 21. Estados de revision

| Estado | Significado |
| --- | --- |
| `bien` | La respuesta cumple adecuadamente. |
| `parcial` | Hay avance, pero falta precision, completitud o correccion. |
| `revisar` | La respuesta tiene problemas importantes o es incorrecta. |
| `sin_respuesta` | No hay respuesta guardada para ese componente. |

En frontend se muestran con etiquetas humanas:

| Estado backend | Label |
| --- | --- |
| `bien` | Bien |
| `parcial` | Parcial |
| `revisar` | Revisar |
| `sin_respuesta` | Sin respuesta |

## 22. Validacion de respuesta IA

`generate_student_review()`:

```text
OpenRouterClient.generate_text()
-> parse_ai_json_response()
-> _validate_ai_payload(parsed, comp_map)
```

`parse_ai_json_response()` viene de `unit_service.py` y:

- acepta JSON directo;
- puede limpiar fences ```json;
- exige JSON parseable;
- exige objeto JSON.

`_validate_ai_payload()`:

- exige payload dict;
- exige `status == "ai"`;
- exige `componentes` lista;
- exige que cada componente sea dict;
- rechaza `componentId` desconocido;
- rechaza tipo fuera de auditables;
- rechaza estado fuera de `bien`, `parcial`, `revisar`, `sin_respuesta`;
- trunca comentario y sugerencia;
- agrega como `sin_respuesta` cualquier auditable que la IA omitio;
- valida `recomendaciones` como lista y limita a 4.

## 23. Guardado en `student_review_result`

Si el servicio devuelve:

```json
{
  "ok": true,
  "success": true,
  "review": {}
}
```

el handler hace:

```python
self.student_review_result = review
```

`student_review_result` es `Dict` con `Scope.user_state`, por lo que el resultado queda asociado al alumno actual.

El handler devuelve:

```json
{
  "ok": true,
  "success": true,
  "review": {}
}
```

## 24. Como se muestra en frontend

`revision_player.js` recibe `result.review` y renderiza:

- estado superior: "Revision generada con IA", "Revision de prueba..." o "Revision lista";
- tarjeta principal "Resultado de revision";
- `resumen_general` destacado;
- recomendaciones generales, maximo las que lleguen en el payload;
- tarjeta por componente revisado;
- tipo, titulo/pregunta/consigna;
- badge de estado;
- comentario;
- sugerencia.

El frontend tambien cruza `componentId` con `Student.State.getComponents()` para mostrar nombres, preguntas y consignas actuales.

## 25. Manejo de errores IA

Los servicios usan `ai_error_to_payload()` de `ai_errors.py`.

Errores controlados:

| Clase | Caso |
| --- | --- |
| `AIConfigurationError` | Falta o invalida configuracion IA. |
| `AIProviderError` | OpenRouter devuelve error o no conecta. |
| `AITimeoutError` | Timeout. |
| `AIInvalidResponseError` | Respuesta IA no parseable o no valida. |
| `AIValidationError` | Contenido generado no pasa validacion. |

Payload de error:

```json
{
  "ok": false,
  "error": "mensaje seguro",
  "code": "codigo_error",
  "details": []
}
```

`request_student_review` devuelve ese payload al frontend. `revision_player.js` muestra un mensaje generico y, si existe, el `result.error`.

OpenRouter puede devolver codigos especificos:

| HTTP/caso | Codigo |
| --- | --- |
| Falta API key | `missing_openrouter_api_key` |
| 401 | `openrouter_unauthorized` |
| 402 | `openrouter_payment_required` |
| 429 | `openrouter_rate_limited` |
| 5xx | `openrouter_server_error` |
| timeout | `openrouter_timeout` |
| conexion | `openrouter_connection_error` |
| respuesta vacia/invalida | `openrouter_empty_content`, `openrouter_invalid_json` |

## 26. Riesgos detectados

| Riesgo | Impacto |
| --- | --- |
| Costo de IA | Cada solicitud de revision llama OpenRouter y puede generar costo por alumno/intento. |
| JSON invalido | Si OpenRouter devuelve texto no JSON o formato incorrecto, la revision falla. |
| Prompt injection | Respuestas del alumno y contenido docente entran al prompt; un alumno podria intentar manipular instrucciones. |
| Privacidad | Se envian respuestas del alumno y contenido de unidad a un proveedor externo. |
| Revision incorrecta | La IA puede evaluar mal, especialmente en codigo sin ejecucion. |
| Condicion de carrera autosave/revision | `flushPendingSave()` no espera el POST; la IA podria revisar respuestas anteriores. |
| No ejecucion de codigo | Es seguro, pero limita la precision para ejercicios programaticos. |
| Validacion parcial de completitud | Backend agrega omitidos como `sin_respuesta`, pero no exige que IA comente todos con calidad equivalente. |
| Estados dependientes de IA | La clasificacion `bien/parcial/revisar` puede variar entre modelos. |
| Sin rate limit visible | No se observa control de frecuencia por alumno en frontend/backend. |
| Resultado anterior no se rehidrata visualmente | `student_review_result` se guarda, pero Student no lo recibe como dato inicial en `student_view`. |
| Encoding | Hay textos con caracteres corruptos/mojibake en varios archivos. |

## 27. Recomendaciones antes de produccion

1. Hacer que `AutoSave.flushPendingSave()` devuelva una promesa y esperar el POST antes de `requestReview`.
2. Enviar a Student el `initial_student_review_result` si se quiere restaurar la ultima revision al recargar.
3. Agregar confirmacion o aviso de costo antes de solicitar revision IA en entornos productivos.
4. Agregar rate limiting por usuario/bloque.
5. Registrar auditoria basica de solicitudes de revision sin exponer datos sensibles.
6. Documentar privacidad: que respuestas del alumno se envian a OpenRouter.
7. Endurecer prompts contra prompt injection desde respuestas del alumno.
8. Agregar tests con cliente fake para JSON valido, JSON invalido, componentes omitidos y errores OpenRouter.
9. Validar que `respuesta_correcta` de quiz se traduzca a texto legible para la IA, no solo IDs.
10. Para codigo, considerar rubricas mas explicitas o tests declarativos no ejecutados.
11. Mostrar al alumno advertencia de que la revision IA es orientativa.
12. Revisar encoding UTF-8 en textos.
13. Agregar control de longitud de respuestas antes de enviar a IA y mensajes claros cuando se truncan.

## Ejemplo completo: unidad "Recursividad"

### Unidad y respuestas

Componentes:

- quiz con opciones y respuesta correcta;
- pregunta abierta con rubrica/criterio;
- ejercicio de codigo con instrucciones, lenguaje y codigo base.

Alumno responde parcialmente:

```json
{
  "quiz_multiple_1": {
    "componentId": "quiz_multiple_1",
    "tipo": "quiz_multiple",
    "value": "opcion_2",
    "metadata": {
      "checked": true,
      "isCorrect": false
    }
  },
  "pregunta_abierta_1": {
    "componentId": "pregunta_abierta_1",
    "tipo": "pregunta_abierta",
    "value": "El caso base sirve para terminar la funcion.",
    "metadata": {}
  },
  "codigo_1": {
    "componentId": "codigo_1",
    "tipo": "codigo",
    "value": "def fibonacci(n):\n    return fibonacci(n-1) + fibonacci(n-2)",
    "metadata": {
      "lenguaje": "python"
    }
  }
}
```

### Simulacion del flujo

```text
1. Alumno responde parcialmente.
2. AutoSave guarda respuestas en student_answers.
3. Alumno pulsa Solicitar revision.
4. Frontend llama request_student_review con component_ids: [].
5. Backend lee unidad_json.
6. Backend lee student_answers.
7. Backend arma payload para IA con consignas, rubricas y respuestas.
8. OpenRouter devuelve JSON.
9. Backend valida JSON y componentes.
10. Backend guarda student_review_result.
11. Frontend muestra feedback por componente.
```

### Payload preparado para IA

Ejemplo aproximado de `components_for_ai`:

```json
[
  {
    "componentId": "quiz_multiple_1",
    "tipo": "quiz_multiple",
    "nombre": "Condicion de salida",
    "pregunta": "Que evita que una funcion recursiva continue indefinidamente?",
    "enunciado": "",
    "titulo": "",
    "criterio": "",
    "criterios": "",
    "rubrica": "",
    "instrucciones": "",
    "lenguaje": "",
    "codigo_base": "",
    "opciones": [
      { "id": "opcion_1", "texto": "Un caso base" },
      { "id": "opcion_2", "texto": "Una variable global" }
    ],
    "respuesta_correcta": ["opcion_1"],
    "respuesta": "Una variable global"
  },
  {
    "componentId": "pregunta_abierta_1",
    "tipo": "pregunta_abierta",
    "nombre": "Caso base",
    "pregunta": "",
    "enunciado": "Explica por que el caso base es importante en una funcion recursiva.",
    "titulo": "",
    "criterio": "",
    "criterios": "",
    "rubrica": "Debe mencionar terminacion y evitar llamadas infinitas.",
    "instrucciones": "",
    "lenguaje": "",
    "codigo_base": "",
    "opciones": [],
    "respuesta_correcta": null,
    "respuesta": "El caso base sirve para terminar la funcion."
  },
  {
    "componentId": "codigo_1",
    "tipo": "codigo",
    "nombre": "Fibonacci",
    "pregunta": "",
    "enunciado": "Completa una funcion recursiva para Fibonacci.",
    "titulo": "",
    "criterio": "",
    "criterios": "",
    "rubrica": "",
    "instrucciones": "Usa casos base para 0 y 1.",
    "lenguaje": "python",
    "codigo_base": "def fibonacci(n):\n    # TODO\n    pass",
    "opciones": [],
    "respuesta_correcta": null,
    "respuesta": {
      "lenguaje": "python",
      "codigo": "def fibonacci(n):\n    return fibonacci(n-1) + fibonacci(n-2)"
    }
  }
]
```

### Respuesta esperada de IA

```json
{
  "status": "ai",
  "resumen_general": "Tienes una comprension inicial del caso base, pero debes corregir el quiz y completar los casos base en el codigo.",
  "componentes": [
    {
      "componentId": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "estado": "revisar",
      "comentario": "Seleccionaste una variable global, pero la condicion que evita recursion infinita es el caso base.",
      "sugerencia": "Revisa la diferencia entre estado auxiliar y condicion de parada."
    },
    {
      "componentId": "pregunta_abierta_1",
      "tipo": "pregunta_abierta",
      "estado": "parcial",
      "comentario": "Mencionas que el caso base termina la funcion, pero falta explicar que evita llamadas infinitas.",
      "sugerencia": "Agrega una frase sobre como el caso base corta la cadena de llamadas recursivas."
    },
    {
      "componentId": "codigo_1",
      "tipo": "codigo",
      "estado": "revisar",
      "comentario": "El codigo aplica recursion, pero no tiene casos base para n igual a 0 o 1.",
      "sugerencia": "Incluye primero if n <= 1: return n, y luego la llamada recursiva."
    }
  ],
  "recomendaciones": [
    "Repasa la funcion del caso base.",
    "Comprueba manualmente que la recursion tenga una condicion de parada.",
    "Mejora tu explicacion conectando terminacion y llamadas infinitas."
  ]
}
```

### Resultado guardado en `student_review_result`

Tras validacion, el backend guarda algo equivalente a:

```json
{
  "status": "ai",
  "resumen_general": "Tienes una comprension inicial del caso base, pero debes corregir el quiz y completar los casos base en el codigo.",
  "componentes": [
    {
      "componentId": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "estado": "revisar",
      "comentario": "Seleccionaste una variable global, pero la condicion que evita recursion infinita es el caso base.",
      "sugerencia": "Revisa la diferencia entre estado auxiliar y condicion de parada."
    },
    {
      "componentId": "pregunta_abierta_1",
      "tipo": "pregunta_abierta",
      "estado": "parcial",
      "comentario": "Mencionas que el caso base termina la funcion, pero falta explicar que evita llamadas infinitas.",
      "sugerencia": "Agrega una frase sobre como el caso base corta la cadena de llamadas recursivas."
    },
    {
      "componentId": "codigo_1",
      "tipo": "codigo",
      "estado": "revisar",
      "comentario": "El codigo aplica recursion, pero no tiene casos base para n igual a 0 o 1.",
      "sugerencia": "Incluye primero if n <= 1: return n, y luego la llamada recursiva."
    }
  ],
  "recomendaciones": [
    "Repasa la funcion del caso base.",
    "Comprueba manualmente que la recursion tenga una condicion de parada.",
    "Mejora tu explicacion conectando terminacion y llamadas infinitas."
  ]
}
```

### Ejemplo visible para el alumno

```text
Resultado de revision

Tienes una comprension inicial del caso base, pero debes corregir el quiz y completar los casos base en el codigo.

Quiz - Condicion de salida
Estado: Revisar
Pregunta: Que evita que una funcion recursiva continue indefinidamente?
Comentario: Seleccionaste una variable global, pero la condicion que evita recursion infinita es el caso base.
Sugerencia: Revisa la diferencia entre estado auxiliar y condicion de parada.

Pregunta abierta - Caso base
Estado: Parcial
Comentario: Mencionas que el caso base termina la funcion, pero falta explicar que evita llamadas infinitas.
Sugerencia: Agrega una frase sobre como el caso base corta la cadena de llamadas recursivas.

Codigo - Fibonacci
Estado: Revisar
Consigna: Completa una funcion recursiva para Fibonacci.
Comentario: El codigo aplica recursion, pero no tiene casos base para n igual a 0 o 1.
Sugerencia: Incluye primero if n <= 1: return n, y luego la llamada recursiva.
```

## Conclusion del diagnostico

La IA alumno esta lista para un MVP controlado: el componente `revision` aparece automaticamente en Student, resume respuestas locales, solicita revision al backend, el backend reconstruye componentes auditables desde `unidad_json`, usa respuestas persistidas en `student_answers`, llama OpenRouter, valida JSON, guarda `student_review_result` y devuelve feedback renderizable.

Para produccion formal faltan piezas importantes: cerrar la carrera autosave/revision esperando realmente el guardado, definir politicas de costo/rate limit, documentar privacidad por envio a OpenRouter, fortalecer defensa ante prompt injection, agregar pruebas automatizadas con cliente IA fake, mostrar claramente que la revision es orientativa y considerar persistir/rehidratar visualmente la ultima revision.
