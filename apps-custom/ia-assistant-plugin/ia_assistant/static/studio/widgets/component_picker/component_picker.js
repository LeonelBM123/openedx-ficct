(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function createMenu() {
        var menu = document.createElement("div");

        menu.className = "ia-assistant-component-picker__menu";
        menu.hidden = true;

        return menu;
    }

    function getAvailableComponents() {
        return window.IAAssistant.Registry.getAvailable(
            window.IAAssistant.Studio.State.getComponents()
        );
    }

    function clearMenu(menu) {
        while (menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }
    }

    function getTypeClassName(componentDefinition) {
        return "ia-assistant-component-picker__option--type-" +
            componentDefinition.type.replace(/_/g, "-");
    }

    function getTypeBadgeText(componentDefinition) {
        var badgeTexts = {
            teoria: "Teoría",
            quiz_multiple: "Quiz",
            pregunta_abierta: "Abierta",
            codigo: "Código"
        };

        return badgeTexts[componentDefinition.type] || componentDefinition.label;
    }

    function createEmptyMessage() {
        var emptyMessage = document.createElement("p");

        emptyMessage.className = "ia-assistant-component-picker__empty";
        emptyMessage.textContent = "No hay componentes disponibles.";

        return emptyMessage;
    }

    function createOption(componentDefinition, menu) {
        var option = document.createElement("button");
        var label = document.createElement("span");
        var badge = document.createElement("span");

        option.className = "ia-assistant-component-picker__option " +
            getTypeClassName(componentDefinition);
        option.type = "button";
        label.className = "ia-assistant-component-picker__option-label";
        label.textContent = componentDefinition.label;
        badge.className = "ia-assistant-component-picker__option-badge";
        badge.textContent = getTypeBadgeText(componentDefinition);
        option.appendChild(label);
        option.appendChild(badge);
        option.addEventListener("click", function () {
            window.IAAssistant.Studio.State.addComponent(componentDefinition.type);
            renderMenu(menu);
            menu.hidden = true;
        });

        return option;
    }

    function renderMenu(menu) {
        var availableComponents = getAvailableComponents();

        clearMenu(menu);

        if (!availableComponents.length) {
            menu.appendChild(createEmptyMessage());
            return;
        }

        availableComponents.forEach(function (componentDefinition) {
            menu.appendChild(createOption(componentDefinition, menu));
        });
    }

    function initCloseOnOutsideClick(componentPicker, menu) {
        document.addEventListener("click", function (event) {
            if (menu.hidden || componentPicker.contains(event.target)) {
                return;
            }

            menu.hidden = true;
        });
    }

    window.IAAssistant.Studio.ComponentPicker = {
        init: function (root) {
            var dom = window.IAAssistant.Studio.Dom;
            var componentPicker = dom.getComponentPicker(root);
            var triggerButton = dom.getComponentPickerButton(root);
            var menu;

            if (!componentPicker || !triggerButton) {
                return;
            }

            menu = componentPicker.querySelector(".ia-assistant-component-picker__menu");

            if (!menu) {
                menu = createMenu();
                componentPicker.appendChild(menu);
            }

            renderMenu(menu);
            initCloseOnOutsideClick(componentPicker, menu);

            triggerButton.addEventListener("click", function () {
                renderMenu(menu);
                menu.hidden = !menu.hidden;
            });
        }
    };
}());
