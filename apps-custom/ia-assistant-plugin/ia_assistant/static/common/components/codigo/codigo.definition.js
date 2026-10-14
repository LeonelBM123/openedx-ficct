(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "codigo",
        label: "Código",
        allowMultiple: true,
        authorable: true,
        reviewable: true,
        system: false,
        studentVisible: true,
        createDefaultData: function () {
            return {
                enunciado: "",
                lenguaje: "",
                codigo_base: "",
                instrucciones: ""
            };
        }
    });
}());
