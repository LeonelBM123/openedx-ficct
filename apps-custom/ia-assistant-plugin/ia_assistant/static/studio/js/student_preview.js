(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var activePreview = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getPreviewRoot(previewElement) {
        var Student = window.IAAssistant.Student;

        if (!Student || !Student.Dom || !previewElement) {
            return null;
        }

        return Student.Dom.getRoot(previewElement);
    }

    function showPreviewError(previewElement, message) {
        var Student = window.IAAssistant.Student;
        var notice = Student && Student.Dom ? Student.Dom.getNotice(previewElement) : null;
        var container = Student && Student.Dom ?
            Student.Dom.getComponentsContainer(previewElement) :
            null;

        if (notice) {
            notice.textContent = message || "No se pudo mostrar la vista previa.";
            notice.hidden = false;
            notice.classList.add("ia-assistant-student__notice--warning");
        }

        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    }

    function clearPreviewNotice(previewElement) {
        var Student = window.IAAssistant.Student;
        var notice = Student && Student.Dom ? Student.Dom.getNotice(previewElement) : null;

        if (!notice) {
            return;
        }

        notice.textContent = "";
        notice.hidden = true;
        notice.className = "ia-assistant-student__notice";
    }

    function open(root) {
        var Dom = window.IAAssistant.Studio.Dom;
        var Student = window.IAAssistant.Student;
        var previewElement = Dom.getStudentPreview(root);
        var previewRoot = getPreviewRoot(previewElement);
        var unit;

        if (!previewElement || !previewRoot) {
            return;
        }

        activePreview = previewElement;
        previewElement.hidden = false;

        try {
            if (!Student || !Student.State || !Student.Renderer) {
                showPreviewError(previewRoot, "La vista previa de alumno no esta disponible.");
                return;
            }

            clearPreviewNotice(previewRoot);
            unit = clone(window.IAAssistant.Studio.State.getUnit());
            Student.State.loadUnit(unit);
            Student.Renderer.render(previewRoot);
        } catch (error) {
            if (window.console && window.console.warn) {
                window.console.warn("No se pudo renderizar la vista previa de alumno.", error);
            }

            showPreviewError(previewRoot, "No se pudo mostrar la vista previa de alumno.");
        }
    }

    function close() {
        if (!activePreview) {
            return;
        }

        activePreview.hidden = true;
        activePreview = null;
    }

    window.IAAssistant.Studio.StudentPreview = {
        open: open,
        close: close
    };
}());
