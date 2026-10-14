(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};

  var DEFAULT_TITLE = "Unidad sin título";
  var currentUnit = createDefaultUnit();

  function createDefaultUnit() {
    return {
      version: 1,
      titulo: DEFAULT_TITLE,
      componentes: [],
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isValidComponent(component) {
    return (
      isObject(component) &&
      typeof component.id === "string" &&
      typeof component.tipo === "string" &&
      typeof component.nombre === "string" &&
      isObject(component.data)
    );
  }

  function normalizeUnit(unit) {
    var normalized;

    if (
      !isObject(unit) ||
      unit.version !== 1 ||
      typeof unit.titulo !== "string" ||
      !Array.isArray(unit.componentes)
    ) {
      return createDefaultUnit();
    }

    normalized = {
      version: unit.version,
      titulo: unit.titulo,
      componentes: unit.componentes
        .filter(isValidComponent)
        .map(function (component) {
          return clone(component);
        }),
    };

    return normalized;
  }

  function loadUnit(unit) {
    currentUnit = normalizeUnit(unit);
    return getUnit();
  }

  function getUnit() {
    return clone(currentUnit);
  }

  function getComponents() {
    return getUnit().componentes;
  }

  window.IAAssistant.Student.State = {
    loadUnit: loadUnit,
    getUnit: getUnit,
    getComponents: getComponents,
  };

  function normalizeAnswerValueForSignature(answer) {
    if (!answer || typeof answer !== "object") {
      return null;
    }

    var tipo = answer.tipo || "";
    var value = answer.value;

    if (tipo === "quiz_multiple") {
      if (Array.isArray(value)) {
        return value
          .map(function (item) {
            return String(item);
          })
          .sort();
      }

      if (typeof value === "undefined" || value === null || value === "") {
        return [];
      }

      return [String(value)];
    }

    if (typeof value === "undefined" || value === null) {
      return "";
    }

    return String(value);
  }

  function buildAnswersSignature(answersMap) {
    var normalized = {};

    if (!isObject(answersMap)) {
      return "";
    }

    Object.keys(answersMap)
      .sort()
      .forEach(function (componentId) {
        var answer = answersMap[componentId];
        if (!isObject(answer)) {
          return;
        }

        normalized[String(componentId)] = {
          tipo: String(answer.tipo || ""),
          value: normalizeAnswerValueForSignature(answer),
        };
      });

    return JSON.stringify(normalized);
  }

  // Answers module: mantiene respuestas del alumno en memoria (solo frontend)
  (function () {
    var answersMap = Object.create(null);

    function normalizeAnswer(ans) {
      if (!ans || typeof ans !== "object") return null;
      var out = {
        componentId: String(
          ans.componentId || ans.componentId === 0
            ? ans.componentId
            : ans.componentId || "",
        ),
        tipo: ans.tipo || "",
        value: ans.value,
        metadata: ans.metadata || {},
      };
      return out;
    }

    function dispatchAnswerChange(detail) {
      if (!window || typeof window.dispatchEvent !== "function") {
        return;
      }

      try {
        var event;
        if (typeof window.CustomEvent === "function") {
          event = new CustomEvent("ia-assistant:student-answer-change", {
            detail: detail,
          });
        } else {
          event = document.createEvent("CustomEvent");
          event.initCustomEvent(
            "ia-assistant:student-answer-change",
            false,
            false,
            detail,
          );
        }
        window.dispatchEvent(event);
      } catch (error) {
        try {
          window.dispatchEvent(new Event("ia-assistant:student-answer-change"));
        } catch (e) {
          // fail silently if CustomEvent is unavailable
        }
      }
    }

    function notifyAnswersChanged(componentId, answer) {
      dispatchAnswerChange({
        componentId: String(componentId),
        answer: clone(answer || null),
        answers: getAllAnswers(),
      });
    }

    function setAnswer(componentId, answerPayload) {
      if (!componentId) return false;
      var payload = normalizeAnswer(answerPayload) || {
        componentId: componentId,
        tipo: (answerPayload && answerPayload.tipo) || "",
        value: (answerPayload && answerPayload.value) || null,
        metadata: (answerPayload && answerPayload.metadata) || {},
      };
      payload.componentId = componentId;
      answersMap[String(componentId)] = clone(payload);
      notifyAnswersChanged(payload.componentId, payload);
      return true;
    }

    function getAnswer(componentId) {
      if (!componentId) return null;
      var found = answersMap[String(componentId)];
      return found ? clone(found) : null;
    }

    function getAllAnswers() {
      return Object.keys(answersMap).map(function (k) {
        return clone(answersMap[k]);
      });
    }

    function getAllAnswersMap() {
      var out = Object.create(null);
      Object.keys(answersMap).forEach(function (key) {
        out[key] = clone(answersMap[key]);
      });
      return out;
    }

    function loadAnswers(initialAnswers) {
      answersMap = Object.create(null);
      if (!isObject(initialAnswers)) {
        return getAllAnswersMap();
      }

      Object.keys(initialAnswers).forEach(function (componentId) {
        var rawAnswer = initialAnswers[componentId];
        if (!isObject(rawAnswer)) {
          return;
        }
        var normalized = normalizeAnswer(rawAnswer);
        if (!normalized) {
          return;
        }
        normalized.componentId = String(componentId);
        answersMap[String(componentId)] = normalized;
      });

      return getAllAnswersMap();
    }

    function clearAnswer(componentId) {
      if (componentId) {
        delete answersMap[String(componentId)];
        notifyAnswersChanged(componentId, null);
      }
    }

    function hasAnswers() {
      return Object.keys(answersMap).length > 0;
    }

    window.IAAssistant.Student.Answers = {
      setAnswer: setAnswer,
      getAnswer: getAnswer,
      getAllAnswers: getAllAnswers,
      getAllAnswersMap: getAllAnswersMap,
      loadAnswers: loadAnswers,
      clearAnswer: clearAnswer,
      hasAnswers: hasAnswers,
      buildSignature: function () {
        return buildAnswersSignature(getAllAnswersMap());
      },
    };
  })();

  // Review state: mantiene la ultima revision IA hidratada o recien generada
  (function () {
    var currentReview = null;
    var reviewedAnswersSignature = "";

    function isObjectReview(value) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function extractMeta(review) {
      if (!isObjectReview(review)) {
        return {};
      }

      var meta = review._ia_assistant;
      return isObjectReview(meta) ? meta : {};
    }

    function getCompatibleReviewSignature(review) {
      var meta = extractMeta(review);

      if (
        typeof meta.frontend_answers_signature === "string" &&
        meta.frontend_answers_signature
      ) {
        return meta.frontend_answers_signature;
      }

      return "";
    }

    function attachFrontendSignature(review, signature) {
      var clonedReview = clone(review);
      var meta = extractMeta(clonedReview);

      meta.frontend_answers_signature = String(signature || "");
      clonedReview._ia_assistant = meta;
      return clonedReview;
    }

    function normalizeReview(review, options) {
      options = options || {};

      if (!isObjectReview(review)) {
        currentReview = null;
        reviewedAnswersSignature = "";
        return null;
      }

      var signature =
        typeof options.frontendSignature === "string"
          ? options.frontendSignature
          : getCompatibleReviewSignature(review);

      currentReview = attachFrontendSignature(review, signature);
      reviewedAnswersSignature = String(signature || "");
      return getReview();
    }

    function getCurrentAnswersSignature() {
      var Answers = window.IAAssistant.Student.Answers;
      if (!Answers || typeof Answers.getAllAnswersMap !== "function") {
        return "";
      }

      return buildAnswersSignature(Answers.getAllAnswersMap());
    }

    function getReview() {
      return currentReview ? clone(currentReview) : null;
    }

    function hasReview() {
      return !!currentReview;
    }

    function hasComparableSignature() {
      return !!(
        currentReview &&
        typeof reviewedAnswersSignature === "string" &&
        reviewedAnswersSignature
      );
    }

    function isStale() {
      if (!hasComparableSignature()) {
        return false;
      }

      return reviewedAnswersSignature !== getCurrentAnswersSignature();
    }

    function isCurrent() {
      return hasReview() && hasComparableSignature() && !isStale();
    }

    function getStatus() {
      return {
        review: getReview(),
        hasReview: hasReview(),
        hasComparableSignature: hasComparableSignature(),
        isStale: isStale(),
        isCurrent: isCurrent(),
        reviewedAnswersSignature: reviewedAnswersSignature,
      };
    }

    window.IAAssistant.Student.ReviewState = {
      loadReview: function (review) {
        return normalizeReview(review);
      },
      setReview: function (review, frontendSignature) {
        var signature =
          typeof frontendSignature === "string"
            ? frontendSignature
            : getCurrentAnswersSignature();

        return normalizeReview(review, {
          frontendSignature: signature,
        });
      },
      clearReview: function () {
        currentReview = null;
        reviewedAnswersSignature = "";
      },
      getReview: getReview,
      getStatus: getStatus,
    };
  })();
})();
