(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function createDetailRow(label, value) {
        var row = document.createElement("p");
        var labelElement = document.createElement("strong");

        row.className = "ia-assistant-component-editor__detail";
        labelElement.textContent = label + ": ";

        row.appendChild(labelElement);
        row.appendChild(document.createTextNode(value));

        return row;
    }

    function renderEmptyEditor(editorRoot) {
        var emptyState = document.createElement("div");

        emptyState.className = "ia-assistant-component-editor__empty";
        emptyState.appendChild(createTextElement(
            "p",
            "ia-assistant-component-editor__message",
            "Selecciona o añade un componente para comenzar."
        ));

        editorRoot.appendChild(emptyState);
    }

    function renderActiveEditor(editorRoot, component) {
        var placeholder = document.createElement("div");
        var details = document.createElement("div");

        placeholder.className = "ia-assistant-component-editor__placeholder";
        details.className = "ia-assistant-component-editor__details";

        placeholder.appendChild(createTextElement(
            "h3",
            "ia-assistant-component-editor__title",
            "Componente activo"
        ));

        details.appendChild(createDetailRow("Nombre", component.nombre || component.id));
        details.appendChild(createDetailRow("ID", component.id));
        details.appendChild(createDetailRow("Tipo", component.tipo));

        placeholder.appendChild(details);
        placeholder.appendChild(createTextElement(
            "p",
            "ia-assistant-component-editor__message",
            "Aquí se editará este componente."
        ));

        editorRoot.appendChild(placeholder);
    }

    function renderComponentEditor(editorRoot, component) {
        var teoriaEditor = window.IAAssistant.Studio.Components &&
            window.IAAssistant.Studio.Components.TeoriaEditor;
        var quizMultipleEditor = window.IAAssistant.Studio.Components &&
            window.IAAssistant.Studio.Components.QuizMultipleEditor;
        var preguntaAbiertaEditor = window.IAAssistant.Studio.Components &&
            window.IAAssistant.Studio.Components.PreguntaAbiertaEditor;
        var codigoEditor = window.IAAssistant.Studio.Components &&
            window.IAAssistant.Studio.Components.CodigoEditor;

        if (
            component.tipo === "teoria" &&
            teoriaEditor &&
            typeof teoriaEditor.render === "function"
        ) {
            teoriaEditor.render(editorRoot, component);
            return;
        }

        if (
            component.tipo === "quiz_multiple" &&
            quizMultipleEditor &&
            typeof quizMultipleEditor.render === "function"
        ) {
            quizMultipleEditor.render(editorRoot, component);
            return;
        }

        if (
            component.tipo === "pregunta_abierta" &&
            preguntaAbiertaEditor &&
            typeof preguntaAbiertaEditor.render === "function"
        ) {
            preguntaAbiertaEditor.render(editorRoot, component);
            return;
        }

        if (
            component.tipo === "codigo" &&
            codigoEditor &&
            typeof codigoEditor.render === "function"
        ) {
            codigoEditor.render(editorRoot, component);
            return;
        }

        renderActiveEditor(editorRoot, component);
    }

    function renderUnitScoreSummary(root) {
        var scoreSummary = window.IAAssistant.Studio.Dom.getUnitScoreSummary(root);
        var totalScore = window.IAAssistant.Studio.State.getUnitTotalScore();

        if (!scoreSummary) {
            return;
        }

        scoreSummary.textContent =
            "Puntaje total de la unidad: " + String(totalScore);
    }

    window.IAAssistant.Studio.Renderer = {
        renderUnitScoreSummary: function (root) {
            renderUnitScoreSummary(root || window.IAAssistant.Studio.Dom.getRoot());
        },

        render: function () {
            var root = window.IAAssistant.Studio.Dom.getRoot();
            var editorRoot;
            var activeComponent;

            if (!root) {
                return;
            }

            window.IAAssistant.Studio.ComponentTabs.render(root);
            renderUnitScoreSummary(root);

            editorRoot = window.IAAssistant.Studio.Dom.getComponentEditor(root);

            if (!editorRoot) {
                return;
            }

            activeComponent = window.IAAssistant.Studio.State.getActiveComponent();

            clearElement(editorRoot);

            if (!activeComponent) {
                renderEmptyEditor(editorRoot);
                return;
            }

            renderComponentEditor(editorRoot, activeComponent);
        }
    };
}());
