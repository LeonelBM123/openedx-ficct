(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    var components = [];
    var componentsByType = {};

    function copyComponentDefinition(componentDefinition) {
        var copiedDefinition = {
            type: componentDefinition.type,
            label: componentDefinition.label,
            allowMultiple: componentDefinition.allowMultiple,
            authorable: componentDefinition.authorable,
            reviewable: componentDefinition.reviewable,
            system: componentDefinition.system,
            studentVisible: componentDefinition.studentVisible,
            createDefaultData: componentDefinition.createDefaultData
        };

        if (typeof componentDefinition.createDefaultOption === "function") {
            copiedDefinition.createDefaultOption = componentDefinition.createDefaultOption;
        }

        return copiedDefinition;
    }

    function hasAddedComponent(addedComponents, componentType) {
        return addedComponents.some(function (component) {
            return component.tipo === componentType;
        });
    }

    window.IAAssistant.Registry = {
        register: function (componentDefinition) {
            if (!componentDefinition || !componentDefinition.type) {
                return;
            }

            if (componentsByType[componentDefinition.type]) {
                return;
            }

            componentsByType[componentDefinition.type] = componentDefinition;
            components.push(componentDefinition);
        },

        list: function () {
            return components.map(copyComponentDefinition);
        },

        get: function (componentType) {
            var componentDefinition = componentsByType[componentType];

            if (!componentDefinition) {
                return null;
            }

            return copyComponentDefinition(componentDefinition);
        },

        getAvailable: function (addedComponents) {
            var currentComponents = Array.isArray(addedComponents) ? addedComponents : [];

            return components
                .filter(function (componentDefinition) {
                    return componentDefinition.authorable &&
                        (componentDefinition.allowMultiple ||
                        !hasAddedComponent(currentComponents, componentDefinition.type));
                })
                .map(copyComponentDefinition);
        },

        isReviewable: function (componentType) {
            var componentDefinition = componentsByType[componentType];

            return Boolean(componentDefinition && componentDefinition.reviewable);
        },

        getReviewable: function (currentComponents) {
            var unitComponents = Array.isArray(currentComponents) ? currentComponents : [];
            var registry = this;

            return unitComponents.filter(function (component) {
                return component && registry.isReviewable(component.tipo);
            });
        },

        hasReviewable: function (currentComponents) {
            return this.getReviewable(currentComponents).length > 0;
        }
    };
}());
