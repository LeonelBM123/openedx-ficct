(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function getRootFromElement(element) {
        var currentElement = element;

        if (currentElement && currentElement.jquery) {
            currentElement = currentElement[0];
        }

        if (
            currentElement &&
            currentElement.matches &&
            currentElement.matches(".ia-assistant-studio")
        ) {
            return currentElement;
        }

        if (currentElement && currentElement.querySelector) {
            return currentElement.querySelector(".ia-assistant-studio");
        }

        return window.IAAssistant.Studio.Dom.getRoot();
    }

    window.IAAssistantStudio = function (runtime, element, initArgs) {
        var settings = initArgs || {};
        var root = getRootFromElement(element);
        var saveUrl = "";
        var generateTeacherUnitUrl = "";
        var generateTeacherComponentCreateUrl = "";
        var generateTeacherComponentEditUrl = "";

        if (
            runtime &&
            typeof runtime.handlerUrl === "function"
        ) {
            saveUrl = runtime.handlerUrl(element, "save_unit");
            generateTeacherUnitUrl = runtime.handlerUrl(
                element,
                "generate_teacher_unit"
            );
            generateTeacherComponentCreateUrl = runtime.handlerUrl(
                element,
                "generate_teacher_component_create"
            );
            generateTeacherComponentEditUrl = runtime.handlerUrl(
                element,
                "generate_teacher_component_edit"
            );
        }

        window.IAAssistant.Studio.Runtime = {
            // Avisa a Studio (modal de edicion): save start/end cierra el
            // modal y refresca el bloque sin recargar la pagina.
            notify: function (eventName, data) {
                if (runtime && typeof runtime.notify === "function") {
                    runtime.notify(eventName, data || {});
                    return true;
                }
                return false;
            }
        };

        if (window.IAAssistant.Studio.Api) {
            window.IAAssistant.Studio.Api.configure({
                saveUrl: saveUrl,
                generateTeacherUnitUrl: generateTeacherUnitUrl,
                generateTeacherComponentCreateUrl: generateTeacherComponentCreateUrl,
                generateTeacherComponentEditUrl: generateTeacherComponentEditUrl
            });
        }

        if (window.IAAssistant.Studio.State.loadUnit) {
            window.IAAssistant.Studio.State.loadUnit(settings.initial_unit);
        }

        window.IAAssistant.Studio.Events.init(root, settings);

        if (window.console && window.console.log) {
            window.console.log("IA Assistant Studio cargado.");
        }
    };
}());
