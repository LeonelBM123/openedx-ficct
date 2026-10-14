(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "pregunta_abierta",
        label: "Pregunta abierta",
        allowMultiple: true,
        authorable: true,
        reviewable: true,
        system: false,
        studentVisible: true,
        createDefaultData: function () {
            return {
                enunciado: "",
                rubrica: ""
            };
        }
    });
}());
