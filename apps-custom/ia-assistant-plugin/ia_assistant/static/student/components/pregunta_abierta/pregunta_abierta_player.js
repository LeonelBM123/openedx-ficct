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

    function render(component, container) {
        var data = component.data || {};
        var wrapper = createElement("section", "ia-assistant-student-open-question");
        var prompt = createElement(
            "p",
            "ia-assistant-student-open-question__prompt",
            data.enunciado || "Pregunta abierta sin enunciado."
        );
        var textarea = document.createElement("textarea");

        textarea.className = "ia-assistant-student-open-question__textarea";
        textarea.placeholder = "Escribe tu respuesta aqui...";
        textarea.rows = 6;
        textarea.setAttribute("aria-label", "Respuesta de pregunta abierta");

        wrapper.appendChild(prompt);
        wrapper.appendChild(textarea);
        wrapper.appendChild(createElement(
            "p",
            "ia-assistant-student-open-question__note",
            "Tu respuesta se guarda automáticamente."
        ));

        // prefill if frontend answer exists
        try {
            var existing = window.IAAssistant.Student.Answers && window.IAAssistant.Student.Answers.getAnswer(component.id);
            if (existing && typeof existing.value === 'string') {
                textarea.value = existing.value;
            }
        } catch (e) {}

        // save on input locally
        textarea.addEventListener('input', function () {
            if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                window.IAAssistant.Student.Answers.setAnswer(component.id, {
                    componentId: component.id,
                    tipo: 'pregunta_abierta',
                    value: textarea.value,
                    metadata: {}
                });
            }
        });

        container.appendChild(wrapper);
    }

    window.IAAssistant.Student.Components.PreguntaAbiertaPlayer = {
        render: render
    };
}());
