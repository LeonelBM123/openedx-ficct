# REGLAS DE CÓDIGO - IA Assistant Plugin

Este documento define las reglas de estilo, organización y calidad de código para el plugin `ia-assistant-plugin`.

El objetivo es mantener el código limpio, ordenado, escalable y fácil de mantener, tanto para desarrollo local con XBlock SDK como para producción en Open edX/Tutor.

---

## 1. Principios generales

- El código debe ser claro, simple y mantenible.
- Cada archivo debe tener una responsabilidad clara.
- No se debe escribir código innecesariamente complejo.
- No se debe mezclar lógica de Studio con lógica de Student.
- No se debe mezclar lógica de interfaz con lógica de negocio.
- No se deben dejar pruebas temporales, código muerto o funciones sin uso.
- No se deben usar nombres ambiguos como `data1`, `temp`, `cosas`, `handler2`, etc.
- Todo nombre debe explicar su propósito.
- Los comentarios deben usarse solo cuando realmente ayuden a entender una decisión o lógica no obvia.
- No se deben agregar dependencias externas si no son necesarias.
- No se debe romper la compatibilidad con XBlock SDK ni con Open edX/Tutor.

---

## 2. Estándar para Python

El código Python debe seguir **PEP 8**.

### Reglas principales

- Usar 4 espacios para indentación.
- Usar `snake_case` para variables, funciones y métodos.
- Usar `PascalCase` para clases.
- Usar nombres descriptivos.
- Evitar funciones demasiado largas.
- Evitar archivos demasiado grandes.
- Evitar lógica repetida.
- Evitar imports innecesarios.
- Evitar `except Exception` sin tratamiento claro.
- No dejar `print()` en código final; usar `logging` si es necesario.
- No colocar HTML, CSS o JS grande dentro de archivos Python.
- No duplicar lógica de configuración.
- No duplicar lógica de API keys.
- No ocultar errores importantes.
- No mezclar lógica de OpenRouter directamente en `xblock.py`.

### Ejemplo correcto

```python
def validate_unit_structure(unit_data):
    if not isinstance(unit_data, dict):
        return False

    return "componentes" in unit_data
```

### Ejemplo incorrecto

```python
def validar(x):
    print(x)
    return True
```

---

## 3. Organización del código Python

### `xblock.py`

Debe encargarse de:

- Definir la clase principal `IAAssistantXBlock`.
- Declarar las vistas del XBlock.
- Declarar handlers.
- Cargar recursos HTML, CSS y JS.
- Delegar lógica compleja a otros módulos.

No debe encargarse de:

- Construir prompts complejos.
- Validar profundamente el JSON.
- Contener lógica extensa de OpenRouter.
- Contener HTML grande embebido.
- Contener CSS o JavaScript.
- Manejar toda la lógica de componentes.

---

### `fields.py`

Debe contener los campos persistentes del XBlock.

Ejemplos:

- `display_name`
- `prompt_docente`
- `unidad_json`
- flags necesarios para desarrollo o SDK

Los campos persistentes no deben renombrarse sin analizar compatibilidad.

---

### `config.py`

Debe contener únicamente configuración del plugin.

Ejemplos:

- Lectura de `OPENROUTER_API_KEY`.
- Modelo por defecto.
- Timeouts.
- Flags simples de configuración.

La API key debe leerse en un solo lugar.

La variable oficial debe ser:

```text
OPENROUTER_API_KEY
```

---

### `schema.py`

Debe definir la estructura esperada de la unidad.

Ejemplo base:

```json
{
  "version": 1,
  "titulo": "Unidad sin título",
  "componentes": []
}
```

---

### `validators.py`

Debe contener la lógica de validación del JSON.

La validación principal siempre debe ocurrir en backend, no solo en JavaScript.

---

### `services/`

Debe contener lógica de negocio o integración externa.

Ejemplos:

- Cliente OpenRouter.
- Constructor de prompts.
- Servicio para generar unidades.
- Servicio para procesar componentes.
- Servicio para preparar o normalizar JSON.

---

### `utils/`

Debe contener utilidades reutilizables.

Ejemplos:

- Carga de recursos estáticos.
- Funciones auxiliares para JSON.
- Helpers pequeños y genéricos.

---

## 4. Estándar para JavaScript

El JavaScript debe ser simple, modular y sin frameworks por ahora.

### Reglas principales

- Usar `"use strict";`.
- Evitar variables globales sueltas.
- Usar un namespace propio del plugin.
- No mezclar lógica de Studio con lógica de Student.
- No escribir todo en un solo archivo.
- No duplicar selectores DOM en muchos archivos.
- No hacer llamadas a handlers desde cualquier archivo.
- Centralizar llamadas al backend en `api.js`.
- Centralizar estado en `state.js`.
- Centralizar selectores en `dom.js`.
- Inicializar la vista desde `studio.js` o `student.js`.
- No depender de librerías externas si no son necesarias.
- No usar código minificado dentro del repo salvo dependencia justificada.
- No usar hacks globales para corregir problemas de carga.

---

## 5. Namespace JavaScript

Todo el código JavaScript debe vivir bajo el namespace:

```javascript
window.IAAssistant = window.IAAssistant || {};
```

Ejemplo:

```javascript
(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    window.IAAssistant.Studio.Messages = {
        show: function (message) {
            console.log(message);
        }
    };
}());
```

No usar variables globales como:

```javascript
let currentComponent = null;
let components = [];
```

Preferir algo como:

```javascript
window.IAAssistant.Studio.State = {
    currentComponent: null,
    components: []
};
```

---

## 6. Reglas para archivos JavaScript

### `state.js`

Debe manejar el estado de la interfaz.

Ejemplos:

- Unidad actual.
- Componente activo.
- Componentes añadidos.
- Estado de guardado.
- Mensaje actual del chatbar.
- Estado temporal de la interfaz.

No debe guardar datos persistentes que no correspondan al `unidad_json`.

---

### `dom.js`

Debe centralizar los selectores.

Ejemplo:

```javascript
getRoot: function () {
    return document.querySelector(".ia-assistant-studio");
}
```

No repetir `document.querySelector(...)` en todos los archivos si el selector se usa varias veces.

---

### `api.js`

Debe manejar llamadas al backend/XBlock handlers.

Ejemplos:

- Guardar unidad.
- Validar unidad.
- Generar unidad con IA en el futuro.

No llamar handlers directamente desde componentes o widgets si esa lógica puede pasar por `api.js`.

---

### `events.js`

Debe conectar eventos de botones, inputs, tabs y formularios.

Ejemplos:

- Clic en añadir componente.
- Clic en eliminar tab.
- Cambio de componente activo.
- Envío de chatbar.
- Guardado de unidad.

---

### `renderer.js`

Debe encargarse de renderizar la interfaz según el estado actual.

No debe manejar lógica de negocio pesada.

---

### `studio.js`

Debe ser el punto de entrada de Studio.

Debe inicializar:

- Estado.
- DOM.
- Eventos.
- Render inicial.
- Widgets principales.

No debe contener toda la lógica de Studio.

---

### `student.js`

Debe ser el punto de entrada de Student.

Por ahora puede ser mínimo, porque la prioridad inicial es Studio.

No debe cargar lógica docente.

---

## 7. Estándar para CSS

El CSS debe estar aislado para no romper Open edX.

### Reglas principales

- Usar clases con prefijo `ia-assistant-`.
- No usar selectores globales agresivos.
- No modificar `body`, `html`, `.container`, `.btn`, etc.
- No usar `!important` salvo caso extremo y justificado.
- No mezclar CSS de Studio con CSS de Student.
- Usar variables CSS para colores, espacios, radios y bordes.
- Mantener estilos de componentes separados cuando sea necesario.
- Mantener estilos de widgets separados cuando sea necesario.
- Evitar estilos inline en HTML.
- Evitar reglas demasiado específicas o difíciles de sobrescribir.

---

## 8. Variables CSS

Las variables deben ir en:

```text
static/common/css/tokens.css
```

Ejemplo:

```css
:root {
    --ia-assistant-color-primary: #1a3a6b;
    --ia-assistant-color-danger: #cc0000;
    --ia-assistant-color-border: #d9dee8;
    --ia-assistant-color-surface: #ffffff;
    --ia-assistant-color-background: #f7f9fc;
    --ia-assistant-color-text: #1f2937;
    --ia-assistant-color-muted: #6b7280;

    --ia-assistant-radius-sm: 6px;
    --ia-assistant-radius-md: 10px;
    --ia-assistant-radius-lg: 14px;

    --ia-assistant-space-xs: 4px;
    --ia-assistant-space-sm: 8px;
    --ia-assistant-space-md: 16px;
    --ia-assistant-space-lg: 24px;
    --ia-assistant-space-xl: 32px;
}
```

---

## 9. Nombres de clases CSS

Usar nombres descriptivos y con prefijo.

Ejemplo correcto:

```css
.ia-assistant-studio {
    display: flex;
    flex-direction: column;
}

.ia-assistant-chatbar {
    border-top: 1px solid var(--ia-assistant-color-border);
}
```

Ejemplo incorrecto:

```css
.studio {
    display: flex;
}

button {
    background: blue;
}
```

---

## 10. Estándar para HTML

El HTML debe ser semántico, limpio y fácil de leer.

### Reglas principales

- No usar estilos inline.
- No usar IDs genéricos.
- Usar clases con prefijo `ia-assistant-`.
- No duplicar estructuras grandes.
- Separar HTML de Studio y Student.
- Separar HTML de widgets y componentes cuando corresponda.
- Mantener los templates pequeños.
- No meter lógica visual compleja directamente en `xblock.py`.

Ejemplo correcto:

```html
<section class="ia-assistant-studio">
    <header class="ia-assistant-studio__header">
        <h2 class="ia-assistant-studio__title">IA Assistant</h2>
        <p class="ia-assistant-studio__subtitle">
            Constructor de unidad interactiva.
        </p>
    </header>
</section>
```

Ejemplo incorrecto:

```html
<div style="width: 100%;">
    <h1>IA</h1>
</div>
```

---

## 11. Componentes oficiales

Los tipos oficiales de componentes son:

```text
teoria
quiz_multiple
pregunta_abierta
codigo
revision
```

No usar variantes como:

```text
quizz_multiple
pregunta_multiple
quiz
open_question
```

Los nombres internos deben mantenerse iguales en:

- JSON.
- JavaScript.
- Validadores.
- Registry.
- Editores.
- Renderizadores.

---

## 12. Estructura recomendada para componentes

Cada componente debe poder tener:

- Definición común.
- Editor docente.
- Vista de alumno.

Estructura recomendada:

```text
common/components/teoria/
└── teoria.definition.js

studio/components/teoria/
├── teoria_editor.html
├── teoria_editor.css
└── teoria_editor.js

student/components/teoria/
├── teoria_player.html
├── teoria_player.css
└── teoria_player.js
```

Esta misma lógica debe repetirse para:

```text
quiz_multiple
pregunta_abierta
codigo
revision
```

---

## 13. Definición común de componentes

Cada componente debe tener una definición común que indique al menos:

- Tipo interno.
- Nombre visible.
- Si permite múltiples instancias.
- Data inicial.
- Campos principales.

Ejemplo conceptual:

```javascript
window.IAAssistant.Registry.register({
    type: "teoria",
    label: "Teoría",
    allowMultiple: true,
    createDefaultData: function () {
        return {
            titulo: "",
            contenido: ""
        };
    }
});
```

Si en el futuro se agrega un componente nuevo, como `une_la_palabra`, debe registrarse en el registry y seguir la misma estructura.

---

## 14. Widgets de Studio

Los widgets de Studio son partes de la interfaz docente, pero no son componentes de unidad.

Widgets iniciales:

```text
chatbar_ia
component_picker
component_tabs
```

Diferencia:

```text
widget = parte de la interfaz docente
component = parte real de la unidad educativa
```

Ejemplo:

```text
chatbar_ia no se guarda como componente
teoria sí se guarda como componente
```

---

## 15. Reglas para `chatbar_ia`

La `chatbar_ia` es una pieza fija de la interfaz docente.

Debe cumplir:

- Estar ubicada en la parte inferior de la interfaz docente.
- Tener un textarea.
- Tener botón de enviar.
- El textarea debe crecer dinámicamente hasta una altura máxima.
- Si supera la altura máxima, debe mostrar scroll interno.
- `Enter` puede enviar el mensaje.
- `Shift + Enter` debe permitir salto de línea.
- Por ahora no debe conectar con IA si la fase actual no lo requiere.
- No debe guardar mensajes dentro de `unidad_json`.

---

## 16. Reglas para `component_picker`

El `component_picker` debe encargarse de añadir componentes.

Debe cumplir:

- Mostrar el botón `+ Añadir componente`.
- Mostrar los componentes disponibles.
- Leer componentes desde el registry.
- Ocultar componentes que ya fueron añadidos si `allowMultiple` es `false`.
- Crear una nueva tab al seleccionar un componente.
- No tener nombres de componentes quemados manualmente si pueden venir del registry.

---

## 17. Reglas para `component_tabs`

El `component_tabs` debe encargarse de las tabs de componentes.

Debe cumplir:

- Mostrar una tab por cada componente agregado.
- Permitir activar una tab.
- Mostrar una `x` para eliminar una tab.
- Pedir confirmación antes de eliminar.
- Actualizar el estado después de eliminar.
- Actualizar el componente activo.
- Notificar al picker para que vuelva a mostrar el componente eliminado si corresponde.

---

## 18. Reglas para editores de componentes

Cada componente de Studio debe tener su propio editor.

Ejemplos:

```text
teoria_editor
quiz_multiple_editor
pregunta_abierta_editor
codigo_editor
revision_editor
```

Cada editor debe poder:

- Renderizar su formulario.
- Recibir data inicial.
- Actualizar el estado al cambiar campos.
- Validar campos básicos.
- Mantener su lógica separada de otros componentes.

Ejemplo de campos por componente:

```text
teoria:
- título
- contenido

quiz_multiple:
- pregunta
- opciones con id, texto y feedback
- respuestas correctas

pregunta_abierta:
- enunciado
- respuesta esperada o criterio

codigo:
- enunciado
- lenguaje
- código base
- instrucciones

revision:
- instrucciones
- criterios
```

---

## 19. Reglas para `unidad_json`

`unidad_json` debe ser la fuente persistente de la unidad.

Formato base recomendado:

```json
{
  "version": 1,
  "titulo": "Unidad sin título",
  "componentes": [
    {
      "id": "cmp_001",
      "tipo": "teoria",
      "data": {
        "titulo": "",
        "contenido": ""
      }
    }
  ]
}
```

Reglas:

- Siempre debe ser JSON válido.
- Debe tener `version`.
- Debe tener `titulo`.
- Debe tener `componentes`.
- `componentes` debe ser una lista.
- Cada componente debe tener `id`.
- Cada componente debe tener `tipo`.
- Cada componente debe tener `data`.
- El `tipo` debe ser uno de los tipos oficiales.
- No guardar datos temporales de UI dentro de `unidad_json`.

No guardar en `unidad_json`:

```text
tab activa
estado del dropdown
mensaje actual del chat
errores visuales temporales
estado de carga
estado del textarea
```

---

## 20. Reglas para validación

La validación principal debe estar en Python.

Frontend puede validar para mejorar experiencia, pero la validación final debe estar en backend.

Validar mínimo:

- JSON parseable.
- Estructura base.
- Tipos permitidos.
- Campos requeridos por componente.
- Datos vacíos importantes.
- Componentes duplicados si `allowMultiple` es `false`.

---

## 21. Reglas para IA/OpenRouter

La IA no debe conectarse hasta que la interfaz docente manual funcione correctamente.

Cuando se conecte:

- La API key debe leerse solo desde `config.py`.
- La variable oficial debe ser `OPENROUTER_API_KEY`.
- No exponer API keys al frontend.
- No guardar API keys en archivos del repo.
- La IA no debe guardar directamente.
- La IA genera una propuesta.
- El backend valida.
- El docente revisa.
- El docente guarda.

Flujo correcto:

```text
prompt docente
→ OpenRouter
→ JSON propuesto
→ validación backend
→ editor/vista previa
→ guardar unidad_json
```

---

## 22. Seguridad básica

- No usar `innerHTML` con datos del usuario sin sanitizar.
- No inyectar HTML crudo generado por IA.
- No ejecutar código generado por IA.
- No exponer información sensible en errores visibles.
- No cargar scripts en vistas donde no se usan.
- No hacer que `student_view` llame siempre a `studio_view`.
- No agregar librerías externas sin necesidad real.
- No guardar API keys en frontend.
- No confiar solo en validaciones de frontend.

---

## 23. Uso de comentarios

Los comentarios deben explicar intención, no repetir código.

Buen comentario:

```python
# En XBlock SDK se fuerza studio_view porque Workbench renderiza student_view por defecto.
if self.sdk_force_studio_view:
    return self.studio_view(context)
```

Comentario innecesario:

```python
# Guarda el prompt
self.prompt_docente = prompt
```

No comentar código obvio.

---

## 24. Uso de comentarios en HTML, CSS y JS

### HTML

Evitar comentarios largos dentro del HTML.

Permitido solo para separar bloques grandes si mejora la lectura.

### CSS

Usar comentarios para dividir secciones importantes.

Ejemplo:

```css
/* Chatbar IA */
.ia-assistant-chatbar {
    display: flex;
}
```

### JavaScript

Usar comentarios solo para explicar decisiones, no para repetir lo que hace el código.

---

## 25. Orden de carga recomendado para Studio

```text
common/js/namespace.js
common/js/utils.js
common/js/registry.js
common/components/*/*.definition.js

studio/js/state.js
studio/js/dom.js
studio/js/api.js
studio/js/messages.js
studio/js/renderer.js
studio/js/events.js

studio/widgets/*/*.js
studio/components/*/*_editor.js

studio/js/studio.js
```

`studio.js` debe cargarse al final.

---

## 26. Orden de carga recomendado para Student

```text
common/js/namespace.js
common/js/utils.js
common/js/registry.js
common/components/*/*.definition.js

student/js/state.js
student/js/dom.js
student/js/renderer.js
student/js/events.js
student/components/*/*_player.js

student/js/student.js
```

`student.js` debe cargarse al final.

---

## 27. Reglas de nombres

### Python

```text
snake_case.py
snake_case_function
PascalCaseClass
```

### JavaScript

```text
snake_case.js para archivos
camelCase para variables y funciones
PascalCase para objetos constructores si aplica
```

### CSS

```text
ia-assistant-bloque
ia-assistant-bloque__elemento
ia-assistant-bloque--modificador
```

Ejemplo:

```css
.ia-assistant-component-tabs {}
.ia-assistant-component-tabs__item {}
.ia-assistant-component-tabs__item--active {}
```

### HTML

Usar clases descriptivas con prefijo `ia-assistant-`.

---

## 28. Regla final

Antes de agregar una nueva función, archivo, componente o dependencia, preguntarse:

```text
¿Esto hace el plugin más claro, más estable o más mantenible?
```

Si la respuesta es no, no debe agregarse.
