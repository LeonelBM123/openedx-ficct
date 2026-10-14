(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "teoria",
        label: "Teoría",
        allowMultiple: true,
        authorable: true,
        reviewable: false,
        system: false,
        studentVisible: true,
        createDefaultData: function () {
            return {
                titulo: "",
                formato: "markdown",
                contenido: ""
            };
        }
    });
}());
