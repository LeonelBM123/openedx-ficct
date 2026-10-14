(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "quiz_multiple",
        label: "Quiz múltiple",
        allowMultiple: true,
        authorable: true,
        reviewable: true,
        system: false,
        studentVisible: true,
        createDefaultData: function () {
            return {
                pregunta: "",
                opciones: [],
                respuestas_correctas: []
            };
        },
        createDefaultOption: function (optionId) {
            return {
                id: optionId,
                texto: "",
                feedback: ""
            };
        }
    });
}());
