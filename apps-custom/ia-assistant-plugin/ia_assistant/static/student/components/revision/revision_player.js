(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};
  window.IAAssistant.Student.Components =
    window.IAAssistant.Student.Components || {};

  var activeRevisionRoot = null;
  var listenersRegistered = false;

  function createElement(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function clearElement(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function shortText(value, max) {
    max = max || 120;
    if (!value && value !== 0) return "";
    var text = String(value).trim();
    return text.length <= max ? text : text.slice(0, max - 1) + "…";
  }

  function getFriendlyTypeLabel(tipo) {
    if (tipo === "quiz_multiple") return "Quiz";
    if (tipo === "pregunta_abierta") return "Pregunta abierta";
    if (tipo === "codigo") return "Código";
    return String(tipo || "").replace(/_/g, " ");
  }

  function getComponentTitle(component) {
    var data = component && component.data ? component.data : {};
    if (component && component.nombre && component.nombre !== component.id) {
      return component.nombre;
    }
    if (data.titulo) return data.titulo;
    if (data.pregunta) return data.pregunta;
    if (data.enunciado) return data.enunciado;
    return "Componente sin título";
  }

  function getComponentPrompt(component) {
    var data = component && component.data ? component.data : {};
    if (component && component.tipo === "codigo") {
      return data.enunciado || data.instrucciones || "";
    }
    if (data.pregunta) return data.pregunta;
    if (data.enunciado) return data.enunciado;
    if (data.titulo) return data.titulo;
    return "";
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

  function getValidReviewScore(value) {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0
    ) {
      return value;
    }

    return null;
  }

  function hasValidReviewScorePair(obtenido, maximo) {
    var safeObtenido = getValidReviewScore(obtenido);
    var safeMaximo = getValidReviewScore(maximo);

    return safeObtenido !== null && safeMaximo !== null && safeMaximo > 0;
  }

  function normalizeReviewScoreTo100(obtenido, maximo) {
    if (!hasValidReviewScorePair(obtenido, maximo)) {
      return null;
    }

    return Math.round((obtenido / maximo) * 100);
  }

  function getComponentMap() {
    var State = window.IAAssistant.Student.State;
    var components =
      State && typeof State.getComponents === "function"
        ? State.getComponents()
        : [];
    var map = {};

    if (Array.isArray(components)) {
      components.forEach(function (component) {
        if (component && component.id) {
          map[component.id] = component;
        }
      });
    }

    return map;
  }

  function normalizeOptionId(value) {
    return String(value);
  }

  function getQuizOptionId(option, index) {
    return normalizeOptionId(option.id || "opcion_" + String(index + 1));
  }

  function getQuizOptionMap(component) {
    var data = component && component.data ? component.data : {};
    var options = Array.isArray(data.opciones) ? data.opciones : [];

    return options.reduce(function (map, option, index) {
      var currentOption = option || {};
      map[getQuizOptionId(currentOption, index)] = currentOption;
      return map;
    }, {});
  }

  function getQuizCorrectIds(component) {
    var data = component && component.data ? component.data : {};
    if (!Array.isArray(data.respuestas_correctas)) {
      return [];
    }

    return data.respuestas_correctas.map(function (value) {
      return normalizeOptionId(value);
    });
  }

  function getQuizSelectedIds(answer) {
    if (!answer || typeof answer.value === "undefined" || answer.value === null) {
      return [];
    }

    if (Array.isArray(answer.value)) {
      return answer.value.map(function (value) {
        return normalizeOptionId(value);
      });
    }

    if (answer.value === "") {
      return [];
    }

    return [normalizeOptionId(answer.value)];
  }

  function setsMatch(selectedIds, correctIds) {
    var selectedMap = {};

    if (selectedIds.length !== correctIds.length) {
      return false;
    }

    selectedIds.forEach(function (id) {
      selectedMap[id] = true;
    });

    return correctIds.every(function (id) {
      return !!selectedMap[id];
    });
  }

  function getQuizFeedbackDetails(component, answer) {
    var optionMap = getQuizOptionMap(component);
    var selectedIds = getQuizSelectedIds(answer);
    var feedbackItems = [];

    selectedIds.forEach(function (optionId) {
      var option = optionMap[optionId];
      if (option && option.feedback) {
        feedbackItems.push({
          optionText: option.texto || "Opción sin texto.",
          feedback: option.feedback,
        });
      }
    });

    return feedbackItems;
  }

  function getSelectedQuizText(component, answer) {
    var optionMap = getQuizOptionMap(component);
    var selectedIds = getQuizSelectedIds(answer);

    if (!selectedIds.length) {
      return "";
    }

    return selectedIds
      .map(function (optionId) {
        var option = optionMap[optionId];
        return option && option.texto ? option.texto : optionId;
      })
      .join(", ");
  }

  function getLegacyQuizState(answer) {
    if (!answer || !answer.metadata || !answer.metadata.checked) {
      return "Respondido";
    }

    return answer.metadata.isCorrect ? "Correcto" : "Incorrecto";
  }

  function determineQuizState(component, answer, showReviewDetails) {
    var selectedIds = getQuizSelectedIds(answer);
    var correctIds = getQuizCorrectIds(component);
    var summary = getSelectedQuizText(component, answer);
    var feedbackItems = getQuizFeedbackDetails(component, answer);

    if (!selectedIds.length) {
      return {
        state: "Pendiente",
        summary: "",
        feedbackItems: [],
        correctnessText: "",
      };
    }

    if (!showReviewDetails) {
      return {
        state: "Respondido",
        summary: summary,
        feedbackItems: [],
        correctnessText: "",
      };
    }

    if (!correctIds.length) {
      return {
        state: getLegacyQuizState(answer),
        summary: summary,
        feedbackItems: feedbackItems,
        correctnessText: "Respuesta registrada.",
      };
    }

    if (correctIds.length === 1) {
      var isCorrectSingle = selectedIds[0] === correctIds[0];
      return {
        state: isCorrectSingle ? "Correcto" : "Incorrecto",
        summary: summary,
        feedbackItems: feedbackItems,
        correctnessText: isCorrectSingle
          ? "La selección coincide con la respuesta correcta."
          : "La selección no coincide con la respuesta correcta.",
      };
    }

    var isCorrectMultiple = setsMatch(selectedIds, correctIds);
    return {
      state: isCorrectMultiple ? "Correcto" : "Incorrecto",
      summary: summary,
      feedbackItems: feedbackItems,
      correctnessText: isCorrectMultiple
        ? "Seleccionaste el conjunto correcto de respuestas."
        : "La selección no coincide con el conjunto correcto de respuestas.",
    };
  }

  function determineStateAndSummary(component, answer, showReviewDetails) {
    var tipo = component.tipo;

    if (tipo === "quiz_multiple") {
      return determineQuizState(component, answer, showReviewDetails);
    }

    if (tipo === "pregunta_abierta") {
      var textAnswer =
        answer && typeof answer.value === "string" ? answer.value.trim() : "";
      if (!textAnswer) {
        return { state: "Pendiente", summary: "" };
      }

      return { state: "Respondido", summary: shortText(textAnswer, 160) };
    }

    if (tipo === "codigo") {
      var code = answer && typeof answer.value === "string" ? answer.value : "";
      if (!code || !code.trim()) {
        return { state: "Pendiente", summary: "" };
      }

      var language =
        answer && answer.metadata && answer.metadata.lenguaje
          ? String(answer.metadata.lenguaje)
          : "";
      return {
        state: "Respondido",
        summary: shortText(code, 180),
        language: language,
      };
    }

    return { state: "Pendiente", summary: "" };
  }

  function cssClassForState(state) {
    if (!state) return "unknown";

    switch (state) {
      case "Pendiente":
        return "pending";
      case "Respondido":
        return "responded";
      case "Correcto":
        return "success";
      case "Incorrecto":
        return "error";
      default:
        return "unknown";
    }
  }

  function getCodePreview(value) {
    if (!value && value !== 0) return "";
    var text = String(value);
    var trimmed = text.trim();
    if (!trimmed) return "";
    return trimmed.length <= 500 ? trimmed : trimmed.slice(0, 499) + "…";
  }

  function renderMetric(label, value, variant) {
    var metric = createElement(
      "article",
      "ia-assistant-student-revision__metric" +
        (variant ? " ia-assistant-student-revision__metric--" + variant : ""),
    );

    metric.appendChild(
      createElement("p", "ia-assistant-student-revision__metric-label", label),
    );
    metric.appendChild(
      createElement("p", "ia-assistant-student-revision__metric-value", String(value)),
    );
    return metric;
  }

  function renderQuizFeedback(body, info) {
    if (!Array.isArray(info.feedbackItems) || !info.feedbackItems.length) {
      return;
    }

    body.appendChild(
      createElement(
        "p",
        "ia-assistant-revision-card__label",
        "Feedback de tu selección:",
      ),
    );

    info.feedbackItems.forEach(function (item) {
      body.appendChild(
        createElement(
          "p",
          "ia-assistant-revision-card__feedback",
          item.optionText + ": " + item.feedback,
        ),
      );
    });
  }

  function renderComponentCard(component, answer, info, showReviewDetails) {
    var card = createElement("article", "ia-assistant-revision-card");
    var head = createElement("div", "ia-assistant-revision-card__head");
    var left = createElement("div", "ia-assistant-revision-card__left");
    var right = createElement("div", "ia-assistant-revision-card__right");
    var body = createElement("div", "ia-assistant-revision-card__body");
    var promptText = getComponentPrompt(component);

    left.appendChild(
      createElement(
        "span",
        "ia-assistant-revision-card__type",
        getFriendlyTypeLabel(component.tipo),
      ),
    );
    left.appendChild(
      createElement(
        "h4",
        "ia-assistant-revision-card__title",
        getComponentTitle(component),
      ),
    );

    if (getComponentScore(component) > 0) {
      left.appendChild(
        createElement(
          "p",
          "ia-assistant-revision-card__score",
          "Puntaje maximo: " + String(getComponentScore(component)) + " pts",
        ),
      );
    }

    right.appendChild(
      createElement(
        "span",
        "ia-assistant-revision-card__state ia-assistant-badge ia-assistant-badge--" +
          cssClassForState(info.state),
        info.state,
      ),
    );

    if (promptText) {
      body.appendChild(
        createElement(
          "p",
          "ia-assistant-revision-card__prompt",
          (component.tipo === "codigo" ? "Consigna: " : "Enunciado: ") +
            promptText,
        ),
      );
    }

    if (info.summary) {
      if (component.tipo === "codigo") {
        body.appendChild(
          createElement(
            "p",
            "ia-assistant-revision-card__label",
            "Tu respuesta:",
          ),
        );
        body.appendChild(
          createElement(
            "pre",
            "ia-assistant-revision-card__code-preview",
            getCodePreview(answer.value),
          ),
        );
        if (info.language) {
          body.appendChild(
            createElement(
              "p",
              "ia-assistant-revision-card__language",
              "Lenguaje: " + info.language,
            ),
          );
        }
      } else {
        body.appendChild(
          createElement(
            "p",
            "ia-assistant-revision-card__answer",
            "Tu respuesta: " + info.summary,
          ),
        );
      }
    } else {
      body.appendChild(
        createElement(
          "p",
          "ia-assistant-revision-card__noanswer",
          "No hay respuesta todavía.",
        ),
      );
    }

    if (
      showReviewDetails &&
      component.tipo === "quiz_multiple" &&
      info.correctnessText
    ) {
      body.appendChild(
        createElement(
          "p",
          "ia-assistant-revision-card__result ia-assistant-revision-card__result--" +
            cssClassForState(info.state),
          info.correctnessText,
        ),
      );
      renderQuizFeedback(body, info);
    }

    head.appendChild(left);
    head.appendChild(right);
    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function getReviewStatus() {
    var ReviewState = window.IAAssistant.Student.ReviewState;
    if (!ReviewState || typeof ReviewState.getStatus !== "function") {
      return {
        review: null,
        hasReview: false,
        isStale: false,
        reviewedAnswersSignature: "",
      };
    }

    return ReviewState.getStatus();
  }

  function shouldShowReviewDetails(reviewState) {
    return !!(
      reviewState &&
      reviewState.isCurrent === true
    );
  }

  function hasComparablePreviousReview(reviewState) {
    return !!(
      reviewState &&
      reviewState.hasReview === true &&
      reviewState.hasComparableSignature === true
    );
  }

  function createAiStateBadge(rawState) {
    var stateKey = String(rawState || "").toLowerCase();
    var stateMap = {
      sin_respuesta: {
        label: "Sin respuesta",
        cls: "ia-assistant-badge--pending",
      },
      bien: { label: "Bien", cls: "ia-assistant-badge--success" },
      parcial: { label: "Parcial", cls: "ia-assistant-badge--parcial" },
      revisar: { label: "Revisar", cls: "ia-assistant-badge--error" },
      pendiente: { label: "Pendiente", cls: "ia-assistant-badge--pending" },
      respondido: {
        label: "Respondido",
        cls: "ia-assistant-badge--responded",
      },
    };
    var mapped = stateMap[stateKey] || {
      label: rawState || "Sin estado",
      cls: "ia-assistant-badge--responded",
    };

    return createElement(
      "span",
      "ia-assistant-badge " + mapped.cls,
      mapped.label,
    );
  }

  function getReviewMeta(review) {
    if (
      review &&
      review._ia_assistant &&
      typeof review._ia_assistant === "object" &&
      !Array.isArray(review._ia_assistant)
    ) {
      return review._ia_assistant;
    }

    return {};
  }

  function renderStoredReview(container, reviewState) {
    var review = reviewState.review;
    var reviewMeta = getReviewMeta(review);
    var componentMap = getComponentMap();
    var resultCard = createElement(
      "section",
      "ia-assistant-student-review-result",
    );
    var header = createElement(
      "div",
      "ia-assistant-student-review-result__header",
    );
    var statusText =
      review && review.status === "ai"
        ? "Retroalimentación IA disponible."
        : "Retroalimentación disponible.";
    var totalObtenido = getValidReviewScore(
      review && review.puntaje_total_obtenido
    );
    var totalMaximo = getValidReviewScore(
      review && review.puntaje_total_maximo
    );
    var totalNormalizado = normalizeReviewScoreTo100(
      totalObtenido,
      totalMaximo
    );

    header.appendChild(createElement("h3", "", "Resultado de revisión"));
    header.appendChild(createElement("p", "", statusText));
    resultCard.appendChild(header);

    if (totalNormalizado !== null) {
      resultCard.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__score-total",
          "Calificacion interna: " +
            String(totalNormalizado) +
            " / " +
            "100",
        )
      );
    }

    if (
      reviewMeta.grade_published === true &&
      hasValidReviewScorePair(
        reviewMeta.grade_value,
        reviewMeta.grade_max_value
      )
    ) {
      var gradeSuccess = createElement(
        "div",
        "ia-assistant-student-review-result__lms-status ia-assistant-student-review-result__lms-status--success",
      );

      gradeSuccess.appendChild(
        createElement(
          "p",
          "ia-assistant-student-review-result__lms-title",
          "Calificacion registrada en el LMS.",
        ),
      );
      gradeSuccess.appendChild(
        createElement(
          "p",
          "ia-assistant-student-review-result__lms-text",
          "Puntaje enviado: " +
            String(reviewMeta.grade_value) +
            " / " +
            String(reviewMeta.grade_max_value) +
            " pts.",
        ),
      );
      resultCard.appendChild(gradeSuccess);
    } else if (
      reviewMeta.grade_published === false &&
      typeof reviewMeta.grade_publish_error === "string" &&
      reviewMeta.grade_publish_error
    ) {
      var gradeWarning = createElement(
        "div",
        "ia-assistant-student-review-result__lms-status ia-assistant-student-review-result__lms-status--warning",
      );

      gradeWarning.appendChild(
        createElement(
          "p",
          "ia-assistant-student-review-result__lms-title",
          "La revision se genero, pero la calificacion no pudo registrarse en el LMS.",
        ),
      );
      gradeWarning.appendChild(
        createElement(
          "p",
          "ia-assistant-student-review-result__lms-text",
          "Vuelve a enviar la revision o consulta al docente.",
        ),
      );
      resultCard.appendChild(gradeWarning);
    }

    if (reviewState.isStale) {
      resultCard.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__warning",
          "Esta revisión puede estar desactualizada porque cambiaste respuestas. Solicita una nueva revisión para actualizarla.",
        ),
      );
    }

    if (review && review.resumen_general) {
      resultCard.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__summary",
          review.resumen_general,
        ),
      );
    }

    if (Array.isArray(review.recomendaciones) && review.recomendaciones.length) {
      var recSection = createElement(
        "section",
        "ia-assistant-student-review-result__recommendations",
      );
      var recList = createElement(
        "ul",
        "ia-assistant-student-review-result__recommendations-list",
      );

      recSection.appendChild(
        createElement("h4", "", "Recomendaciones generales"),
      );

      review.recomendaciones.forEach(function (recommendation) {
        recList.appendChild(createElement("li", "", recommendation));
      });

      recSection.appendChild(recList);
      resultCard.appendChild(recSection);
    }

    if (Array.isArray(review.componentes) && review.componentes.length) {
      var grid = createElement(
        "div",
        "ia-assistant-student-review-result__grid",
      );

      review.componentes.forEach(function (item) {
        var block = createElement(
          "article",
          "ia-assistant-student-review-result__component",
        );
        var comp = componentMap[item.componentId] || null;
        var typeLabel = getFriendlyTypeLabel(
          (comp && comp.tipo) || item.tipo || "",
        );
        var titleText = comp ? getComponentTitle(comp) : item.componentId;
        var promptText = comp ? getComponentPrompt(comp) : "";
        var puntajeObtenido = getValidReviewScore(item.puntaje_obtenido);
        var puntajeMaximo = getValidReviewScore(item.puntaje_maximo);
        var blockHeader = createElement(
          "div",
          "ia-assistant-student-review-result__component-head",
        );

        blockHeader.appendChild(
          createElement(
            "span",
            "ia-assistant-revision-card__type",
            typeLabel,
          ),
        );
        blockHeader.appendChild(
          createElement(
            "h4",
            "ia-assistant-revision-card__title",
            titleText,
          ),
        );
        blockHeader.appendChild(createAiStateBadge(item.estado));
        block.appendChild(blockHeader);

        if (hasValidReviewScorePair(puntajeObtenido, puntajeMaximo)) {
          block.appendChild(
            createElement(
              "div",
              "ia-assistant-student-review-result__component-score",
              "Calificacion: " +
                String(puntajeObtenido) +
                " / " +
                String(puntajeMaximo) +
                " pts",
            )
          );
        }

        if (promptText) {
          block.appendChild(
            createElement(
              "div",
              "ia-assistant-student-review-result__label",
              comp && comp.tipo === "codigo" ? "Consigna" : "Enunciado",
            ),
          );
          block.appendChild(
            createElement(
              "p",
              "ia-assistant-student-review-result__text",
              promptText,
            ),
          );
        }

        if (item.comentario) {
          block.appendChild(
            createElement(
              "div",
              "ia-assistant-student-review-result__label",
              "Comentario",
            ),
          );
          block.appendChild(
            createElement(
              "p",
              "ia-assistant-student-review-result__text",
              item.comentario,
            ),
          );
        }

        if (item.sugerencia) {
          block.appendChild(
            createElement(
              "div",
              "ia-assistant-student-review-result__label",
              "Sugerencia",
            ),
          );
          block.appendChild(
            createElement(
              "p",
              "ia-assistant-student-review-result__text",
              item.sugerencia,
            ),
          );
        }

        grid.appendChild(block);
      });

      resultCard.appendChild(grid);
    }

    container.appendChild(resultCard);
  }

  function renderSummaryBox(root) {
    var State = window.IAAssistant.Student.State;
    var Answers = window.IAAssistant.Student.Answers;
    var container = createElement(
      "div",
      "ia-assistant-student-revision__inner",
    );

    if (!State || !Answers) {
      container.appendChild(
        createElement(
          "p",
          "",
          "Módulos de estado o respuestas no disponibles.",
        ),
      );
      return container;
    }

    var components = State.getComponents() || [];
    var auditableComponents = components.filter(function (component) {
      return (
        ["quiz_multiple", "pregunta_abierta", "codigo"].indexOf(component.tipo) >=
        0
      );
    });

    if (!auditableComponents.length) {
      container.appendChild(
        createElement(
          "p",
          "ia-assistant-student-revision__empty",
          "No hay actividades para revisar en esta unidad.",
        ),
      );
      return container;
    }

    var currentReviewState = getReviewStatus();
    var showReviewDetails = shouldShowReviewDetails(currentReviewState);
    var respondedCount = 0;
    var pendingCount = 0;
    var puntajeMaximoTotal = 0;
    var quizCorrectCount = 0;
    var quizIncorrectCount = 0;
    var cardsWrapper = createElement(
      "div",
      "ia-assistant-student-revision__cards",
    );

    auditableComponents.forEach(function (component) {
      var answer = null;
      try {
        answer = Answers.getAnswer(component.id);
      } catch (error) {
        answer = null;
      }

      var info = determineStateAndSummary(
        component,
        answer,
        showReviewDetails,
      );

      if (info.state === "Pendiente") {
        pendingCount += 1;
      } else {
        respondedCount += 1;
      }

      puntajeMaximoTotal += getComponentScore(component);

      if (component.tipo === "quiz_multiple" && info.state === "Correcto") {
        quizCorrectCount += 1;
      }

      if (component.tipo === "quiz_multiple" && info.state === "Incorrecto") {
        quizIncorrectCount += 1;
      }

      cardsWrapper.appendChild(
        renderComponentCard(component, answer, info, showReviewDetails),
      );
    });

    var top = createElement("div", "ia-assistant-student-revision__top");
    top.appendChild(
      createElement(
        "h3",
        "ia-assistant-student-revision__title",
        "Revision final de la actividad",
      ),
    );
    top.appendChild(
      createElement(
        "p",
        "ia-assistant-student-revision__subtitle",
        showReviewDetails
          ? "La revisión con IA es orientativa y busca ayudarte a mejorar tus respuestas."
          : "Revisa tu resumen antes de enviar. La retroalimentación con IA aparecerá después de solicitar la revisión.",
      ),
    );
    top.appendChild(
      createElement(
        "p",
        "ia-assistant-student-revision__count",
        "Respondidas: " +
          String(respondedCount) +
          "/" +
          String(auditableComponents.length) +
          " · Pendientes: " +
          String(pendingCount),
      ),
    );
    if (puntajeMaximoTotal > 0) {
      top.appendChild(
        createElement(
          "p",
          "ia-assistant-student-revision__score-total",
          "Puntaje maximo total: " + String(puntajeMaximoTotal) + " pts",
        ),
      );
    }
    container.appendChild(top);

    var metrics = createElement("div", "ia-assistant-student-revision__metrics");
    metrics.appendChild(renderMetric("Respondidas", respondedCount, "responded"));
    metrics.appendChild(renderMetric("Pendientes", pendingCount, "pending"));

    if (showReviewDetails) {
      metrics.appendChild(
        renderMetric("Quiz correctos", quizCorrectCount, "success"),
      );
      metrics.appendChild(
        renderMetric("Quiz por revisar", quizIncorrectCount, "warning"),
      );
    }

    container.appendChild(metrics);

    container.appendChild(cardsWrapper);
    container.appendChild(
      createElement(
        "p",
        "ia-assistant-student-revision__note",
        showReviewDetails
          ? "Tus respuestas se guardan automáticamente antes de solicitar retroalimentación con IA."
          : "Tus respuestas se guardan automáticamente antes de enviar y solicitar la revisión con IA.",
      ),
    );

    var reviewStatus = createElement(
      "span",
      "ia-assistant-student-revision__status",
      "",
    );
    var reviewControls = createElement(
      "div",
      "ia-assistant-student-revision__review-controls",
    );
    var reviewButton = createElement(
      "button",
      "ia-assistant-student-revision__request",
      "Enviar respuestas y solicitar revisión",
    );
    var reviewResultContainer = createElement(
      "div",
      "ia-assistant-student-revision__result",
    );
    reviewButton.type = "button";
    reviewControls.appendChild(reviewButton);
    reviewControls.appendChild(reviewStatus);
    container.appendChild(reviewControls);

    if (showReviewDetails) {
      renderStoredReview(reviewResultContainer, currentReviewState);
    } else if (hasComparablePreviousReview(currentReviewState) && currentReviewState.isStale) {
      reviewResultContainer.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__warning",
          "La revisión anterior quedó desactualizada porque cambiaste respuestas. Envía nuevamente para ver resultados actualizados.",
        ),
      );
      reviewResultContainer.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__empty",
          "La evaluación anterior no se muestra porque ya no corresponde a tus respuestas actuales.",
        ),
      );
    } else {
      reviewResultContainer.appendChild(
        createElement(
          "div",
          "ia-assistant-student-review-result__empty",
          "Todavía no solicitaste una revisión IA para esta actividad.",
        ),
      );
    }

    container.appendChild(reviewResultContainer);

    reviewButton.addEventListener("click", function () {
      var AutoSave = window.IAAssistant.Student.AutoSave;
      var api = window.IAAssistant.Student.Api;

      reviewButton.disabled = true;
      reviewButton.textContent = "Solicitando...";
      reviewStatus.textContent = "";

      function restoreButton() {
        reviewButton.disabled = false;
        reviewButton.textContent = "Enviar respuestas y solicitar revisión";
      }

      function proceedRequest() {
        var runtime = null;
        var element = null;
        var runtimeElement =
          AutoSave && typeof AutoSave.getRuntimeElement === "function"
            ? AutoSave.getRuntimeElement() || {}
            : {};

        runtime = runtimeElement.runtime;
        element = runtimeElement.element;

        if (!api || typeof api.requestReview !== "function") {
          reviewStatus.textContent =
            "No se pudo generar la revisión. Intenta nuevamente en unos momentos.";
          restoreButton();
          return;
        }

        api.requestReview(runtime, element, [], function (result) {
          restoreButton();

          if (!result || !result.ok) {
            reviewStatus.textContent =
              "No se pudo generar la revisión. Intenta nuevamente en unos momentos.";
            return;
          }

          if (
            window.IAAssistant.Student.ReviewState &&
            typeof window.IAAssistant.Student.ReviewState.setReview === "function"
          ) {
            var currentSignature =
              window.IAAssistant.Student.Answers &&
              typeof window.IAAssistant.Student.Answers.buildSignature === "function"
                ? window.IAAssistant.Student.Answers.buildSignature()
                : "";

            window.IAAssistant.Student.ReviewState.setReview(
              result.review || {},
              currentSignature,
            );
          }

          reviewStatus.textContent = "Revisión generada con IA.";
          updateActiveRevisionSummary();
        });
      }

      try {
        if (AutoSave && typeof AutoSave.flushPendingSave === "function") {
          var maybe = AutoSave.flushPendingSave();
          if (maybe && typeof maybe.then === "function") {
            maybe
              .then(function () {
                proceedRequest();
              })
              .catch(function (error) {
                reviewStatus.textContent =
                  (error && error.error) ||
                  "No se pudo guardar tus respuestas. Intenta nuevamente antes de solicitar revisión.";
                restoreButton();
              });
            return;
          }
        }

        if (AutoSave && typeof AutoSave.saveNow === "function") {
          var saveResult = AutoSave.saveNow();
          if (saveResult && typeof saveResult.then === "function") {
            saveResult
              .then(function () {
                proceedRequest();
              })
              .catch(function (error) {
                reviewStatus.textContent =
                  (error && error.error) ||
                  "No se pudo guardar tus respuestas. Intenta nuevamente antes de solicitar revisión.";
                restoreButton();
              });
            return;
          }
        }
      } catch (error) {
        reviewStatus.textContent =
          "No se pudo preparar la revisión. Intenta nuevamente.";
        restoreButton();
        return;
      }

      proceedRequest();
    });

    return container;
  }

  function updateActiveRevisionSummary() {
    if (!activeRevisionRoot) return;

    var content = activeRevisionRoot.querySelector(
      ".ia-assistant-student-revision__content",
    );
    if (!content) return;

    clearElement(content);
    content.appendChild(renderSummaryBox(activeRevisionRoot));
  }

  function ensureRevisionListeners() {
    if (listenersRegistered || typeof window.addEventListener !== "function") {
      return;
    }

    window.addEventListener(
      "ia-assistant:student-answer-change",
      updateActiveRevisionSummary,
    );
    listenersRegistered = true;
  }

  function render(component, container) {
    var root = createElement("section", "ia-assistant-student-revision");
    var content = createElement("div", "ia-assistant-student-revision__content");

    content.appendChild(renderSummaryBox(root));
    root.appendChild(content);

    activeRevisionRoot = root;
    ensureRevisionListeners();
    container.appendChild(root);
  }

  window.IAAssistant.Student.Components.RevisionPlayer = {
    render: render,
  };
})();
