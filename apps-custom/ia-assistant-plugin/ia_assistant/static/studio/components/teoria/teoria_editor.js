(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    function ensureMarkdownFormat(component) {
        if (!component.data || typeof component.data !== "object") {
            component.data = {};
        }

        component.data.formato = "markdown";
    }

    function updateDataField(component, fieldName, value) {
        var patch;

        ensureMarkdownFormat(component);
        component.data[fieldName] = value;
        patch = {
            titulo: component.data.titulo || "",
            formato: "markdown",
            contenido: component.data.contenido || ""
        };
        window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
    }

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function getTheoryRecommendations(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
        var recommendations = [];

        if (!String(componentData.titulo || "").trim()) {
            recommendations.push("Agrega un t\u00edtulo visible para la teor\u00eda.");
        }

        if (!String(componentData.contenido || "").trim()) {
            recommendations.push("Escribe el contenido te\u00f3rico en Markdown.");
        }

        return recommendations;
    }

    function renderTheoryStatus(statusRoot, component) {
        var recommendations = getTheoryRecommendations(component);
        var statusBox = document.createElement("section");
        var statusHeader = document.createElement("div");
        var statusTitle = createTextElement(
            "h4",
            "ia-assistant-teoria-editor__status-title",
            "Estado de la teor\u00eda"
        );
        var statusBadge = createTextElement(
            "span",
            "ia-assistant-teoria-editor__status-badge",
            "Requiere revisi\u00f3n"
        );
        var recommendationList;

        while (statusRoot.firstChild) {
            statusRoot.removeChild(statusRoot.firstChild);
        }

        if (!recommendations.length) {
            return;
        }

        statusBox.className = "ia-assistant-teoria-editor__status-box";
        statusHeader.className = "ia-assistant-teoria-editor__status-header";
        recommendationList = document.createElement("ul");
        recommendationList.className = "ia-assistant-teoria-editor__status-list-items";

        statusHeader.appendChild(statusTitle);
        statusHeader.appendChild(statusBadge);

        recommendations.forEach(function (recommendation) {
            recommendationList.appendChild(createTextElement(
                "li",
                "ia-assistant-teoria-editor__status-item",
                recommendation
            ));
        });

        statusBox.appendChild(statusHeader);
        statusBox.appendChild(recommendationList);
        statusRoot.appendChild(statusBox);
    }

    function createStatusSection(component) {
        var statusRoot = document.createElement("div");

        statusRoot.className = "ia-assistant-teoria-editor__status";
        renderTheoryStatus(statusRoot, component);

        return statusRoot;
    }

    function createEditorHeader() {
        var header = document.createElement("header");
        var heading = document.createElement("div");
        var title = document.createElement("h3");
        var badge = document.createElement("span");
        var description = document.createElement("p");

        header.className = "ia-assistant-teoria-editor__header";
        heading.className = "ia-assistant-teoria-editor__heading";
        title.className = "ia-assistant-teoria-editor__title";
        badge.className = "ia-assistant-teoria-editor__type-badge";
        description.className = "ia-assistant-teoria-editor__description";

        title.textContent = "Teor\u00eda";
        badge.textContent = "Markdown";
        description.textContent = "Crea contenido te\u00f3rico con formato Markdown simple.";

        heading.appendChild(title);
        heading.appendChild(badge);
        header.appendChild(heading);
        header.appendChild(description);

        return header;
    }

    function createTitleField(component, onStatusChange) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var input = document.createElement("input");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-teoria-editor__field";
        labelText.className = "ia-assistant-teoria-editor__label";
        labelText.textContent = "T\u00edtulo visible";
        help.className = "ia-assistant-teoria-editor__help";
        help.textContent = "Escribe el t\u00edtulo que ver\u00e1 el estudiante.";

        input.className = "ia-assistant-teoria-editor__input";
        input.name = "ia_assistant_teoria_titulo";
        input.type = "text";
        input.value = componentData.titulo || "";

        input.addEventListener("input", function () {
            updateDataField(component, "titulo", input.value);
            onStatusChange();
        });

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(input);

        return field;
    }

    function handleContentChange(component, markdown, onStatusChange) {
        updateDataField(component, "contenido", markdown);
        onStatusChange();
    }

    function createSimpleTextareaEditor(container, initialMarkdown, onChange) {
        var textarea = document.createElement("textarea");

        textarea.className = "ia-assistant-teoria-editor__textarea ia-assistant-teoria-editor__fallback";
        textarea.name = "ia_assistant_teoria_contenido";
        textarea.rows = 12;
        textarea.value = initialMarkdown || "";
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", "Contenido Markdown");
        textarea.addEventListener("input", function () {
            onChange(textarea.value);
        });

        container.appendChild(textarea);
    }

    function createContentEditor(editorContainer, componentData, onChange) {
        var toastAdapter = window.IAAssistant.Studio.TeoriaToastUIAdapter;
        var markdownEditor = window.IAAssistant.Studio.TeoriaMarkdownEditor;
        var initialMarkdown = componentData.contenido || "";

        if (toastAdapter && typeof toastAdapter.create === "function") {
            try {
                toastAdapter.create({
                    container: editorContainer,
                    initialMarkdown: initialMarkdown,
                    onChange: onChange
                });
                return;
            } catch (error) {
                while (editorContainer.firstChild) {
                    editorContainer.removeChild(editorContainer.firstChild);
                }
            }
        }

        if (markdownEditor && typeof markdownEditor.create === "function") {
            try {
                markdownEditor.create({
                    container: editorContainer,
                    initialMarkdown: initialMarkdown,
                    onChange: onChange
                });
                return;
            } catch (error) {
                while (editorContainer.firstChild) {
                    editorContainer.removeChild(editorContainer.firstChild);
                }
            }
        }

        createSimpleTextareaEditor(editorContainer, initialMarkdown, onChange);
    }

    function createContentField(component, onStatusChange) {
        var field = document.createElement("div");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var editorContainer = document.createElement("div");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-teoria-editor__field";
        labelText.className = "ia-assistant-teoria-editor__label";
        labelText.textContent = "Contenido Markdown";
        help.className = "ia-assistant-teoria-editor__help";
        help.textContent = "Redacta y previsualiza la teoria en Markdown con editor visual.";
        editorContainer.className = "ia-assistant-teoria-editor__toastui";

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(editorContainer);

        createContentEditor(editorContainer, componentData, function (markdown) {
            handleContentChange(component, markdown, onStatusChange);
        });

        return field;
    }

    window.IAAssistant.Studio.Components.TeoriaEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var statusRoot;

            function refreshStatus() {
                renderTheoryStatus(statusRoot, component);
            }

            ensureMarkdownFormat(component);

            editor.className = "ia-assistant-teoria-editor";
            statusRoot = createStatusSection(component);

            editor.appendChild(createEditorHeader());
            editor.appendChild(statusRoot);
            editor.appendChild(createTitleField(component, refreshStatus));
            editor.appendChild(createContentField(component, refreshStatus));

            container.appendChild(editor);
        }
    };
}());
