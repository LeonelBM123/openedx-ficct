(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};
    window.IAAssistant.Student.Components = window.IAAssistant.Student.Components || {};

    function createElement(tagName, className, text) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (typeof text === "string") {
            element.textContent = text;
        }

        return element;
    }

    function getToastEditor() {
        return window.toastui && window.toastui.Editor ? window.toastui.Editor : null;
    }

    function createToastViewer(container, markdown) {
        var ToastEditor = getToastEditor();

        if (!ToastEditor) {
            return null;
        }

        if (typeof ToastEditor.factory === "function") {
            return ToastEditor.factory({
                el: container,
                viewer: true,
                initialValue: markdown || ""
            });
        }

        if (typeof ToastEditor === "function") {
            return new ToastEditor({
                el: container,
                initialValue: markdown || ""
            });
        }

        return null;
    }

    function renderFallback(container, markdown, message) {
        var fallback = createElement("div", "ia-assistant-student-markdown-fallback");
        var notice = createElement("p", "ia-assistant-student-markdown-fallback__notice", message);
        var pre = createElement("pre", "ia-assistant-student-markdown-fallback__content");

        pre.textContent = markdown || "";
        fallback.appendChild(notice);
        fallback.appendChild(pre);
        container.appendChild(fallback);
    }

    function render(component, container) {
        var data = component.data || {};
        var title = data.titulo || "";
        var format = data.formato || "markdown";
        var markdown = typeof data.contenido === "string" ? data.contenido : "";
        var viewerContainer;

        if (title) {
            container.appendChild(createElement("h4", "ia-assistant-student-theory__title", title));
        }

        if (format !== "markdown") {
            renderFallback(container, markdown, "Formato de teoría no soportado para el alumno.");
            return;
        }

        viewerContainer = createElement("div", "ia-assistant-student-markdown");
        container.appendChild(viewerContainer);

        try {
            if (!createToastViewer(viewerContainer, markdown)) {
                container.removeChild(viewerContainer);
                renderFallback(container, markdown, "No se pudo cargar el visor Markdown avanzado.");
            }
        } catch (error) {
            if (window.console && window.console.warn) {
                window.console.warn("No se pudo renderizar teoría con Toast Viewer.", error);
            }

            if (viewerContainer.parentNode === container) {
                container.removeChild(viewerContainer);
            }

            renderFallback(container, markdown, "No se pudo renderizar el contenido Markdown.");
        }
    }

    window.IAAssistant.Student.Components.TeoriaPlayer = {
        render: render
    };
}());
