(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function getComponentScore(component) {
        if (
            component &&
            typeof component.puntaje === "number" &&
            Number.isInteger(component.puntaje) &&
            component.puntaje >= 0
        ) {
            return component.puntaje;
        }

        return 0;
    }

    function refreshUnitScoreSummary() {
        var renderer = window.IAAssistant.Studio.Renderer;

        if (renderer && typeof renderer.renderUnitScoreSummary === "function") {
            renderer.renderUnitScoreSummary();
        }
    }

    function persistComponentScore(component, value) {
        var normalizedScore = 0;

        if (/^\d+$/.test(String(value || "").trim())) {
            normalizedScore = parseInt(value, 10);
        }

        component.puntaje = normalizedScore;
        window.IAAssistant.Studio.State.updateComponentMeta(component.id, {
            puntaje: normalizedScore
        });
        refreshUnitScoreSummary();

        return normalizedScore;
    }

    function createEditorHeader() {
        var header = document.createElement("header");
        var heading = document.createElement("div");
        var title = document.createElement("h3");
        var badge = document.createElement("span");
        var description = document.createElement("p");

        header.className = "ia-assistant-pregunta-abierta-editor__header";
        heading.className = "ia-assistant-pregunta-abierta-editor__heading";
        title.className = "ia-assistant-component-editor__title";
        badge.className = "ia-assistant-pregunta-abierta-editor__type-badge";
        description.className = "ia-assistant-pregunta-abierta-editor__description";

        title.textContent = "Pregunta abierta";
        badge.textContent = "Abierta";
        description.textContent = "Crea una respuesta abierta que pueda revisarse con una r\u00fabrica.";

        heading.appendChild(title);
        heading.appendChild(badge);
        header.appendChild(heading);
        header.appendChild(description);

        return header;
    }

    function getValidationMessages(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
        var messages = [];

        if (!String(componentData.enunciado || "").trim()) {
            messages.push("Completa el enunciado de la pregunta.");
        }

        if (!String(componentData.rubrica || "").trim()) {
            messages.push("Agrega una r\u00fabrica para orientar la revisi\u00f3n.");
        }

        return messages;
    }

    function renderStatus(statusRoot, component) {
        var messages = getValidationMessages(component);
        var statusBox;
        var statusHeader;
        var statusTitle;
        var statusBadge;
        var messageList;

        while (statusRoot.firstChild) {
            statusRoot.removeChild(statusRoot.firstChild);
        }

        if (!messages.length) {
            return;
        }

        statusBox = document.createElement("section");
        statusHeader = document.createElement("div");
        statusTitle = createTextElement(
            "h4",
            "ia-assistant-pregunta-abierta-editor__status-title",
            "Estado de la pregunta"
        );
        statusBadge = createTextElement(
            "span",
            "ia-assistant-pregunta-abierta-editor__status-badge",
            "Requiere revisi\u00f3n"
        );
        messageList = document.createElement("ul");

        statusBox.className = "ia-assistant-pregunta-abierta-editor__status-box";
        statusHeader.className = "ia-assistant-pregunta-abierta-editor__status-header";
        messageList.className = "ia-assistant-pregunta-abierta-editor__status-list-items";

        messages.forEach(function (message) {
            var messageItem = createTextElement(
                "li",
                "ia-assistant-pregunta-abierta-editor__status-item",
                message
            );

            messageList.appendChild(messageItem);
        });

        statusHeader.appendChild(statusTitle);
        statusHeader.appendChild(statusBadge);
        statusBox.appendChild(statusHeader);
        statusBox.appendChild(messageList);
        statusRoot.appendChild(statusBox);
    }

    function createScoreField(component) {
        var field = document.createElement("div");
        var labelText = document.createElement("span");
        var controls = document.createElement("div");
        var input = document.createElement("input");
        var suffix = document.createElement("span");
        var help = document.createElement("p");

        field.className = "ia-assistant-pregunta-abierta-editor__field ia-assistant-score-field";
        labelText.className = "ia-assistant-score-field__label";
        labelText.textContent = "Puntaje maximo";
        controls.className = "ia-assistant-score-field__controls";
        help.className = "ia-assistant-score-field__help";
        help.textContent = "Puntaje maximo de esta pregunta abierta.";
        suffix.className = "ia-assistant-score-field__suffix";
        suffix.textContent = "pts";

        input.className = "ia-assistant-score-field__input";
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.inputMode = "numeric";
        input.name = "ia_assistant_pregunta_abierta_puntaje";
        input.value = String(getComponentScore(component));
        input.addEventListener("input", function () {
            var rawValue = String(input.value || "").trim();

            if (!rawValue || /^\d+$/.test(rawValue)) {
                persistComponentScore(component, rawValue);
            }
        });
        input.addEventListener("change", function () {
            input.value = String(persistComponentScore(component, input.value));
        });

        field.appendChild(labelText);
        controls.appendChild(input);
        controls.appendChild(suffix);
        field.appendChild(controls);
        field.appendChild(help);

        return field;
    }

    function createTextareaField(component, fieldName, label, helpText, rows, onStatusChange) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-pregunta-abierta-editor__field";
        if (fieldName === "rubrica") {
            field.className += " ia-assistant-pregunta-abierta-editor__field--support";
        }

        labelText.className = "ia-assistant-pregunta-abierta-editor__label";
        labelText.textContent = label;
        help.className = "ia-assistant-pregunta-abierta-editor__help";
        help.textContent = helpText;

        textarea.className = "ia-assistant-pregunta-abierta-editor__textarea";
        if (fieldName === "rubrica") {
            textarea.className += " ia-assistant-pregunta-abierta-editor__textarea--support";
        }

        textarea.name = "ia_assistant_pregunta_abierta_" + fieldName;
        textarea.rows = rows;
        textarea.value = componentData[fieldName] || "";

        textarea.addEventListener("input", function () {
            var patch = {};

            patch[fieldName] = textarea.value;
            component.data[fieldName] = textarea.value;
            window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
            onStatusChange();
        });

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.PreguntaAbiertaEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var statusRoot = document.createElement("div");

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            editor.className = "ia-assistant-pregunta-abierta-editor";
            statusRoot.className = "ia-assistant-pregunta-abierta-editor__status-list";

            editor.appendChild(createEditorHeader());
            editor.appendChild(statusRoot);
            editor.appendChild(createScoreField(component));
            editor.appendChild(createTextareaField(
                component,
                "enunciado",
                "Enunciado",
                "Escribe la consigna que responder\u00e1 el estudiante.",
                5,
                function () {
                    renderStatus(statusRoot, component);
                }
            ));
            editor.appendChild(createTextareaField(
                component,
                "rubrica",
                "R\u00fabrica de evaluaci\u00f3n",
                "Describe los criterios que se usar\u00e1n para revisar la respuesta.",
                4,
                function () {
                    renderStatus(statusRoot, component);
                }
            ));
            renderStatus(statusRoot, component);

            container.appendChild(editor);
        }
    };
}());
