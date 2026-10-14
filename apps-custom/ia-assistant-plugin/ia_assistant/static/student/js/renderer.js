(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    var TYPE_LABELS = {
        teoria: "Teoria",
        quiz_multiple: "Quiz multiple",
        pregunta_abierta: "Pregunta abierta",
        codigo: "Codigo",
        revision: "Revision"
    };

    function clearElement(element) {
        while (element && element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function createElement(tagName, className, text) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (typeof text === "string") {
            element.textContent = text;
        }

        return element;
    }

    function getTypeLabel(component) {
        var registry = window.IAAssistant.Registry;
        var definition = registry && registry.get ? registry.get(component.tipo) : null;

        return (definition && definition.label) || TYPE_LABELS[component.tipo] || component.tipo;
    }

    function getComponentTitle(component) {
        var data = component.data || {};

        if (component.nombre && component.nombre !== component.id) {
            return component.nombre;
        }

        return data.titulo || data.pregunta || data.enunciado || component.nombre || getTypeLabel(component);
    }

    function getTypeClass(componentType) {
        return String(componentType || "desconocido").replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function getComponentScore(component) {
        if (
            component &&
            typeof component.puntaje === "number" &&
            Number.isInteger(component.puntaje) &&
            component.puntaje > 0
        ) {
            return component.puntaje;
        }

        return 0;
    }

    function shouldShowComponentScore(component) {
        var score = getComponentScore(component);

        if (!score) {
            return false;
        }

        return component.tipo !== "teoria" && component.tipo !== "revision";
    }

    function renderEmptyState(container) {
        var empty = createElement("section", "ia-assistant-student-empty");
        var title = createElement("h3", "ia-assistant-student-empty__title", "Unidad sin componentes");
        var message = createElement(
            "p",
            "ia-assistant-student-empty__message",
            "Esta unidad todavia no tiene componentes para mostrar."
        );

        empty.appendChild(title);
        empty.appendChild(message);
        container.appendChild(empty);
    }

    function renderPlaceholder(component, container) {
        var message = createElement(
            "p",
            "ia-assistant-student-placeholder",
            "Este componente todavia no esta disponible para el alumno."
        );

        message.setAttribute("data-component-type", component.tipo || "");
        container.appendChild(message);
    }

    function renderComponentBody(component, container) {
        var components = window.IAAssistant.Student.Components || {};
        var playerByType = {
            teoria: components.TeoriaPlayer,
            quiz_multiple: components.QuizMultiplePlayer,
            pregunta_abierta: components.PreguntaAbiertaPlayer,
            codigo: components.CodigoPlayer,
            revision: components.RevisionPlayer
        };
        var player = playerByType[component.tipo];

        if (
            player &&
            typeof player.render === "function"
        ) {
            try {
                player.render(component, container);
            } catch (error) {
                if (window.console && window.console.warn) {
                    window.console.warn("No se pudo renderizar el componente Student.", component.tipo, error);
                }

                renderPlaceholder(component, container);
            }
            return;
        }

        renderPlaceholder(component, container);
    }

    function renderCard(component, index) {
        var card = createElement(
            "article",
            "ia-assistant-student-card ia-assistant-student-card--" + getTypeClass(component.tipo)
        );
        var header = createElement("header", "ia-assistant-student-card__header");
        var meta = createElement("div", "ia-assistant-student-card__meta");
        var titleRow = createElement("div", "ia-assistant-student-card__title-row");
        var number = createElement("span", "ia-assistant-student-card__number", String(index + 1));
        var badge = createElement("span", "ia-assistant-student-card__badge", getTypeLabel(component));
        var title = createElement("h3", "ia-assistant-student-card__title", getComponentTitle(component));
        var score = null;
        var body = createElement("div", "ia-assistant-student-card__body");

        meta.appendChild(number);
        meta.appendChild(badge);
        header.appendChild(meta);

        titleRow.appendChild(title);

        if (shouldShowComponentScore(component)) {
            score = createElement(
                "span",
                "ia-assistant-student-card__score",
                "Puntaje maximo: " + String(getComponentScore(component)) + " pts"
            );
            titleRow.appendChild(score);
        }

        header.appendChild(titleRow);
        card.appendChild(header);
        card.appendChild(body);

        renderComponentBody(component, body);

        return card;
    }

    function unitHasAuditable(unit) {
        var auditTypes = ["quiz_multiple", "pregunta_abierta", "codigo"];
        return Array.isArray(unit.componentes) && unit.componentes.some(function (c) {
            return auditTypes.indexOf(c.tipo) >= 0;
        });
    }

    function hasRevisionComponent(unit) {
        return Array.isArray(unit.componentes) && unit.componentes.some(function (c) { return c.tipo === 'revision'; });
    }

    function render(root) {
        var Dom = window.IAAssistant.Student.Dom;
        var State = window.IAAssistant.Student.State;
        var unit = State.getUnit();
        var titleElement = Dom.getTitle(root);
        var container = Dom.getComponentsContainer(root);

        if (!root || !container) {
            return;
        }

        if (titleElement) {
            titleElement.textContent = unit.titulo || "Unidad sin titulo";
        }

        clearElement(container);

        if (!unit.componentes.length) {
            renderEmptyState(container);
            return;
        }

        // Prepare list to render; append synthetic revision if needed
        var componentsToRender = unit.componentes.slice();
        var auditable = unitHasAuditable(unit);
        var hasRev = hasRevisionComponent(unit);

        if (auditable && !hasRev) {
            componentsToRender.push({
                id: '__revision_auto__',
                tipo: 'revision',
                nombre: 'Revisión',
                data: {}
            });
        }

        componentsToRender.forEach(function (component, index) {
            container.appendChild(renderCard(component, index));
        });
    }

    window.IAAssistant.Student.Renderer = {
        render: render
    };
}());
