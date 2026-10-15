(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};

  // Mensaje hacia el MFE de aprendizaje (ventana padre del iframe de la unidad).
  // El avatar lo escucha para no responder preguntas mientras el alumno resuelve
  // una actividad evaluada. Es una medida de UI, no una barrera de seguridad: el
  // contenido del mensaje no es sensible, por eso targetOrigin es "*"; el MFE
  // valida el origin del remitente.
  var MESSAGE_TYPE = "ficct.avatar.lock";
  var blockId = "ia-" + Math.random().toString(36).slice(2);
  var lastLocked = null;

  function hasGradedComponents(unit) {
    var components = unit && Array.isArray(unit.componentes) ? unit.componentes : [];

    return components.some(function (component) {
      return (
        component &&
        ["quiz_multiple", "pregunta_abierta", "codigo"].indexOf(component.tipo) !== -1 &&
        typeof component.puntaje === "number" &&
        component.puntaje > 0
      );
    });
  }

  function attemptsExhausted() {
    var attempts = window.IAAssistant.Student.Attempts;

    return Boolean(attempts && attempts.max > 0 && attempts.used >= attempts.max);
  }

  function shouldLock(unit) {
    // Se bloquea solo si la actividad vale nota y todavia puede entregarse.
    return hasGradedComponents(unit) && !attemptsExhausted();
  }

  function post(locked) {
    if (locked === lastLocked) {
      return;
    }

    lastLocked = locked;

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: MESSAGE_TYPE, blockId: blockId, locked: locked },
          "*"
        );
      }
    } catch (error) {
      if (window.console && window.console.warn) {
        window.console.warn("IA Assistant: no se pudo avisar al avatar.", error);
      }
    }
  }

  var currentUnit = null;

  window.IAAssistant.Student.AvatarLock = {
    init: function (element, args) {
      currentUnit = (args && args.initial_unit) || null;
      post(shouldLock(currentUnit));

      // Al salir de la unidad el iframe se descarga: liberar el bloqueo.
      window.addEventListener("pagehide", function () {
        lastLocked = null;
        post(false);
      });
    },

    // Se llama despues de cada revision: al agotar intentos se libera.
    refresh: function () {
      post(shouldLock(currentUnit));
    }
  };
}());
