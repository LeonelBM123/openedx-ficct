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

    function getOptionId(option, index) {
        return String(option.id || "opcion_" + String(index + 1));
    }

    function getSafeFieldId(value) {
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function getSelectedOptionIdsFromForm(form, groupName) {
        var selected = [];
        var selector = 'input[name="' + groupName + '"]:checked';
        var inputs = form.querySelectorAll(selector);

        Array.prototype.forEach.call(inputs, function (input) {
            selected.push(String(input.value));
        });

        return selected;
    }

    function getStoredSelection(componentId) {
        try {
            var Answers = window.IAAssistant.Student.Answers;
            var existing = Answers && Answers.getAnswer
                ? Answers.getAnswer(componentId)
                : null;

            if (!existing) {
                return [];
            }

            if (Array.isArray(existing.value)) {
                return existing.value.map(function (value) {
                    return String(value);
                });
            }

            if (
                typeof existing.value === "undefined" ||
                existing.value === null ||
                existing.value === ""
            ) {
                return [];
            }

            return [String(existing.value)];
        } catch (error) {
            return [];
        }
    }

    function persistSelection(componentId, selectedIds) {
        var Answers = window.IAAssistant.Student.Answers;

        if (!Answers || typeof Answers.setAnswer !== "function") {
            return;
        }

        Answers.setAnswer(componentId, {
            componentId: componentId,
            tipo: "quiz_multiple",
            value: selectedIds.length <= 1 ? (selectedIds[0] || "") : selectedIds,
            metadata: {},
        });
    }

    function updateSavedState(messageElement, selectedIds) {
        var hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;

        messageElement.className = "ia-assistant-student-quiz__saved";
        messageElement.classList.add(
            hasSelection
                ? "ia-assistant-student-quiz__saved--ok"
                : "ia-assistant-student-quiz__saved--idle",
        );
        messageElement.textContent = hasSelection
            ? "Respuesta guardada automáticamente. Revisa el resultado final en Revision."
            : "Selecciona una respuesta. Tu elección se guardará automáticamente.";
    }

    function renderOption(option, inputType, groupName, index, componentId, selectedIds) {
        var optionId = getOptionId(option, index);
        var fieldId = groupName + "_" + getSafeFieldId(optionId);
        var label = createElement("label", "ia-assistant-student-quiz__option");
        var input = document.createElement("input");
        var text = createElement("span", "ia-assistant-student-quiz__option-text");

        input.type = inputType;
        input.name = groupName;
        input.value = optionId;
        input.id = fieldId;
        input.checked = selectedIds.indexOf(optionId) >= 0;

        text.textContent = option.texto || "Opcion sin texto.";

        label.setAttribute("for", fieldId);
        label.appendChild(input);
        label.appendChild(text);

        return label;
    }

    function render(component, container) {
        var data = component.data || {};
        var question = data.pregunta || "";
        var options = Array.isArray(data.opciones) ? data.opciones : [];
        var correctIds = Array.isArray(data.respuestas_correctas)
            ? data.respuestas_correctas
            : [];
        var selectedIds = getStoredSelection(component.id);
        var inputType = correctIds.length > 1 ? "checkbox" : "radio";
        var quiz = createElement("section", "ia-assistant-student-quiz");
        var questionElement = createElement(
            "p",
            "ia-assistant-student-quiz__question",
            question || "Pregunta sin enunciado.",
        );
        var form = createElement("form", "ia-assistant-student-quiz__form");
        var optionsContainer = createElement("div", "ia-assistant-student-quiz__options");
        var savedState = createElement("p", "ia-assistant-student-quiz__saved");
        var helper = createElement(
            "p",
            "ia-assistant-student-quiz__helper",
            "El quiz registra tu selección. El resultado final y el feedback se muestran en Revision.",
        );
        var groupName = "ia_assistant_quiz_" + getSafeFieldId(component.id || String(Date.now()));

        form.addEventListener("submit", function (event) {
            event.preventDefault();
        });

        if (!options.length) {
            quiz.appendChild(questionElement);
            quiz.appendChild(createElement(
                "p",
                "ia-assistant-student-quiz__empty",
                "Este quiz no tiene opciones configuradas.",
            ));
            container.appendChild(quiz);
            return;
        }

        options.forEach(function (option, index) {
            optionsContainer.appendChild(
                renderOption(
                    option || {},
                    inputType,
                    groupName,
                    index,
                    component.id,
                    selectedIds,
                ),
            );
        });

        form.addEventListener("change", function () {
            var selection = getSelectedOptionIdsFromForm(form, groupName);
            persistSelection(component.id, selection);
            updateSavedState(savedState, selection);
        });

        updateSavedState(savedState, selectedIds);

        form.appendChild(optionsContainer);
        form.appendChild(savedState);
        quiz.appendChild(questionElement);
        quiz.appendChild(helper);
        quiz.appendChild(form);
        container.appendChild(quiz);
    }

    window.IAAssistant.Student.Components.QuizMultiplePlayer = {
        render: render,
    };
}());
