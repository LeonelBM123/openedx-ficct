(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Studio = window.IAAssistant.Studio || {};

  var currentUnit = createDefaultUnit();
  var activeComponentId = null;
  var componentTypeSequences = {};

  function createDefaultUnit() {
    return {
      version: 1,
      titulo: "Unidad sin título",
      componentes: [],
    };
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function isKnownComponentType(componentType) {
    return Boolean(window.IAAssistant.Registry.get(componentType));
  }

  function hasValidComponentScore(component) {
    if (!Object.prototype.hasOwnProperty.call(component, "puntaje")) {
      return true;
    }

    if (
      typeof component.puntaje !== "number" ||
      !Number.isInteger(component.puntaje) ||
      component.puntaje < 0
    ) {
      return false;
    }

    if (component.tipo === "teoria" && component.puntaje !== 0) {
      return false;
    }

    return true;
  }

  function getNormalizedComponentScore(component) {
    if (!component || typeof component !== "object") {
      return 0;
    }

    if (component.tipo === "teoria") {
      return 0;
    }

    if (
      typeof component.puntaje === "number" &&
      Number.isInteger(component.puntaje) &&
      component.puntaje >= 0
    ) {
      return component.puntaje;
    }

    return 0;
  }

  function isValidComponent(component) {
    if (!isPlainObject(component)) {
      return false;
    }

    if (typeof component.id !== "string" || !component.id.trim()) {
      return false;
    }

    if (
      typeof component.tipo !== "string" ||
      !isKnownComponentType(component.tipo)
    ) {
      return false;
    }

    if (typeof component.nombre !== "string") {
      return false;
    }

    if (!isPlainObject(component.data)) {
      return false;
    }

    if (component.tipo === "teoria" && component.data.formato !== "markdown") {
      return false;
    }

    if (!hasValidComponentScore(component)) {
      return false;
    }

    return true;
  }

  function isValidUnit(unit) {
    if (!isPlainObject(unit)) {
      return false;
    }

    if (unit.version !== 1) {
      return false;
    }

    if (typeof unit.titulo !== "string") {
      return false;
    }

    if (!Array.isArray(unit.componentes)) {
      return false;
    }

    return unit.componentes.every(isValidComponent);
  }

  function rebuildComponentTypeSequences() {
    componentTypeSequences = {};

    currentUnit.componentes.forEach(function (component) {
      var expectedPrefix = component.tipo + "_";
      var numberPart;
      var sequenceNumber;

      if (component.id.indexOf(expectedPrefix) !== 0) {
        return;
      }

      numberPart = component.id.slice(expectedPrefix.length);

      if (!/^\d+$/.test(numberPart)) {
        return;
      }

      sequenceNumber = parseInt(numberPart, 10);
      componentTypeSequences[component.tipo] = Math.max(
        componentTypeSequences[component.tipo] || 0,
        sequenceNumber,
      );
    });
  }

  function setCurrentUnit(unit) {
    currentUnit = cloneData(unit);
    activeComponentId = currentUnit.componentes.length
      ? currentUnit.componentes[0].id
      : null;
    rebuildComponentTypeSequences();
  }

  function findComponent(componentId) {
    return (
      currentUnit.componentes.find(function (component) {
        return component.id === componentId;
      }) || null
    );
  }

  function hasComponentType(componentType) {
    return currentUnit.componentes.some(function (component) {
      return component.tipo === componentType;
    });
  }

  function createComponentId(componentType) {
    componentTypeSequences[componentType] =
      (componentTypeSequences[componentType] || 0) + 1;

    return componentType + "_" + componentTypeSequences[componentType];
  }

  window.IAAssistant.Studio.State = {
    getUnit: function () {
      return cloneData(currentUnit);
    },

    resetUnit: function () {
      currentUnit = createDefaultUnit();
      activeComponentId = null;
      componentTypeSequences = {};
    },

    loadUnit: function (unit) {
      if (!isValidUnit(unit)) {
        this.resetUnit();
        return false;
      }

      setCurrentUnit(unit);
      return true;
    },

    setUnitTitle: function (title) {
      var cleanTitle = typeof title === "string" ? title.trim() : "";

      currentUnit.titulo = cleanTitle || "Unidad sin título";
    },

    addComponent: function (componentType) {
      var componentDefinition = window.IAAssistant.Registry.get(componentType);
      var component;

      if (!componentDefinition) {
        return null;
      }

      if (!componentDefinition.authorable) {
        return null;
      }

      if (
        !componentDefinition.allowMultiple &&
        hasComponentType(componentDefinition.type)
      ) {
        return null;
      }

      var componentId = createComponentId(componentDefinition.type);

      component = {
        id: componentId,
        tipo: componentDefinition.type,
        nombre: componentId,
        puntaje: 0,
        data: componentDefinition.createDefaultData(),
      };

      currentUnit.componentes.push(component);
      activeComponentId = component.id;

      return cloneData(component);
    },

    removeComponent: function (componentId) {
      var initialLength = currentUnit.componentes.length;

      currentUnit.componentes = currentUnit.componentes.filter(
        function (component) {
          return component.id !== componentId;
        },
      );

      if (activeComponentId === componentId) {
        activeComponentId = currentUnit.componentes.length
          ? currentUnit.componentes[0].id
          : null;
      }

      return currentUnit.componentes.length !== initialLength;
    },

    reorderComponent: function (
      sourceComponentId,
      targetComponentId,
      targetPosition,
    ) {
      var sourceIndex = currentUnit.componentes.findIndex(function (component) {
        return component.id === sourceComponentId;
      });
      var targetIndex = currentUnit.componentes.findIndex(function (component) {
        return component.id === targetComponentId;
      });
      var movedComponent;

      if (
        sourceComponentId === targetComponentId ||
        sourceIndex < 0 ||
        targetIndex < 0
      ) {
        return false;
      }

      movedComponent = currentUnit.componentes.splice(sourceIndex, 1)[0];
      targetIndex = currentUnit.componentes.findIndex(function (component) {
        return component.id === targetComponentId;
      });

      if (targetIndex < 0) {
        currentUnit.componentes.splice(sourceIndex, 0, movedComponent);
        return false;
      }

      if (targetPosition === "after") {
        targetIndex += 1;
      }

      currentUnit.componentes.splice(targetIndex, 0, movedComponent);
      return true;
    },

    activateComponent: function (componentId) {
      if (!findComponent(componentId)) {
        return false;
      }

      activeComponentId = componentId;
      return true;
    },

    renameComponent: function (componentId, newName) {
      var component = findComponent(componentId);
      var cleanName = typeof newName === "string" ? newName.trim() : "";

      if (!component || !cleanName) {
        return false;
      }

      component.nombre = cleanName;
      return true;
    },

    updateComponentData: function (componentId, patch) {
      var component = findComponent(componentId);
      var dataPatch = patch && typeof patch === "object" ? patch : {};

      if (!component) {
        return null;
      }

      if (!component.data || typeof component.data !== "object") {
        component.data = {};
      }

      Object.keys(dataPatch).forEach(function (key) {
        component.data[key] = dataPatch[key];
      });

      return cloneData(component);
    },

    updateComponentMeta: function (componentId, patch) {
      var component = findComponent(componentId);
      var metaPatch = patch && typeof patch === "object" ? patch : {};

      if (!component) {
        return null;
      }

      Object.keys(metaPatch).forEach(function (key) {
        component[key] = metaPatch[key];
      });

      return cloneData(component);
    },

    getComponents: function () {
      return cloneData(currentUnit.componentes);
    },

    getUnitTotalScore: function () {
      return currentUnit.componentes.reduce(function (total, component) {
        return total + getNormalizedComponentScore(component);
      }, 0);
    },

    getActiveComponent: function () {
      var activeComponent = findComponent(activeComponentId);

      if (!activeComponent) {
        return null;
      }

      return cloneData(activeComponent);
    },

    getActiveComponentId: function () {
      return activeComponentId;
    },

    replaceUnit: function (unit) {
      if (!isValidUnit(unit)) {
        return false;
      }

      setCurrentUnit(unit);
      return true;
    },

    addGeneratedComponent: function (component) {
      if (!isValidComponent(component)) {
        return null;
      }

      var existingComponent = findComponent(component.id);
      if (existingComponent) {
        return null;
      }

      var componentDefinition = window.IAAssistant.Registry.get(component.tipo);

      if (!componentDefinition) {
        return null;
      }

      var expectedPrefix = component.tipo + "_";
      var numberPart;
      var sequenceNumber;

      if (component.id.indexOf(expectedPrefix) === 0) {
        numberPart = component.id.slice(expectedPrefix.length);
        if (/^\d+$/.test(numberPart)) {
          sequenceNumber = parseInt(numberPart, 10);
          componentTypeSequences[component.tipo] = Math.max(
            componentTypeSequences[component.tipo] || 0,
            sequenceNumber,
          );
        }
      }

      currentUnit.componentes.push(cloneData(component));
      activeComponentId = component.id;

      return cloneData(component);
    },

    replaceComponent: function (component) {
      if (!isValidComponent(component)) {
        return false;
      }

      var index = currentUnit.componentes.findIndex(function (c) {
        return c.id === component.id;
      });

      if (index === -1) {
        return false;
      }

      var existingComponent = currentUnit.componentes[index];

      if (existingComponent.tipo !== component.tipo) {
        return false;
      }

      var expectedPrefix = component.tipo + "_";
      var numberPart;
      var sequenceNumber;

      if (component.id.indexOf(expectedPrefix) === 0) {
        numberPart = component.id.slice(expectedPrefix.length);
        if (/^\d+$/.test(numberPart)) {
          sequenceNumber = parseInt(numberPart, 10);
          componentTypeSequences[component.tipo] = Math.max(
            componentTypeSequences[component.tipo] || 0,
            sequenceNumber,
          );
        }
      }

      currentUnit.componentes[index] = cloneData(component);
      activeComponentId = component.id;

      return true;
    },
  };
})();
