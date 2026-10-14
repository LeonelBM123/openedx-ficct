(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "revision",
        label: "Revisión",
        allowMultiple: false,
        authorable: false,
        reviewable: false,
        system: true,
        studentVisible: true,
        createDefaultData: function () {
            return {
                instrucciones: "",
                criterios: []
            };
        }
    });
}());
