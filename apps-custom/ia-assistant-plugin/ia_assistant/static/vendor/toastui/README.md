# TOAST UI Editor vendor local

Esta carpeta contiene los archivos locales de TOAST UI Editor que carga el XBlock.

## Estado actual

Studio teoria usa TOAST UI Editor mediante `TeoriaToastUIAdapter`.

La integracion activa carga el bundle standalone local:

```text
toastui-editor-all.min.js
toastui-editor.min.css
```

La integracion debe usar estas rutas:

```text
ia_assistant/static/vendor/toastui/toastui-editor-all.min.js
ia_assistant/static/vendor/toastui/toastui-editor.min.css
```

Tambien se carga:

```text
studio/components/teoria/teoria_toastui_adapter.js
```

## Fallbacks conservados

Se conservan los fallbacks artesanales de teoria:

```text
common/js/markdown_basic.js
studio/components/teoria/teoria_markdown_editor.js
```

## Nota historica

Los archivos `toastui-editor.js` y `toastui-editor.css` generados desde `npm pack` no expusieron `window.toastui.Editor` en Studio; `window.toastui` quedaba como `{}`. Por eso se usa el bundle standalone local `toastui-editor-all.min.js`.

## Origen

Los archivos salen del paquete `@toast-ui/editor`, carpeta `dist/`.

No se debe usar CDN ni `import/export` en runtime. El XBlock debe cargar estos archivos estaticos empaquetados con el plugin.

No se debe usar `npm`, CDN ni script tags manuales en runtime.

## Politica actual de Markdown

Features aceptadas por ahora:

- parrafo
- H1-H6
- negrita
- cursiva
- tachado
- separador
- cita
- lista con vinetas
- lista numerada
- checklist
- tabla
- link
- codigo inline
- bloque de codigo

Features bloqueadas por ahora:

- imagenes
- uploads/attachments
- embeds externos

Normalizacion aplicada:

- `<br>` fuera de code fence se convierte a salto de linea.
- imagenes Markdown fuera de code fence se reemplazan por texto seguro.
- `<img>` fuera de code fence se reemplaza por texto seguro.
- no hay sanitizador HTML completo todavia.

Pendiente:

- definir tratamiento completo de HTML crudo.
- preparar Student para renderizar Markdown compatible con Toast UI.
- decidir cuando retirar el fallback artesanal.

## Por que vendor local

Open edX/XBlock carga recursos desde el paquete instalado. Usar vendor local evita:

- problemas de CSP;
- fallas de red o CDN;
- cambios externos no controlados;
- errores donde `window.toastui` queda `undefined` por carga externa fallida.

## Que no hacer

- No usar `<script src="https://...">`.
- No usar script tags manuales para cargar Toast.
- No usar `import Editor from "@toast-ui/editor"` en runtime.
- No depender de `npm` en runtime.
- No crear archivos falsos con nombres distintos a los archivos reales.
- No registrar en el manifest rutas que no existan en esta carpeta.
- No asumir que `window.toastui` existe sin verificarlo antes.
- Mantener fallback si Toast no carga.
- No reemplazar ni retirar fallbacks sin validacion previa.
