(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var draggedComponentId = null;
    var skipClickUntil = 0;

    function clearTabs(tabsRoot) {
        while (tabsRoot.firstChild) {
            tabsRoot.removeChild(tabsRoot.firstChild);
        }
    }

    function createEmptyMessage() {
        var emptyMessage = document.createElement("p");

        emptyMessage.className = "ia-assistant-component-tabs__empty";
        emptyMessage.textContent = "Los componentes agregados apareceran aqui.";

        return emptyMessage;
    }

    function getComponentName(component) {
        return component.nombre || component.id;
    }

    function getTypeClassName(component) {
        return "ia-assistant-component-tabs__tab--type-" +
            component.tipo.replace(/_/g, "-");
    }

    function getTypeBadgeText(component) {
        var badgeTexts = {
            teoria: "Teoría",
            quiz_multiple: "Quiz",
            pregunta_abierta: "Abierta",
            codigo: "Código"
        };

        return badgeTexts[component.tipo] || component.tipo;
    }

    function isVisibleInStudio(component) {
        var componentDefinition = window.IAAssistant.Registry.get(component.tipo);

        return Boolean(componentDefinition && componentDefinition.authorable);
    }

    function createRenameInput(component) {
        var renameInput = document.createElement("input");

        renameInput.className = "ia-assistant-component-tabs__rename-input";
        renameInput.draggable = false;
        renameInput.type = "text";
        renameInput.value = getComponentName(component);
        renameInput.setAttribute("aria-label", "Nombre del componente");
        renameInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        renameInput.addEventListener("mousedown", function (event) {
            event.stopPropagation();
        });
        renameInput.addEventListener("dragstart", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        return renameInput;
    }

    function startInlineRename(component, label) {
        var renameInput = createRenameInput(component);
        var isFinished = false;
        var tab = label.closest(".ia-assistant-component-tabs__tab");

        if (tab) {
            tab.draggable = false;
        }

        function finishRename(shouldSave) {
            var newName;

            if (isFinished) {
                return;
            }

            isFinished = true;
            newName = renameInput.value.trim();

            if (shouldSave && newName) {
                window.IAAssistant.Studio.State.renameComponent(component.id, newName);
            }

            if (tab) {
                tab.draggable = true;
            }

            window.IAAssistant.Studio.Renderer.render();
        }

        renameInput.addEventListener("blur", function () {
            finishRename(true);
        });
        renameInput.addEventListener("keydown", function (event) {
            event.stopPropagation();

            if (event.key === "Enter") {
                event.preventDefault();
                finishRename(true);
            }

            if (event.key === "Escape") {
                event.preventDefault();
                finishRename(false);
            }
        });

        label.replaceWith(renameInput);
        renameInput.focus();
        renameInput.select();
    }

    function createRenameButton(component, label) {
        var renameButton = document.createElement("button");

        renameButton.className = "ia-assistant-component-tabs__action " +
            "ia-assistant-component-tabs__action--edit";
        renameButton.draggable = false;
        renameButton.type = "button";
        renameButton.textContent = "✎";
        renameButton.setAttribute("aria-label", "Editar nombre del componente");
        renameButton.setAttribute("title", "Editar");
        renameButton.addEventListener("click", function (event) {
            event.stopPropagation();
            startInlineRename(component, label);
        });

        return renameButton;
    }

    function createRemoveButton(component) {
        var removeButton = document.createElement("button");

        function removeComponent() {
            window.IAAssistant.Studio.State.removeComponent(component.id);
            window.IAAssistant.Studio.Renderer.render();
        }

        removeButton.className = "ia-assistant-component-tabs__action " +
            "ia-assistant-component-tabs__action--delete";
        removeButton.draggable = false;
        removeButton.type = "button";
        removeButton.textContent = "×";
        removeButton.setAttribute("aria-label", "Eliminar componente");
        removeButton.setAttribute("title", "Eliminar");
        removeButton.addEventListener("click", function (event) {
            event.stopPropagation();

            if (!window.IAAssistant.Studio.ConfirmModal) {
                return;
            }

            window.IAAssistant.Studio.ConfirmModal.confirm({
                title: "Eliminar componente",
                message: "¿Seguro que deseas eliminar este componente? " +
                    "Esta acción no se puede deshacer.",
                confirmText: "Eliminar",
                cancelText: "Cancelar",
                variant: "danger",
                onConfirm: removeComponent
            });
        });

        return removeButton;
    }

    function clearDragClasses(tabsRoot) {
        var tabs = tabsRoot.querySelectorAll(".ia-assistant-component-tabs__tab");

        tabs.forEach(function (tab) {
            tab.classList.remove("ia-assistant-component-tabs__tab--dragging");
            tab.classList.remove("ia-assistant-component-tabs__tab--drag-over");
            tab.classList.remove("ia-assistant-component-tabs__tab--drop-before");
            tab.classList.remove("ia-assistant-component-tabs__tab--drop-after");
        });
    }

    function isTabAction(target) {
        return Boolean(target.closest(
            ".ia-assistant-component-tabs__action, " +
            ".ia-assistant-component-tabs__rename-input"
        ));
    }

    function getDropPosition(event, tab) {
        var tabBox = tab.getBoundingClientRect();
        var tabMiddle = tabBox.left + (tabBox.width / 2);

        return event.clientX > tabMiddle ? "after" : "before";
    }

    function activateTab(component) {
        window.IAAssistant.Studio.State.activateComponent(component.id);
        window.IAAssistant.Studio.Renderer.render();
    }

    function createTab(component, activeComponentId, tabsRoot) {
        var tab = document.createElement("div");
        var dragHandle = document.createElement("span");
        var label = document.createElement("span");
        var typeBadge = document.createElement("span");

        tab.className = "ia-assistant-component-tabs__tab " +
            getTypeClassName(component);
        tab.dataset.componentId = component.id;
        tab.draggable = true;
        tab.setAttribute("role", "button");
        tab.setAttribute("tabindex", "0");

        if (component.id === activeComponentId) {
            tab.className += " ia-assistant-component-tabs__tab--active";
            tab.setAttribute("aria-current", "true");
        }

        dragHandle.className = "ia-assistant-component-tabs__drag-handle";
        dragHandle.textContent = "⋮⋮";

        label.className = "ia-assistant-component-tabs__label";
        label.textContent = getComponentName(component);

        typeBadge.className = "ia-assistant-component-tabs__type-badge";
        typeBadge.textContent = getTypeBadgeText(component);

        tab.appendChild(dragHandle);
        tab.appendChild(label);
        tab.appendChild(typeBadge);
        tab.appendChild(createRenameButton(component, label));
        tab.appendChild(createRemoveButton(component));
        tab.addEventListener("click", function (event) {
            if (isTabAction(event.target)) {
                return;
            }

            if (Date.now() < skipClickUntil) {
                event.preventDefault();
                return;
            }

            activateTab(component);
        });
        tab.addEventListener("keydown", function (event) {
            if (isTabAction(event.target)) {
                return;
            }

            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            event.preventDefault();
            activateTab(component);
        });
        tab.addEventListener("dragstart", function (event) {
            if (isTabAction(event.target)) {
                event.preventDefault();
                return;
            }

            draggedComponentId = component.id;
            tab.classList.add("ia-assistant-component-tabs__tab--dragging");

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", component.id);
            }
        });
        tab.addEventListener("dragover", function (event) {
            var dropPosition;

            if (!draggedComponentId || draggedComponentId === component.id) {
                return;
            }

            event.preventDefault();
            dropPosition = getDropPosition(event, tab);
            tab.classList.add("ia-assistant-component-tabs__tab--drag-over");
            tab.classList.toggle(
                "ia-assistant-component-tabs__tab--drop-before",
                dropPosition === "before"
            );
            tab.classList.toggle(
                "ia-assistant-component-tabs__tab--drop-after",
                dropPosition === "after"
            );

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
        });
        tab.addEventListener("dragleave", function () {
            tab.classList.remove("ia-assistant-component-tabs__tab--drag-over");
            tab.classList.remove("ia-assistant-component-tabs__tab--drop-before");
            tab.classList.remove("ia-assistant-component-tabs__tab--drop-after");
        });
        tab.addEventListener("drop", function (event) {
            var reordered;
            var dropPosition;

            event.preventDefault();

            if (!draggedComponentId || draggedComponentId === component.id) {
                clearDragClasses(tabsRoot);
                return;
            }

            dropPosition = getDropPosition(event, tab);
            reordered = window.IAAssistant.Studio.State.reorderComponent(
                draggedComponentId,
                component.id,
                dropPosition
            );

            draggedComponentId = null;
            skipClickUntil = reordered ? Date.now() + 150 : 0;
            clearDragClasses(tabsRoot);

            if (reordered) {
                window.IAAssistant.Studio.Renderer.render();
            }
        });
        tab.addEventListener("dragend", function () {
            draggedComponentId = null;
            clearDragClasses(tabsRoot);
        });

        return tab;
    }

    window.IAAssistant.Studio.ComponentTabs = {
        render: function (root) {
            var tabsRoot = window.IAAssistant.Studio.Dom.getComponentTabs(root);
            var components = window.IAAssistant.Studio.State.getComponents()
                .filter(isVisibleInStudio);
            var activeComponentId = window.IAAssistant.Studio.State.getActiveComponentId();

            if (!tabsRoot) {
                return;
            }

            clearTabs(tabsRoot);

            if (!components.length) {
                tabsRoot.appendChild(createEmptyMessage());
                return;
            }

            components.forEach(function (component) {
                tabsRoot.appendChild(createTab(component, activeComponentId, tabsRoot));
            });
        }
    };
}());
