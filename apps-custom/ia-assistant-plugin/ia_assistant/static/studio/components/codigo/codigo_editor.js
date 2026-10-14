(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

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

    function updateDataField(component, fieldName, value) {
        var patch = {};

        component.data[fieldName] = value;
        patch[fieldName] = value;
        window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
    }

    function getCodigoBaseApi() {
        return window.IAAssistant.Studio.Components.CodigoBase || null;
    }

    function hasCodeBaseContent(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        return Boolean(String(componentData.codigo_base || "").trim());
    }

    function getCodeRecommendations(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
        var recommendations = [];

        if (!String(componentData.enunciado || "").trim()) {
            recommendations.push("Escribe el enunciado del ejercicio.");
        }

        if (!String(componentData.lenguaje || "").trim()) {
            recommendations.push("Selecciona un lenguaje de programaci\u00f3n.");
        }

        if (!String(componentData.instrucciones || "").trim()) {
            recommendations.push("Inserta una instrucci\u00f3n para el estudiante.");
        }

        return recommendations;
    }

    function renderCodeStatus(statusRoot, component) {
        var recommendations = getCodeRecommendations(component);
        var statusBox = document.createElement("section");
        var statusHeader = document.createElement("div");
        var statusTitle = document.createElement("h4");
        var statusBadge = document.createElement("span");
        var recommendationList;

        while (statusRoot.firstChild) {
            statusRoot.removeChild(statusRoot.firstChild);
        }

        if (!recommendations.length) {
            return;
        }

        statusBox.className = "ia-assistant-codigo-editor__status-box";
        statusHeader.className = "ia-assistant-codigo-editor__status-header";
        statusTitle.className = "ia-assistant-codigo-editor__status-title";
        statusBadge.className = "ia-assistant-codigo-editor__status-badge";
        statusTitle.textContent = "Estado del c\u00f3digo";
        statusBadge.textContent = "Requiere revisi\u00f3n";

        recommendationList = document.createElement("ul");
        recommendationList.className = "ia-assistant-codigo-editor__status-list-items";

        recommendations.forEach(function (recommendation) {
            var item = document.createElement("li");

            item.className = "ia-assistant-codigo-editor__status-item";
            item.textContent = recommendation;
            recommendationList.appendChild(item);
        });

        statusHeader.appendChild(statusTitle);
        statusHeader.appendChild(statusBadge);
        statusBox.appendChild(statusHeader);
        statusBox.appendChild(recommendationList);
        statusRoot.appendChild(statusBox);
    }

    function createCodeStatusSection(component) {
        var statusRoot = document.createElement("div");

        statusRoot.className = "ia-assistant-codigo-editor__status";
        renderCodeStatus(statusRoot, component);

        return statusRoot;
    }

    function createScoreField(component) {
        var field = document.createElement("div");
        var labelText = document.createElement("span");
        var controls = document.createElement("div");
        var input = document.createElement("input");
        var suffix = document.createElement("span");
        var help = document.createElement("p");

        field.className = "ia-assistant-codigo-editor__field ia-assistant-score-field";
        labelText.className = "ia-assistant-score-field__label";
        labelText.textContent = "Puntaje maximo";
        controls.className = "ia-assistant-score-field__controls";
        help.className = "ia-assistant-score-field__help";
        help.textContent = "Puntaje maximo de este ejercicio de codigo.";
        suffix.className = "ia-assistant-score-field__suffix";
        suffix.textContent = "pts";

        input.className = "ia-assistant-score-field__input";
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.inputMode = "numeric";
        input.name = "ia_assistant_codigo_puntaje";
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

    function getLineIndentation(value, cursorPosition) {
        var lineStart = value.lastIndexOf("\n", cursorPosition - 1) + 1;
        var lineText = value.slice(lineStart, cursorPosition);
        var match = lineText.match(/^[ \t]*/);

        return match ? match[0] : "";
    }

    function replaceTextareaSelection(textarea, replacement) {
        var selectionStart = textarea.selectionStart;
        var selectionEnd = textarea.selectionEnd;

        textarea.setRangeText(replacement, selectionStart, selectionEnd, "end");
    }

    function handleCodeEditorKeydown(event, textarea, component, onStatusChange) {
        var indentation;

        if (event.key === "Tab") {
            event.preventDefault();
            replaceTextareaSelection(textarea, "    ");
            updateDataField(component, "codigo_base", textarea.value);
            onStatusChange();
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            indentation = getLineIndentation(textarea.value, textarea.selectionStart);
            replaceTextareaSelection(textarea, "\n" + indentation);
            updateDataField(component, "codigo_base", textarea.value);
            onStatusChange();
        }
    }

    function createEditorHeader() {
        var header = document.createElement("header");
        var heading = document.createElement("div");
        var title = document.createElement("h3");
        var badge = document.createElement("span");
        var description = document.createElement("p");

        header.className = "ia-assistant-codigo-editor__header";
        heading.className = "ia-assistant-codigo-editor__heading";
        title.className = "ia-assistant-codigo-editor__title";
        badge.className = "ia-assistant-codigo-editor__type-badge";
        description.className = "ia-assistant-codigo-editor__description";

        title.textContent = "C\u00f3digo";
        badge.textContent = "C\u00f3digo";
        description.textContent = "Crea un ejercicio de programaci\u00f3n con enunciado, lenguaje, c\u00f3digo base e instrucciones.";

        heading.appendChild(title);
        heading.appendChild(badge);
        header.appendChild(heading);
        header.appendChild(description);

        return header;
    }

    function replaceCodeBase(component, textarea, template) {
        updateDataField(component, "codigo_base", template);

        if (textarea) {
            textarea.value = template;
        }
    }

    function getTemplateForLanguage(languageValue) {
        var codigoBaseApi = getCodigoBaseApi();

        if (!codigoBaseApi || typeof codigoBaseApi.hasTemplate !== "function" ||
                typeof codigoBaseApi.getTemplate !== "function" ||
                !codigoBaseApi.hasTemplate(languageValue)) {
            return "";
        }

        return codigoBaseApi.getTemplate(languageValue);
    }

    function getLanguageLabel(languages, languageValue) {
        var selectedLanguage = languages.filter(function (language) {
            return language.value === languageValue;
        })[0];

        return selectedLanguage ? selectedLanguage.label : "Selecciona un lenguaje";
    }

    function applyTemplateIfCodeBaseEmpty(component, textarea, languageValue) {
        var template = getTemplateForLanguage(languageValue);

        if (!template || hasCodeBaseContent(component)) {
            return;
        }

        replaceCodeBase(component, textarea, template);
    }

    function replaceTemplateWithConfirmation(component, textarea, languageValue) {
        var confirmModal = window.IAAssistant.Studio.ConfirmModal;
        var template = getTemplateForLanguage(languageValue);

        if (!languageValue || !template) {
            return;
        }

        if (!hasCodeBaseContent(component)) {
            replaceCodeBase(component, textarea, template);
            return;
        }

        if (!confirmModal || typeof confirmModal.confirm !== "function") {
            if (window.console && typeof window.console.warn === "function") {
                window.console.warn("ConfirmModal no esta disponible. No se reemplazo el codigo base.");
            }
            return;
        }

        confirmModal.confirm({
            title: "Reemplazar c\u00f3digo base",
            message: "\u00bfSeguro que deseas reemplazar el c\u00f3digo base actual por la plantilla m\u00ednima del lenguaje seleccionado?",
            confirmText: "Reemplazar",
            cancelText: "Cancelar",
            variant: "danger",
            onConfirm: function () {
                replaceCodeBase(component, textarea, template);
            }
        });
    }

    function createLanguageField(component, codeTextareaReference, onStatusChange) {
        var field = document.createElement("div");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var controls = document.createElement("div");
        var dropdown = document.createElement("div");
        var triggerButton = document.createElement("button");
        var triggerLabel = document.createElement("span");
        var triggerMarker = document.createElement("span");
        var menu = document.createElement("div");
        var templateButton = document.createElement("button");
        var codigoBaseApi = getCodigoBaseApi();
        var languages = codigoBaseApi && typeof codigoBaseApi.getLanguages === "function" ?
            codigoBaseApi.getLanguages() :
            [];
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-codigo-editor__field";
        labelText.className = "ia-assistant-codigo-editor__label";
        labelText.textContent = "Lenguaje";
        help.className = "ia-assistant-codigo-editor__help";
        help.textContent = "Selecciona el lenguaje que usar\u00e1 el estudiante.";

        controls.className = "ia-assistant-codigo-editor__language-controls";
        dropdown.className = "ia-assistant-codigo-editor__language-picker";
        triggerButton.className = "ia-assistant-codigo-editor__language-trigger";
        triggerButton.type = "button";
        triggerButton.setAttribute("aria-haspopup", "listbox");
        triggerButton.setAttribute("aria-expanded", "false");
        triggerLabel.className = "ia-assistant-codigo-editor__language-trigger-label";
        triggerLabel.textContent = getLanguageLabel(languages, componentData.lenguaje || "");
        triggerMarker.className = "ia-assistant-codigo-editor__language-trigger-marker";
        triggerMarker.setAttribute("aria-hidden", "true");
        triggerMarker.textContent = "v";
        menu.className = "ia-assistant-codigo-editor__language-menu";
        menu.setAttribute("role", "listbox");
        menu.hidden = true;

        function closeMenu() {
            menu.hidden = true;
            triggerButton.setAttribute("aria-expanded", "false");
        }

        function selectLanguage(language) {
            updateDataField(component, "lenguaje", language.value);
            triggerLabel.textContent = language.label;
            Array.prototype.forEach.call(menu.children, function (option) {
                option.setAttribute("aria-selected", option.dataset.languageValue === language.value ? "true" : "false");
            });
            applyTemplateIfCodeBaseEmpty(component, codeTextareaReference.textarea, language.value);
            onStatusChange();
            closeMenu();
        }

        languages.forEach(function (language) {
            var option = document.createElement("button");
            var optionLabel = document.createElement("span");
            var optionBadge = document.createElement("span");

            option.className = "ia-assistant-codigo-editor__language-option";
            option.type = "button";
            option.dataset.languageValue = language.value;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", language.value === componentData.lenguaje ? "true" : "false");
            optionLabel.className = "ia-assistant-codigo-editor__language-option-label";
            optionLabel.textContent = language.label;
            optionBadge.className = "ia-assistant-codigo-editor__language-option-badge";
            optionBadge.textContent = language.value;

            option.appendChild(optionLabel);
            option.appendChild(optionBadge);
            option.addEventListener("click", function () {
                selectLanguage(language);
            });

            menu.appendChild(option);
        });

        triggerButton.appendChild(triggerLabel);
        triggerButton.appendChild(triggerMarker);
        triggerButton.addEventListener("click", function () {
            menu.hidden = !menu.hidden;
            triggerButton.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        });

        document.addEventListener("click", function (event) {
            if (menu.hidden || dropdown.contains(event.target)) {
                return;
            }

            closeMenu();
        });

        templateButton.className = "ia-assistant-codigo-editor__template-button";
        templateButton.type = "button";
        templateButton.textContent = "Usar plantilla m\u00ednima";
        templateButton.addEventListener("click", function () {
            replaceTemplateWithConfirmation(
                component,
                codeTextareaReference.textarea,
                component.data.lenguaje || ""
            );
        });

        dropdown.appendChild(triggerButton);
        dropdown.appendChild(menu);
        controls.appendChild(dropdown);
        controls.appendChild(templateButton);
        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(controls);

        return field;
    }

    function createTextareaField(component, fieldName, label, helpText, rows, modifierClass, onStatusChange, codeTextareaReference) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-codigo-editor__field";
        labelText.className = "ia-assistant-codigo-editor__label";
        labelText.textContent = label;
        help.className = "ia-assistant-codigo-editor__help";
        help.textContent = helpText;

        textarea.className = "ia-assistant-codigo-editor__textarea";
        if (modifierClass) {
            textarea.className += " " + modifierClass;
        }
        textarea.name = "ia_assistant_codigo_" + fieldName;
        textarea.rows = rows;
        textarea.value = componentData[fieldName] || "";

        if (fieldName === "codigo_base") {
            textarea.spellcheck = false;
            textarea.autocomplete = "off";
            textarea.setAttribute("autocapitalize", "off");
            textarea.setAttribute("autocorrect", "off");
            textarea.setAttribute("aria-label", "C\u00f3digo base");
            if (codeTextareaReference) {
                codeTextareaReference.textarea = textarea;
            }
            textarea.addEventListener("keydown", function (event) {
                handleCodeEditorKeydown(event, textarea, component, onStatusChange);
            });
        }

        textarea.addEventListener("input", function () {
            updateDataField(component, fieldName, textarea.value);
            onStatusChange();
        });

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.CodigoEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var statusRoot;
            var codeTextareaReference = {
                textarea: null
            };

            function refreshStatus() {
                renderCodeStatus(statusRoot, component);
            }

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            editor.className = "ia-assistant-codigo-editor";
            statusRoot = createCodeStatusSection(component);

            editor.appendChild(createEditorHeader());
            editor.appendChild(statusRoot);
            editor.appendChild(createScoreField(component));
            editor.appendChild(createTextareaField(
                component,
                "enunciado",
                "Enunciado",
                "Escribe la consigna o problema que resolver\u00e1 el estudiante.",
                4,
                null,
                refreshStatus
            ));
            editor.appendChild(createLanguageField(component, codeTextareaReference, refreshStatus));
            editor.appendChild(createTextareaField(
                component,
                "codigo_base",
                "C\u00f3digo base",
                "Incluye una base opcional para que el estudiante empiece.",
                8,
                "ia-assistant-codigo-editor__textarea--code",
                refreshStatus,
                codeTextareaReference
            ));
            editor.appendChild(createTextareaField(
                component,
                "instrucciones",
                "Instrucciones",
                "Describe qu\u00e9 debe hacer, entregar o comprobar el estudiante.",
                5,
                null,
                refreshStatus
            ));

            container.appendChild(editor);
        }
    };
}());
