(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    function normalizeElement(element) {
        if (element && element.jquery) {
            return element[0];
        }

        return element || null;
    }

    function getRoot(element) {
        var base = normalizeElement(element);

        if (base && base.matches && base.matches("[data-ia-assistant-student-root]")) {
            return base;
        }

        if (base && base.querySelector) {
            return base.querySelector("[data-ia-assistant-student-root]");
        }

        return document.querySelector("[data-ia-assistant-student-root]");
    }

    function getTitle(root) {
        return root ? root.querySelector("[data-ia-assistant-student-title]") : null;
    }

    function getNotice(root) {
        return root ? root.querySelector("[data-ia-assistant-student-notice]") : null;
    }

    function getComponentsContainer(root) {
        return root ? root.querySelector("[data-ia-assistant-student-components]") : null;
    }

    window.IAAssistant.Student.Dom = {
        getRoot: getRoot,
        getTitle: getTitle,
        getNotice: getNotice,
        getComponentsContainer: getComponentsContainer
    };
}());
