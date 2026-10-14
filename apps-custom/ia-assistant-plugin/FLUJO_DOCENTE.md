# Diagnostico del flujo docente Studio

## 1. Objetivo del flujo docente

El flujo docente del XBlock IA Assistant permite construir una unidad educativa interactiva desde Studio. El docente puede definir el titulo de la unidad, agregar componentes, editar su contenido, revisar el JSON resultante, previsualizar la experiencia del alumno y guardar la unidad persistida en `unidad_json`.

Este diagnostico se enfoca en la construccion manual desde Studio. La chatbar IA existe en la interfaz, pero no es el centro de este documento.

## 2. Arquitectura general de Studio

Studio esta organizado como una vista XBlock servida por `xblock.py`, con HTML estatico, recursos CSS/JS declarados en `resources_manifest.py` y logica frontend modular bajo `ia_assistant/static/studio/`.

| Capa | Archivos principales | Responsabilidad |
| --- | --- | --- |
| Backend XBlock | `ia_assistant/xblock.py` | Cargar vista Studio, hidratar datos iniciales, exponer handlers, guardar `unidad_json`. |
| Contrato de datos | `ia_assistant/schema.py` | Definir version, tipos de componentes, defaults y flags como `authorable`. |
| Validacion/normalizacion IA | `ia_assistant/validators.py` | Validar y normalizar unidades/componentes generados por IA docente. |
| Recursos | `ia_assistant/resources_manifest.py` | Definir orden de carga de HTML, CSS y JS para Studio y Student. |
| HTML Studio | `ia_assistant/static/studio/html/studio.html` | Estructura base: titulo, picker, guardar, JSON, preview, tabs, editor y chatbar. |
| Estado frontend | `studio/js/state.js` | Fuente de verdad en memoria para la unidad actual y componente activo. |
| Render | `studio/js/renderer.js` | Renderizar tabs y editor del componente activo segun estado. |
| Eventos | `studio/js/events.js` | Conectar titulo, JSON, guardar, preview, autosave y widgets. |
| API frontend | `studio/js/api.js` | Centralizar llamadas `fetch` a handlers XBlock. |
| DOM | `studio/js/dom.js` | Centralizar selectores reutilizados por Studio. |
| Widgets | `studio/widgets/component_picker/`, `component_tabs/` | Agregar, mostrar, renombrar, eliminar y reordenar componentes. |
| Componentes comunes | `static/common/components/` | Registrar tipos disponibles en `window.IAAssistant.Registry`. |
| Editores | `static/studio/components/*/*_editor.js` | Formularios especificos por tipo authorable. |

## 3. Como se carga la vista Studio desde `xblock.py`

`studio_view()` hace lo siguiente:

1. Llama a `_get_initial_unit()` para obtener una unidad inicial segura.
2. Crea un `Fragment` usando `STUDIO_HTML_PATH`.
3. Agrega CSS en el orden de `STUDIO_CSS_PATHS`.
4. Agrega JavaScript en el orden de `STUDIO_JS_PATHS`.
5. Prepara `initialize_data` con:
   - `initial_unit`
   - `load_warning`
   - URLs de handlers IA docente: `generate_teacher_unit`, `generate_teacher_component_create`, `generate_teacher_component_edit`
6. Inicializa el JS con `fragment.initialize_js("IAAssistantStudio", initialize_data)`.

El handler de guardado manual no se pasa en `initialize_data`; `studio.js` obtiene la URL de `save_unit` directamente desde `runtime.handlerUrl(element, "save_unit")`.

## 4. Datos iniciales que recibe Studio

Studio recibe:

```json
{
  "initial_unit": {
    "version": 1,
    "titulo": "Unidad sin titulo",
    "componentes": []
  },
  "load_warning": ""
}
```

Si `unidad_json` esta vacio, es `"{}"` o no existe, `_get_initial_unit()` devuelve `get_default_unit()`. Si `unidad_json` no se puede parsear o no pasa validacion minima, tambien se devuelve la unidad por defecto y un mensaje de advertencia para la interfaz.

## 5. Como se representa `unidad_json`

`unidad_json` es un `String` persistente con `Scope.content`. Su estructura esperada es:

```json
{
  "version": 1,
  "titulo": "Unidad sin titulo",
  "componentes": [
    {
      "id": "teoria_1",
      "tipo": "teoria",
      "nombre": "teoria_1",
      "data": {
        "titulo": "",
        "formato": "markdown",
        "contenido": ""
      }
    }
  ]
}
```

Reglas observadas:

| Campo | Requisito |
| --- | --- |
| `version` | Debe ser `1`. |
| `titulo` | Debe ser string. |
| `componentes` | Debe ser lista. |
| `componentes[].id` | Debe ser string no vacio. |
| `componentes[].tipo` | Debe ser un tipo registrado/permitido. |
| `componentes[].nombre` | Debe ser string. |
| `componentes[].data` | Debe ser objeto. |
| `teoria.data.formato` | Debe ser `"markdown"`. |

## 6. Manejo del estado frontend

`studio/js/state.js` mantiene:

| Estado interno | Uso |
| --- | --- |
| `currentUnit` | Unidad actual en memoria. |
| `activeComponentId` | Componente seleccionado para editar. |
| `componentTypeSequences` | Secuencia por tipo para crear IDs como `teoria_1`, `quiz_multiple_1`. |

Funciones clave:

| Funcion | Proposito |
| --- | --- |
| `loadUnit(unit)` | Valida e hidrata una unidad inicial. |
| `getUnit()` | Devuelve copia profunda de la unidad actual. |
| `setUnitTitle(title)` | Actualiza el titulo, con fallback a "Unidad sin titulo". |
| `addComponent(type)` | Crea un componente authorable desde el registry. |
| `removeComponent(id)` | Elimina componente y ajusta activo. |
| `reorderComponent(source, target, position)` | Reordena componentes en la lista. |
| `activateComponent(id)` | Cambia la tab activa. |
| `renameComponent(id, name)` | Cambia `nombre`. |
| `updateComponentData(id, patch)` | Actualiza campos de `data`. |
| `replaceUnit(unit)` | Reemplaza toda la unidad si es valida. |
| `addGeneratedComponent(component)` | Agrega componente generado, si es valido. |
| `replaceComponent(component)` | Reemplaza componente activo conservando id y tipo. |

El estado frontend no persiste por si solo. La persistencia ocurre al guardar contra el handler `save_unit`.

## 7. Como se agregan componentes manualmente

El flujo manual de alta de componentes es:

```text
Boton "Agregar componente"
-> ComponentPicker abre menu
-> Registry.getAvailable(componentes actuales)
-> docente elige tipo
-> State.addComponent(tipo)
-> se crea data default desde createDefaultData()
-> se agrega al array componentes
-> se activa el nuevo componente
-> Renderer.render()
```

`component_picker.js` no tiene una lista de tipos para crear componentes; usa `window.IAAssistant.Registry.getAvailable()`. Esa funcion filtra por:

- `authorable === true`
- `allowMultiple === true` o que el tipo aun no exista

## 8. Como se editan componentes

`renderer.js` detecta el `tipo` del componente activo y delega al editor correspondiente:

| Tipo | Editor |
| --- | --- |
| `teoria` | `Studio.Components.TeoriaEditor` |
| `quiz_multiple` | `Studio.Components.QuizMultipleEditor` |
| `pregunta_abierta` | `Studio.Components.PreguntaAbiertaEditor` |
| `codigo` | `Studio.Components.CodigoEditor` |

Cada editor modifica el estado llamando a `State.updateComponentData(component.id, patch)`.

Campos editables:

| Tipo | Campos editables |
| --- | --- |
| `teoria` | `data.titulo`, `data.contenido`; fuerza `data.formato = "markdown"`. |
| `quiz_multiple` | `data.pregunta`, `data.opciones[].texto`, `data.opciones[].feedback`, `data.respuestas_correctas`. |
| `pregunta_abierta` | `data.enunciado`, `data.rubrica`. |
| `codigo` | `data.enunciado`, `data.lenguaje`, `data.codigo_base`, `data.instrucciones`. |

Ademas, las tabs permiten editar `component.nombre` de forma inline.

## 9. Eliminacion y reordenamiento de componentes

`component_tabs.js` implementa:

| Accion | Funcionamiento |
| --- | --- |
| Activar | Click o Enter/Espacio sobre una tab llama a `State.activateComponent()`. |
| Renombrar | Boton de editar reemplaza label por input y llama a `State.renameComponent()`. |
| Eliminar | Boton `x` abre `ConfirmModal`; al confirmar llama a `State.removeComponent()`. |
| Reordenar | Drag-and-drop entre tabs llama a `State.reorderComponent()`. |

La eliminacion pide confirmacion. Si se elimina el componente activo, el estado activa el primer componente restante o deja `activeComponentId = null`.

## 10. Panel/visor JSON

El panel JSON vive en `studio.html` y se controla desde `events.js`.

Flujo:

```text
Click en "Ver JSON"
-> State.getUnit()
-> JSON.stringify(unit, null, 2)
-> se escribe en .ia-assistant-json-output
-> se muestra modal
```

El panel permite copiar al portapapeles usando `navigator.clipboard.writeText()`, con fallback mediante `document.execCommand("copy")`. No edita el JSON: solo lo muestra y copia.

## 11. Vista previa alumno desde Studio

Studio incluye un modal de preview con markup compatible con la vista Student. Para hacerlo funcionar, `resources_manifest.py` carga tambien recursos Student dentro de Studio:

- `student/js/state.js`
- `student/js/dom.js`
- `student/js/api.js`
- `student/js/autosave.js`
- `student/js/renderer.js`
- players de componentes Student
- CSS Student

Flujo de preview:

```text
Click "Vista previa alumno"
-> Studio.StudentPreview.open(root)
-> toma copia de State.getUnit()
-> Student.State.loadUnit(unit)
-> Student.Renderer.render(previewRoot)
-> muestra modal
```

La vista previa no guarda datos. Es una renderizacion local del estado Studio actual.

## 12. Guardado manual

El boton `Guardar` se conecta en `events.js` mediante `initSaveUnit()`. Al hacer click:

```text
saveCurrentUnit(root, { source: "manual", showButtonFeedback: true })
-> State.getUnit()
-> Api.saveUnit(unit)
-> POST al handler save_unit
-> si ok: actualiza estado visual "Guardado"
-> si error: muestra mensaje de error
```

Tambien existe autosave cada 60 segundos si el snapshot actual difiere del ultimo snapshot guardado.

## 13. Handler que guarda la unidad

El handler es:

```python
@XBlock.json_handler
def save_unit(self, data, suffix=""):
```

Acepta preferentemente:

```json
{
  "unit": {
    "version": 1,
    "titulo": "Unidad",
    "componentes": []
  }
}
```

Tambien soporta un fallback legacy con `unidad_json` como string parseable.

Si la unidad es valida:

1. Opcionalmente actualiza `prompt_docente` si llega en payload.
2. Serializa `unit` en `self.unidad_json` con `ensure_ascii=False`.
3. Devuelve `ok: true`, `success: true`, mensaje y la unidad.

## 14. Validaciones antes de guardar

Existen dos niveles:

### Frontend

`state.js` valida estructura minima antes de cargar/reemplazar unidades o componentes:

- objeto plano
- version `1`
- titulo string
- componentes array
- id string no vacio
- tipo registrado en registry
- nombre string
- data objeto
- teoria con formato markdown

Los editores muestran recomendaciones visuales:

| Editor | Validaciones visuales |
| --- | --- |
| Teoria | Falta titulo o contenido. |
| Quiz multiple | Falta pregunta, menos de 2 opciones, sin respuesta correcta, opciones vacias, correctas inexistentes. |
| Pregunta abierta | Falta enunciado o rubrica. |
| Codigo | Falta enunciado, lenguaje o instrucciones. |

### Backend

`xblock.py` usa `_is_valid_unit()` y `_is_valid_component()` antes de guardar. La validacion backend es estructural minima. No exige que los campos pedagogicos esten completos, por ejemplo un quiz sin opciones puede guardarse si respeta la estructura base.

`validators.py` contiene validaciones mas estrictas para unidades/componentes generados por IA docente, incluyendo normalizacion de tipos, IDs, markdown y remocion de HTML/imagenes no permitidas. Esa logica aplica al flujo IA, no directamente al guardado manual de `save_unit`.

## 15. Componentes authorable

Segun `schema.py` y las definiciones JS de `static/common/components/`, los componentes authorable son:

| Tipo | Authorable | Multiple | Reviewable | Student visible |
| --- | --- | --- | --- | --- |
| `teoria` | Si | Si | No | Si |
| `quiz_multiple` | Si | Si | Si | Si |
| `pregunta_abierta` | Si | Si | Si | Si |
| `codigo` | Si | Si | Si | Si |

## 16. Confirmacion: `revision` NO es authorable en Studio

`revision` esta definido y registrado, pero:

```json
{
  "authorable": false,
  "system": true,
  "allowMultiple": false
}
```

Por eso `Registry.getAvailable()` no lo devuelve para el `ComponentPicker`, y `ComponentTabs` lo oculta en Studio porque filtra por `componentDefinition.authorable`.

Conclusion: `revision` no se puede agregar manualmente desde Studio. Su presencia es de sistema/Student, no de autoria docente manual.

## 17. Papel de `resources_manifest.py`

`resources_manifest.py` es critico porque define:

- el HTML principal de Studio y Student;
- el orden exacto de CSS;
- el orden exacto de JavaScript;
- que definiciones comunes se registran antes de usar widgets;
- que `studio.js` carga al final;
- que Studio incluye recursos Student para habilitar la vista previa alumno.

El orden importa. Por ejemplo:

```text
namespace.js
utils.js
registry.js
common/components/*.definition.js
state.js
dom.js
api.js
renderer.js
student preview dependencies
events.js
widgets
editors
studio.js
```

Si el orden se rompe, puede fallar el registry, el picker, los editores o el preview.

## 18. Archivos criticos para Studio

| Archivo | Criticidad |
| --- | --- |
| `ia_assistant/xblock.py` | Carga Studio y guarda `unidad_json`. |
| `ia_assistant/resources_manifest.py` | Ordena recursos; falla Studio si falta una dependencia. |
| `ia_assistant/schema.py` | Contrato de tipos y defaults backend. |
| `static/common/js/registry.js` | Registry frontend de componentes. |
| `static/common/components/*/*.definition.js` | Fuente frontend de tipos authorable/system. |
| `static/studio/html/studio.html` | Estructura base de UI. |
| `static/studio/js/state.js` | Fuente de verdad temporal de la unidad. |
| `static/studio/js/events.js` | Guardado, autosave, JSON, preview. |
| `static/studio/js/api.js` | Comunicacion con handlers. |
| `static/studio/js/renderer.js` | Enrutamiento a editores. |
| `static/studio/widgets/component_picker/component_picker.js` | Agregar componentes. |
| `static/studio/widgets/component_tabs/component_tabs.js` | Activar, renombrar, borrar y reordenar. |
| `static/studio/components/*/*_editor.js` | Edicion real de data por tipo. |

## 19. Separacion entre Studio y Student

La separacion conceptual esta bastante clara:

- Studio tiene estado, eventos, widgets y editores propios.
- Student tiene state/dom/api/autosave/renderer/players propios.
- `student_view()` y `studio_view()` son metodos distintos.
- `unidad_json` es compartido como contrato persistente, no como UI temporal.

Punto mixto intencional: Studio carga recursos Student para la vista previa alumno. Esto acopla Studio al renderer Student, pero tiene sentido funcional porque la preview debe usar la misma representacion que vera el alumno.

Punto a vigilar: `student_view()` puede delegar a `studio_view()` cuando `_is_sdk_studio_mode()` es true. Esto esta documentado como soporte temporal para XBlock SDK. En produccion debe garantizarse que `sdk_view_mode` no fuerce Studio accidentalmente en LMS.

## 20. Riesgos o puntos flojos detectados

| Riesgo | Impacto |
| --- | --- |
| Validacion backend de guardado es minima | Se pueden guardar componentes pedagogicamente incompletos aunque los editores adviertan. |
| `validators.py` no se usa en `save_unit` manual | Hay dos contratos de validacion: guardado manual minimo vs IA mas estricta. |
| Duplicacion de contrato backend/frontend | Tipos y defaults existen en `schema.py` y tambien en JS definitions; pueden divergir. |
| Studio carga muchos recursos Student | Necesario para preview, pero aumenta acoplamiento y riesgo de errores por orden de carga. |
| `revision_editor.js` esta en manifest aunque `revision` no es authorable | No rompe el flujo, pero puede confundir porque no se usa para autoria manual. |
| Autosave existe ademas de guardado manual | Bueno para UX, pero puede persistir borradores incompletos sin accion explicita del docente. |
| ConfirmModal requerido para eliminar | Si no carga, el delete no procede. Es seguro, pero podria parecer que el boton no funciona. |
| Codificacion de textos visibles | En algunos archivos/outputs se observan caracteres mal codificados; conviene revisar encoding UTF-8. |
| No hay validacion fuerte de IDs duplicados en backend | `_is_valid_unit()` no detecta IDs repetidos. |
| No se valida allowMultiple en backend | Podrian persistirse duplicados de un tipo no multiple si llegan por payload externo. |

## 21. Recomendaciones antes de produccion

1. Unificar validacion manual con un validador backend mas completo, idealmente reutilizando o separando logica de `validators.py`.
2. Validar campos obligatorios por tipo antes de guardar, no solo en UI.
3. Rechazar IDs duplicados en backend.
4. Validar reglas `authorable`, `system` y `allowMultiple` en backend para payloads de Studio.
5. Revisar si autosave debe estar activo en MVP o si debe marcar claramente "borrador".
6. Mantener sincronizados `schema.py` y las definiciones JS, o generar una fuente desde la otra.
7. Revisar encoding UTF-8 de textos con acentos en HTML/JS/Python.
8. Confirmar que el modo SDK no pueda activar Studio en LMS productivo.
9. Agregar pruebas unitarias para `_is_valid_unit()`, `save_unit` y validacion por tipo.
10. Agregar pruebas de integracion o Playwright para alta, edicion, reordenamiento, preview y guardado.

## Ejemplo completo: "Introduccion a Recursividad"

### Paso 1: Crear la unidad

El docente edita el campo "Titulo de la unidad" y escribe:

```text
Introduccion a Recursividad
```

Internamente:

```text
input titulo
-> Events.initUnitTitle()
-> State.setUnitTitle("Introduccion a Recursividad")
-> currentUnit.titulo cambia en memoria
```

### Paso 2: Agregar una teoria

El docente abre "Agregar componente" y elige "Teoria".

Internamente:

```text
ComponentPicker
-> Registry.getAvailable()
-> State.addComponent("teoria")
-> crea id teoria_1
-> data default: titulo, formato markdown, contenido
-> activeComponentId = teoria_1
-> Renderer.render()
-> TeoriaEditor.render()
```

Luego escribe titulo y contenido. Cada cambio llama a `State.updateComponentData()`.

### Paso 3: Agregar un quiz

El docente elige "Quiz multiple".

Internamente:

```text
State.addComponent("quiz_multiple")
-> crea quiz_multiple_1
-> data default: pregunta, opciones [], respuestas_correctas []
-> QuizMultipleEditor.render()
```

Luego agrega opciones. El editor crea IDs `opcion_1`, `opcion_2`, etc., actualiza `data.opciones` y marca respuestas en `data.respuestas_correctas`.

### Paso 4: Agregar una pregunta abierta

El docente elige "Pregunta abierta".

Internamente:

```text
State.addComponent("pregunta_abierta")
-> crea pregunta_abierta_1
-> data default: enunciado, rubrica
-> PreguntaAbiertaEditor.render()
```

Los textarea actualizan `data.enunciado` y `data.rubrica`.

### Paso 5: Agregar un ejercicio de codigo

El docente elige "Codigo".

Internamente:

```text
State.addComponent("codigo")
-> crea codigo_1
-> data default: enunciado, lenguaje, codigo_base, instrucciones
-> CodigoEditor.render()
```

Si selecciona `python`, `codigo_base.js` puede insertar una plantilla minima si el codigo base esta vacio.

### Paso 6: Guardar la unidad

El docente presiona "Guardar".

Internamente:

```text
Events.saveCurrentUnit()
-> State.getUnit()
-> Api.saveUnit(unit)
-> POST save_unit
-> xblock.py valida estructura minima
-> self.unidad_json = json.dumps(unit, ensure_ascii=False)
-> respuesta ok
```

### Ejemplo aproximado de `unidad_json` final

```json
{
  "version": 1,
  "titulo": "Introduccion a Recursividad",
  "componentes": [
    {
      "id": "teoria_1",
      "tipo": "teoria",
      "nombre": "Concepto base",
      "data": {
        "titulo": "Que es la recursividad",
        "formato": "markdown",
        "contenido": "La recursividad es una tecnica donde una funcion se llama a si misma para resolver subproblemas mas pequenos."
      }
    },
    {
      "id": "quiz_multiple_1",
      "tipo": "quiz_multiple",
      "nombre": "Quiz inicial",
      "data": {
        "pregunta": "Cual es una condicion necesaria para que una funcion recursiva termine?",
        "opciones": [
          {
            "id": "opcion_1",
            "texto": "Un caso base",
            "feedback": "Correcto. El caso base detiene la recursion."
          },
          {
            "id": "opcion_2",
            "texto": "Un ciclo infinito",
            "feedback": "No. Eso impediria terminar."
          },
          {
            "id": "opcion_3",
            "texto": "Una variable global obligatoria",
            "feedback": "No es necesaria para definir recursion."
          }
        ],
        "respuestas_correctas": ["opcion_1"]
      }
    },
    {
      "id": "pregunta_abierta_1",
      "tipo": "pregunta_abierta",
      "nombre": "Explicacion abierta",
      "data": {
        "enunciado": "Explica con tus palabras que ocurre si una funcion recursiva no tiene caso base.",
        "rubrica": "Debe mencionar llamadas indefinidas, consumo de memoria o error por profundidad de recursion."
      }
    },
    {
      "id": "codigo_1",
      "tipo": "codigo",
      "nombre": "Factorial recursivo",
      "data": {
        "enunciado": "Completa una funcion recursiva que calcule el factorial de n.",
        "lenguaje": "python",
        "codigo_base": "def factorial(n):\n    # completa aqui\n    pass",
        "instrucciones": "Usa un caso base para n == 0 o n == 1 y una llamada recursiva para el resto."
      }
    }
  ]
}
```

## Conclusion del diagnostico

El flujo docente esta bien encaminado para un MVP de autoria manual: carga Studio correctamente, tiene un estado frontend claro, agrega componentes desde registry, edita los cuatro tipos authorable, permite renombrar, eliminar, reordenar, ver JSON, previsualizar como alumno y guardar en `unidad_json`.

Sin embargo, antes de produccion conviene fortalecer la validacion backend. Actualmente el guardado manual valida estructura minima, pero no valida campos pedagogicos requeridos, IDs duplicados, reglas `authorable/system` ni `allowMultiple`. Para MVP interno o piloto controlado, el flujo docente esta listo con riesgos conocidos. Para produccion, falta endurecer validaciones y agregar pruebas.
