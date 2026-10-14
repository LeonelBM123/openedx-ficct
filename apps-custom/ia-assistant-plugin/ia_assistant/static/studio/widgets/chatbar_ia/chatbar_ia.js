(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Studio = window.IAAssistant.Studio || {};

  var MODE_UNIT = "unit";
  var MODE_CREATE = "create";
  var MODE_EDIT = "edit";
  var MODE_IDLE = "idle";

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

  function clearElement(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getCleanPrompt(textarea) {
    return textarea && textarea.value ? textarea.value.trim() : "";
  }

  function detectIntent(prompt) {
    var Detector = window.IAAssistant.Studio.ChatbarIntentDetector;
    var activeComponent = window.IAAssistant.Studio.State.getActiveComponent();

    if (!Detector || typeof Detector.detect !== "function") {
      return {
        mode: MODE_IDLE,
        componentType: "",
        confidence: "low",
        scores: { unit: 0, create: 0, edit: 0 },
        reason: "Detector de intención no disponible.",
      };
    }

    return Detector.detect(prompt, {
      activeComponent: activeComponent,
    });
  }

  function getPayloadMessage(payload, fallbackMessage) {
    if (!payload) {
      return fallbackMessage;
    }

    return payload.message || payload.error || fallbackMessage;
  }

  function getTypeLabel(type) {
    var labels = {
      teoria: "Teoría",
      quiz_multiple: "Quiz",
      pregunta_abierta: "Pregunta abierta",
      codigo: "Código",
    };

    return labels[type] || type || "Componente";
  }

  function getComponentTitle(component) {
    var data = component && component.data ? component.data : {};

    return (
      data.titulo ||
      data.pregunta ||
      data.enunciado ||
      component.nombre ||
      component.id ||
      "Componente activo"
    );
  }

  function getShortComponentTitle(component) {
    var title = getComponentTitle(component);

    if (title.length <= 42) {
      return title;
    }

    return title.slice(0, 39) + "...";
  }

  function setStatus(statusElement, message, type) {
    var cleanType = type || "neutral";

    if (!statusElement) {
      return;
    }

    statusElement.textContent = message || "";
    statusElement.className =
      "ia-assistant-chatbar__status " +
      "ia-assistant-chatbar__status--" +
      cleanType;
    statusElement.hidden = !message;
  }

  function resizeTextarea(textarea) {
    var computedStyle;
    var fontSize;
    var lineHeight;
    var paddingTop;
    var paddingBottom;
    var borderTop;
    var borderBottom;
    var maxHeight;

    if (!textarea) {
      return;
    }

    computedStyle = window.getComputedStyle(textarea);
    fontSize = parseFloat(computedStyle.fontSize) || 14;
    lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.35;
    paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    maxHeight = Math.ceil(
      lineHeight * 3 + paddingTop + paddingBottom + borderTop + borderBottom
    );

    textarea.style.height = "auto";

    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + "px";
      textarea.style.overflowY = "auto";
      return;
    }

    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.overflowY = "hidden";
  }

  function getWarningsList(payload) {
    if (!payload || !Array.isArray(payload.warnings)) {
      return [];
    }

    return payload.warnings
      .filter(function (warning) {
        return typeof warning === "string" && warning.trim();
      })
      .map(function (warning) {
        return warning.trim();
      });
  }

  function getIntentLabel(intent) {
    var activeComponent;
    var activeText;

    if (!intent || intent.mode === MODE_IDLE) {
      return "Auto: escribe una indicación";
    }

    if (intent.mode === MODE_UNIT) {
      return "Detectado: Generar unidad";
    }

    if (intent.mode === MODE_CREATE) {
      if (!intent.componentType) {
        return "Detectado: Crear componente · tipo no detectado";
      }

      return (
        "Detectado: Crear componente · " + getTypeLabel(intent.componentType)
      );
    }

    if (intent.mode === MODE_EDIT) {
      activeComponent = window.IAAssistant.Studio.State.getActiveComponent();

      if (!activeComponent) {
        return "Detectado: Editar · sin componente activo";
      }

      activeText = getShortComponentTitle(activeComponent);

      return (
        "Detectado: Editar · " +
        activeText +
        " · " +
        getTypeLabel(activeComponent.tipo)
      );
    }

    return "Auto: escribe una indicación";
  }

  function getIntentClass(intent) {
    if (!intent || intent.mode === MODE_IDLE) {
      return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--idle";
    }

    if (intent.mode === MODE_CREATE && !intent.componentType) {
      return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--warning";
    }

    if (
      intent.mode === MODE_EDIT &&
      !window.IAAssistant.Studio.State.getActiveComponent()
    ) {
      return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--warning";
    }

    return (
      "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--" +
      intent.mode
    );
  }

  function createInfoRow(label, value) {
    var row = createElement("p", "ia-assistant-chatbar-preview__info-row");
    var labelElement = createElement(
      "strong",
      "ia-assistant-chatbar-preview__info-label",
      label + ": "
    );

    row.appendChild(labelElement);
    row.appendChild(document.createTextNode(value || "Sin datos"));
    return row;
  }

  function createSection(title, extraClassName) {
    var className = "ia-assistant-chatbar-preview__section";
    var section;

    if (extraClassName) {
      className += " " + extraClassName;
    }

    section = createElement("section", className);
    section.appendChild(
      createElement("h4", "ia-assistant-chatbar-preview__section-title", title)
    );
    return section;
  }

  function appendPlainTextBlock(container, text, className) {
    var value = typeof text === "string" ? text.trim() : "";
    var paragraph;

    if (!value) {
      container.appendChild(
        createElement(
          "p",
          className || "ia-assistant-chatbar-preview__empty",
          "Sin contenido."
        )
      );
      return;
    }

    paragraph = createElement(
      "p",
      className || "ia-assistant-chatbar-preview__text-block"
    );
    paragraph.textContent = value;
    container.appendChild(paragraph);
  }

  function normalizeMarkdownInline(text) {
    return String(text || "")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .trim();
  }

  function appendMarkdown(container, text) {
    var value = typeof text === "string" ? text.replace(/\r\n/g, "\n").trim() : "";
    var lines;
    var lineIndex = 0;
    var line;
    var nextLine;
    var block;
    var list;
    var item;
    var headingMatch;
    var unorderedMatch;
    var orderedMatch;
    var blockquoteLines;
    var blockquote;
    var codeMatch;
    var codeLanguage;
    var codeLines;
    var pre;
    var code;

    if (!value) {
      container.appendChild(
        createElement(
          "p",
          "ia-assistant-chatbar-preview__empty",
          "Sin contenido."
        )
      );
      return;
    }

    lines = value.split("\n");

    while (lineIndex < lines.length) {
      line = lines[lineIndex];

      if (!line.trim()) {
        lineIndex += 1;
        continue;
      }

      codeMatch = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);
      if (codeMatch) {
        codeLanguage = codeMatch[1] || "";
        codeLines = [];
        lineIndex += 1;

        while (lineIndex < lines.length && !/^```/.test(lines[lineIndex])) {
          codeLines.push(lines[lineIndex]);
          lineIndex += 1;
        }

        if (lineIndex < lines.length && /^```/.test(lines[lineIndex])) {
          lineIndex += 1;
        }

        pre = createElement(
          "pre",
          "ia-assistant-chatbar-preview__code-block ia-assistant-chatbar-preview__code-block--markdown"
        );
        code = createElement("code");

        if (codeLanguage) {
          pre.setAttribute("data-language", codeLanguage);
        }

        code.textContent = codeLines.join("\n").trim() || "// Sin contenido";
        pre.appendChild(code);
        container.appendChild(pre);
        continue;
      }

      headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        container.appendChild(
          createElement(
            "h" + String(Math.min(6, headingMatch[1].length + 1)),
            "ia-assistant-chatbar-preview__markdown-heading ia-assistant-chatbar-preview__markdown-heading--h" +
              String(headingMatch[1].length),
            normalizeMarkdownInline(headingMatch[2])
          )
        );
        lineIndex += 1;
        continue;
      }

      unorderedMatch = line.match(/^\s*[-+*]\s+(.*)$/);
      if (unorderedMatch) {
        list = createElement(
          "ul",
          "ia-assistant-chatbar-preview__markdown-list"
        );

        while (lineIndex < lines.length) {
          line = lines[lineIndex];
          unorderedMatch = line.match(/^\s*[-+*]\s+(.*)$/);

          if (!unorderedMatch) {
            break;
          }

          item = createElement(
            "li",
            "ia-assistant-chatbar-preview__markdown-list-item",
            normalizeMarkdownInline(unorderedMatch[1])
          );
          list.appendChild(item);
          lineIndex += 1;
        }

        container.appendChild(list);
        continue;
      }

      orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (orderedMatch) {
        list = createElement(
          "ol",
          "ia-assistant-chatbar-preview__markdown-list ia-assistant-chatbar-preview__markdown-list--ordered"
        );

        while (lineIndex < lines.length) {
          line = lines[lineIndex];
          orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);

          if (!orderedMatch) {
            break;
          }

          item = createElement(
            "li",
            "ia-assistant-chatbar-preview__markdown-list-item",
            normalizeMarkdownInline(orderedMatch[1])
          );
          list.appendChild(item);
          lineIndex += 1;
        }

        container.appendChild(list);
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        blockquoteLines = [];

        while (lineIndex < lines.length && /^\s*>\s?/.test(lines[lineIndex])) {
          blockquoteLines.push(lines[lineIndex].replace(/^\s*>\s?/, ""));
          lineIndex += 1;
        }

        blockquote = createElement(
          "blockquote",
          "ia-assistant-chatbar-preview__markdown-quote"
        );
        appendPlainTextBlock(
          blockquote,
          normalizeMarkdownInline(blockquoteLines.join("\n")),
          "ia-assistant-chatbar-preview__text-block"
        );
        container.appendChild(blockquote);
        continue;
      }

      block = [line];
      lineIndex += 1;

      while (lineIndex < lines.length) {
        nextLine = lines[lineIndex];

        if (!nextLine.trim()) {
          lineIndex += 1;
          break;
        }

        if (
          /^```/.test(nextLine) ||
          /^(#{1,6})\s+/.test(nextLine) ||
          /^\s*[-+*]\s+/.test(nextLine) ||
          /^\s*\d+[.)]\s+/.test(nextLine) ||
          /^\s*>\s?/.test(nextLine)
        ) {
          break;
        }

        block.push(nextLine);
        lineIndex += 1;
      }

      appendPlainTextBlock(
        container,
        normalizeMarkdownInline(block.join("\n")),
        "ia-assistant-chatbar-preview__text-block"
      );
    }
  }

  function createRichTextField(label, text, options) {
    var field = createElement("div", "ia-assistant-chatbar-preview__field");

    if (label) {
      field.appendChild(
        createElement("h5", "ia-assistant-chatbar-preview__field-label", label)
      );
    }

    if (options && options.markdown) {
      appendMarkdown(field, text);
    } else {
      appendPlainTextBlock(
        field,
        text,
        "ia-assistant-chatbar-preview__text-block"
      );
    }

    return field;
  }

  function createCodeField(label, codeText) {
    var field = createElement("div", "ia-assistant-chatbar-preview__field");
    var pre = createElement("pre", "ia-assistant-chatbar-preview__code-block");
    var code = createElement("code");
    var value = typeof codeText === "string" ? codeText : "";

    if (label) {
      field.appendChild(
        createElement("h5", "ia-assistant-chatbar-preview__field-label", label)
      );
    }
    code.textContent = value.trim() || "// Sin código base";
    pre.appendChild(code);
    field.appendChild(pre);
    return field;
  }

  function createTag(text, modifier) {
    var className = "ia-assistant-chatbar-preview__tag";

    if (modifier) {
      className += " ia-assistant-chatbar-preview__tag--" + modifier;
    }

    return createElement("span", className, text);
  }

  function getComponentScore(component) {
    if (
      component &&
      typeof component.puntaje === "number" &&
      Number.isInteger(component.puntaje) &&
      component.puntaje >= 0
    ) {
      return component.puntaje;
    }

    return 0;
  }

  function getComponentImportantFields(component) {
    var data = component && component.data ? component.data : {};

    if (!component || !component.tipo) {
      return [];
    }

    if (component.tipo === "teoria") {
      return [
        { label: "Titulo", value: data.titulo, markdown: true },
        { label: "Contenido", value: data.contenido, markdown: true },
      ];
    }

    if (component.tipo === "quiz_multiple") {
      return [
        { label: "Pregunta", value: data.pregunta, markdown: true },
        {
          label: "Respuestas correctas",
          value: Array.isArray(data.respuestas_correctas)
            ? data.respuestas_correctas.join(", ")
            : "",
          markdown: false,
        },
      ];
    }

    if (component.tipo === "pregunta_abierta") {
      return [
        { label: "Enunciado", value: data.enunciado, markdown: true },
        { label: "Criterio", value: data.criterio, markdown: true },
        { label: "Rubrica", value: data.rubrica, markdown: true },
      ];
    }

    if (component.tipo === "codigo") {
      return [
        { label: "Enunciado", value: data.enunciado, markdown: true },
        { label: "Lenguaje", value: data.lenguaje, markdown: false },
        { label: "Instrucciones", value: data.instrucciones, markdown: true },
        { label: "Codigo base", value: data.codigo_base, code: true },
      ];
    }

    return [];
  }

  function createFieldComparisonRow(field, beforeValue, afterValue) {
    var row = createElement(
      "article",
      "ia-assistant-chatbar-preview__comparison-row"
    );
    var title = createElement(
      "h5",
      "ia-assistant-chatbar-preview__comparison-title",
      field.label
    );
    var columns = createElement(
      "div",
      "ia-assistant-chatbar-preview__comparison-columns"
    );
    var beforeColumn = createElement(
      "div",
      "ia-assistant-chatbar-preview__comparison-column"
    );
    var afterColumn = createElement(
      "div",
      "ia-assistant-chatbar-preview__comparison-column"
    );

    beforeColumn.appendChild(
      createElement(
        "p",
        "ia-assistant-chatbar-preview__comparison-label",
        "Antes"
      )
    );
    afterColumn.appendChild(
      createElement(
        "p",
        "ia-assistant-chatbar-preview__comparison-label",
        "Despues"
      )
    );

    if (field.code) {
      beforeColumn.appendChild(createCodeField("", beforeValue));
      afterColumn.appendChild(createCodeField("", afterValue));
    } else if (field.markdown) {
      appendMarkdown(beforeColumn, beforeValue);
      appendMarkdown(afterColumn, afterValue);
    } else {
      appendPlainTextBlock(
        beforeColumn,
        beforeValue,
        "ia-assistant-chatbar-preview__text-block"
      );
      appendPlainTextBlock(
        afterColumn,
        afterValue,
        "ia-assistant-chatbar-preview__text-block"
      );
    }

    row.appendChild(title);
    columns.appendChild(beforeColumn);
    columns.appendChild(afterColumn);
    row.appendChild(columns);
    return row;
  }

  function createEditComparisonSection(currentComponent, proposedComponent) {
    var section = createSection("Campos clave comparados");
    var currentFields = getComponentImportantFields(currentComponent);
    var proposedFields = getComponentImportantFields(proposedComponent);
    var fieldsByLabel = {};
    var fields = [];

    currentFields.concat(proposedFields).forEach(function (field) {
      if (!field || fieldsByLabel[field.label]) {
        return;
      }

      fieldsByLabel[field.label] = true;
      fields.push(field);
    });

    if (!fields.length) {
      section.appendChild(
        createElement(
          "p",
          "ia-assistant-chatbar-preview__empty",
          "No hay campos comparables para este componente."
        )
      );
      return section;
    }

    fields.forEach(function (field) {
      var currentField = currentFields.find(function (item) {
        return item.label === field.label;
      });
      var proposedField = proposedFields.find(function (item) {
        return item.label === field.label;
      });

      section.appendChild(
        createFieldComparisonRow(
          field,
          currentField ? currentField.value : "",
          proposedField ? proposedField.value : ""
        )
      );
    });

    return section;
  }

  function createAccordionItem(component, index, isOpen) {
    var details = createElement(
      "details",
      "ia-assistant-chatbar-preview__accordion"
    );
    var summary = createElement(
      "summary",
      "ia-assistant-chatbar-preview__accordion-summary"
    );
    var summaryText = createElement(
      "div",
      "ia-assistant-chatbar-preview__accordion-summary-text"
    );
    var badgeGroup = createElement(
      "div",
      "ia-assistant-chatbar-preview__accordion-summary-badges"
    );

    if (isOpen) {
      details.open = true;
    }

    summaryText.appendChild(
      createElement(
        "span",
        "ia-assistant-chatbar-preview__accordion-index",
        "Componente " + String(index + 1)
      )
    );
    summaryText.appendChild(
      createElement(
        "strong",
        "ia-assistant-chatbar-preview__accordion-title",
        getComponentTitle(component)
      )
    );
    badgeGroup.appendChild(createTag(getTypeLabel(component.tipo), "type"));
    summary.appendChild(summaryText);
    summary.appendChild(badgeGroup);
    details.appendChild(summary);
    details.appendChild(createComponentPreview(component));
    return details;
  }

  function appendAccordionControls(container, detailsList) {
    var controls = createElement(
      "div",
      "ia-assistant-chatbar-preview__accordion-actions"
    );
    var expandButton = createElement(
      "button",
      "ia-assistant-chatbar-preview__accordion-action",
      "Expandir todo"
    );
    var collapseButton = createElement(
      "button",
      "ia-assistant-chatbar-preview__accordion-action",
      "Contraer todo"
    );

    expandButton.type = "button";
    collapseButton.type = "button";

    expandButton.addEventListener("click", function () {
      detailsList.forEach(function (details) {
        details.open = true;
      });
    });

    collapseButton.addEventListener("click", function () {
      detailsList.forEach(function (details) {
        details.open = false;
      });
    });

    controls.appendChild(expandButton);
    controls.appendChild(collapseButton);
    container.appendChild(controls);
  }

  function createOptionPreview(option, isCorrect) {
    var article = createElement("article", "ia-assistant-chatbar-preview__option");
    var header = createElement("div", "ia-assistant-chatbar-preview__option-header");
    var title = createElement(
      "p",
      "ia-assistant-chatbar-preview__option-title",
      (option && option.id ? option.id + " · " : "") +
        ((option && option.texto) || "Opción sin texto")
    );

    header.appendChild(title);
    header.appendChild(
      createTag(isCorrect ? "Respuesta correcta" : "Respuesta no marcada", isCorrect ? "success" : "muted")
    );
    article.appendChild(header);

    if (option && typeof option.feedback === "string" && option.feedback.trim()) {
      article.appendChild(
        createRichTextField("Feedback", option.feedback, { markdown: true })
      );
    }

    return article;
  }

  function createComponentPreview(component, options) {
    var article = createElement("article", "ia-assistant-chatbar-preview__component");
    var header = createElement("div", "ia-assistant-chatbar-preview__component-header");
    var titleGroup = createElement("div", "ia-assistant-chatbar-preview__component-heading");
    var meta = createElement("div", "ia-assistant-chatbar-preview__component-meta");
    var data = component && component.data ? component.data : {};
    var correctAnswers;

    titleGroup.appendChild(
      createElement(
        "h5",
        "ia-assistant-chatbar-preview__component-title",
        getComponentTitle(component)
      )
    );
    titleGroup.appendChild(
      createElement(
        "p",
        "ia-assistant-chatbar-preview__component-subtitle",
        component && component.id ? "ID: " + component.id : "Sin ID visible"
      )
    );

    meta.appendChild(createTag(getTypeLabel(component && component.tipo), "type"));

    if (component && component.nombre && component.nombre !== getComponentTitle(component)) {
      meta.appendChild(createTag(component.nombre, "name"));
    }

    meta.appendChild(
      createTag("Puntaje maximo: " + String(getComponentScore(component)), "score")
    );

    header.appendChild(titleGroup);
    header.appendChild(meta);
    article.appendChild(header);

    if (component && component.tipo === "teoria") {
      article.appendChild(createRichTextField("Título", data.titulo, { markdown: true }));
      article.appendChild(createRichTextField("Contenido", data.contenido, { markdown: true }));
      return article;
    }

    if (component && component.tipo === "quiz_multiple") {
      correctAnswers = Array.isArray(data.respuestas_correctas)
        ? data.respuestas_correctas
        : [];

      article.appendChild(createRichTextField("Pregunta", data.pregunta, { markdown: true }));

      if (Array.isArray(data.opciones) && data.opciones.length) {
        var optionsField = createElement("div", "ia-assistant-chatbar-preview__field");
        var optionsList = createElement("div", "ia-assistant-chatbar-preview__option-list");

        optionsField.appendChild(
          createElement("h5", "ia-assistant-chatbar-preview__field-label", "Opciones")
        );

        data.opciones.forEach(function (option) {
          optionsList.appendChild(
            createOptionPreview(
              option,
              correctAnswers.indexOf(option && option.id) !== -1
            )
          );
        });

        optionsField.appendChild(optionsList);
        article.appendChild(optionsField);
      } else {
        article.appendChild(createRichTextField("Opciones", "", { markdown: false }));
      }

      return article;
    }

    if (component && component.tipo === "pregunta_abierta") {
      article.appendChild(createRichTextField("Enunciado", data.enunciado, { markdown: true }));

      if (typeof data.criterio === "string" && data.criterio.trim()) {
        article.appendChild(createRichTextField("Criterio", data.criterio, { markdown: true }));
      }

      if (typeof data.rubrica === "string" && data.rubrica.trim()) {
        article.appendChild(createRichTextField("Rúbrica", data.rubrica, { markdown: true }));
      }

      return article;
    }

    if (component && component.tipo === "codigo") {
      article.appendChild(createRichTextField("Enunciado", data.enunciado, { markdown: true }));
      article.appendChild(
        createRichTextField(
          "Lenguaje",
          data.lenguaje || "No especificado",
          { markdown: false }
        )
      );
      article.appendChild(
        createRichTextField("Instrucciones", data.instrucciones, { markdown: true })
      );
      article.appendChild(createCodeField("Código base", data.codigo_base));
      return article;
    }

    article.appendChild(
      createCodeField(
        "JSON del componente",
        JSON.stringify(component || {}, null, 2)
      )
    );

    if (options && options.compactNotice) {
      article.appendChild(
        createElement(
          "p",
          "ia-assistant-chatbar-preview__highlight",
          options.compactNotice
        )
      );
    }

    return article;
  }

  function getUnitSummary(unit) {
    if (!unit || !Array.isArray(unit.componentes)) {
      return [];
    }

    return unit.componentes.map(function (component) {
      return {
        typeLabel: getTypeLabel(component.tipo),
        title: getComponentTitle(component),
      };
    });
  }

  function getProposalValidation(proposal) {
    var warnings = [];
    var isValid = true;

    if (!proposal) {
      return {
        isValid: false,
        warnings: ["No hay propuesta pendiente para aplicar."],
      };
    }

    if (proposal.kind === MODE_EDIT) {
      if (!proposal.currentComponent) {
        isValid = false;
        warnings.push(
          "No se encontró el componente activo original para validar esta propuesta de edición."
        );
      } else {
        if (proposal.component.id !== proposal.currentComponent.id) {
          isValid = false;
          warnings.push(
            "La propuesta de edición no conserva el mismo ID del componente activo."
          );
        }

        if (proposal.component.tipo !== proposal.currentComponent.tipo) {
          isValid = false;
          warnings.push(
            "La propuesta de edición no conserva el mismo tipo del componente activo."
          );
        }
      }
    }

    return {
      isValid: isValid,
      warnings: warnings,
    };
  }

  window.IAAssistant.Studio.ChatbarIA = {
    init: function (root) {
      var currentRoot = root || window.IAAssistant.Studio.Dom.getRoot();
      var Dom = window.IAAssistant.Studio.Dom;
      var form;
      var textarea;
      var intentElement;
      var intentLabel;
      var submitButton;
      var statusElement;
      var previewOverlay;
      var previewTitle;
      var previewSubtitle;
      var previewBody;
      var previewApplyButton;
      var previewDiscardButton;
      var previewCloseButtons;
      var confirmOverlay;
      var confirmTitle;
      var confirmBody;
      var confirmApplyButton;
      var confirmCancelButton;
      var confirmCloseButtons;
      var currentIntent = {
        mode: MODE_IDLE,
        componentType: "",
        confidence: "low",
      };
      var pendingProposal = null;
      var pendingConfirmation = null;

      if (!currentRoot) {
        return;
      }

      form = currentRoot.querySelector("[data-ia-assistant-chatbar]");

      if (
        !form ||
        form.getAttribute("data-ia-assistant-chatbar-ready") === "true"
      ) {
        return;
      }

      textarea = form.querySelector("[data-ia-assistant-chatbar-textarea]");
      intentElement = form.querySelector("[data-ia-assistant-chatbar-intent]");
      intentLabel = form.querySelector(
        "[data-ia-assistant-chatbar-intent-label]"
      );
      submitButton = form.querySelector("[data-ia-assistant-chatbar-submit]");
      statusElement = form.querySelector("[data-ia-assistant-chatbar-status]");
      previewOverlay = Dom.getChatbarProposalPreview(currentRoot);
      previewTitle = Dom.getChatbarProposalPreviewTitle(currentRoot);
      previewSubtitle = Dom.getChatbarProposalPreviewSubtitle(currentRoot);
      previewBody = Dom.getChatbarProposalPreviewBody(currentRoot);
      previewApplyButton = Dom.getChatbarProposalPreviewApplyButton(currentRoot);
      previewDiscardButton = Dom.getChatbarProposalPreviewDiscardButton(currentRoot);
      previewCloseButtons = Dom.getChatbarProposalPreviewCloseButtons(currentRoot);
      confirmOverlay = Dom.getChatbarConfirm(currentRoot);
      confirmTitle = Dom.getChatbarConfirmTitle(currentRoot);
      confirmBody = Dom.getChatbarConfirmBody(currentRoot);
      confirmApplyButton = Dom.getChatbarConfirmApplyButton(currentRoot);
      confirmCancelButton = Dom.getChatbarConfirmCancelButton(currentRoot);
      confirmCloseButtons = Dom.getChatbarConfirmCloseButtons(currentRoot);

      if (!textarea || !submitButton || !intentElement || !intentLabel) {
        return;
      }

      form.setAttribute("data-ia-assistant-chatbar-ready", "true");
      currentRoot.classList.add("ia-assistant-studio--with-floating-chatbar");

      function isOverlayOpen() {
        return Boolean(
          currentRoot.querySelector(".ia-assistant-json-panel:not([hidden])") ||
            currentRoot.querySelector(
              ".ia-assistant-student-preview:not([hidden])"
            ) ||
            currentRoot.querySelector(
              ".ia-assistant-chatbar-preview:not([hidden])"
            ) ||
            currentRoot.querySelector(
              ".ia-assistant-chatbar-confirm:not([hidden])"
            )
        );
      }

      function updateChatbarVisibility() {
        var shouldHide = isOverlayOpen();

        form.hidden = shouldHide;
        currentRoot.classList.toggle(
          "ia-assistant-studio--with-floating-chatbar",
          !shouldHide
        );
      }

      function initOverlayVisibilityWatcher() {
        var overlays = currentRoot.querySelectorAll(
          ".ia-assistant-json-panel, .ia-assistant-student-preview, .ia-assistant-chatbar-preview, .ia-assistant-chatbar-confirm"
        );

        if (window.MutationObserver) {
          Array.prototype.forEach.call(overlays, function (overlay) {
            var observer = new MutationObserver(function () {
              updateChatbarVisibility();
            });

            observer.observe(overlay, {
              attributes: true,
              attributeFilter: ["hidden"],
            });
          });
        }

        currentRoot.addEventListener("click", function () {
          window.setTimeout(updateChatbarVisibility, 0);
        });

        document.addEventListener("keydown", function () {
          window.setTimeout(updateChatbarVisibility, 0);
        });

        updateChatbarVisibility();
      }

      function renderDetectedIntent() {
        currentIntent = detectIntent(getCleanPrompt(textarea));

        intentLabel.textContent = getIntentLabel(currentIntent);
        intentElement.className = getIntentClass(currentIntent);
        intentElement.title = currentIntent.reason || intentLabel.textContent;
        resizeTextarea(textarea);
      }

      function setBusy(isBusy) {
        textarea.disabled = isBusy;
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? "..." : "→";

        if (previewApplyButton) {
          previewApplyButton.disabled =
            isBusy ||
            !pendingProposal ||
            !getProposalValidation(pendingProposal).isValid;
        }

        if (previewDiscardButton) {
          previewDiscardButton.disabled = isBusy || !pendingProposal;
        }

        if (confirmApplyButton) {
          confirmApplyButton.disabled = isBusy || !pendingProposal;
        }

        if (confirmCancelButton) {
          confirmCancelButton.disabled = isBusy;
        }
      }

      function validateBeforeGenerate(prompt, intent) {
        var activeComponent;

        if (!prompt) {
          setStatus(
            statusElement,
            "Escribe una indicación antes de generar.",
            "warning"
          );
          return false;
        }

        if (!intent || intent.mode === MODE_IDLE) {
          setStatus(
            statusElement,
            "No se pudo detectar la intención del prompt. Intenta reformular la solicitud.",
            "warning"
          );
          renderDetectedIntent();
          return false;
        }

        if (intent.mode === MODE_CREATE && !intent.componentType) {
          setStatus(
            statusElement,
            "No pude detectar el tipo. Escribe teoría, quiz, pregunta abierta o código.",
            "warning"
          );
          renderDetectedIntent();
          return false;
        }

        if (intent.mode === MODE_EDIT) {
          activeComponent = window.IAAssistant.Studio.State.getActiveComponent();

          if (!activeComponent) {
            setStatus(
              statusElement,
              "Selecciona un componente para editar.",
              "warning"
            );
            renderDetectedIntent();
            return false;
          }
        }

        return true;
      }

      function getGeneratePromise(prompt, intent) {
        var Api = window.IAAssistant.Studio.Api;
        var State = window.IAAssistant.Studio.State;
        var unitContextValue = State.getUnit();
        var activeComponent;

        if (!Api) {
          return Promise.reject(new Error("La API de IA no está disponible."));
        }

        if (intent.mode === MODE_CREATE) {
          return Api.generateTeacherComponentCreate(
            prompt,
            intent.componentType,
            unitContextValue
          );
        }

        if (intent.mode === MODE_EDIT) {
          activeComponent = State.getActiveComponent();

          return Api.generateTeacherComponentEdit(
            prompt,
            activeComponent,
            unitContextValue
          );
        }

        return Api.generateTeacherUnit(prompt, unitContextValue);
      }

      function createProposalFromPayload(payload, intent) {
        var State = window.IAAssistant.Studio.State;
        var proposal;

        if (!payload || payload.ok === false) {
          throw new Error(
            getPayloadMessage(payload, "No se pudo generar la propuesta.")
          );
        }

        if (intent.mode === MODE_CREATE || intent.mode === MODE_EDIT) {
          if (!payload.component) {
            throw new Error("La IA no devolvió un componente válido.");
          }

          proposal = {
            kind: intent.mode,
            component: clone(payload.component),
            warnings: getWarningsList(payload),
          };

          if (intent.mode === MODE_EDIT) {
            proposal.currentComponent = clone(State.getActiveComponent());
          }

          return proposal;
        }

        if (!payload.unit) {
          throw new Error("La IA no devolvió una unidad válida.");
        }

        proposal = {
          kind: MODE_UNIT,
          unit: clone(payload.unit),
          currentUnit: clone(State.getUnit()),
          warnings: getWarningsList(payload),
        };

        return proposal;
      }

      function appendProposalWarnings(container, warnings, validation) {
        var section;
        var list;
        var combinedWarnings = [];

        if (Array.isArray(warnings)) {
          combinedWarnings = combinedWarnings.concat(warnings);
        }

        if (validation && Array.isArray(validation.warnings)) {
          combinedWarnings = combinedWarnings.concat(validation.warnings);
        }

        if (!combinedWarnings.length) {
          return;
        }

        section = createSection(
          "Advertencias",
          "ia-assistant-chatbar-preview__section--warning"
        );
        list = createElement("ul", "ia-assistant-chatbar-preview__warning-list");

        combinedWarnings.forEach(function (warning) {
          list.appendChild(
            createElement(
              "li",
              "ia-assistant-chatbar-preview__warning-item",
              warning
            )
          );
        });

        section.appendChild(list);
        container.appendChild(section);
      }

      function renderUnitProposal(container, proposal) {
        var comparison = createSection("Resumen comparativo");
        var generated = createSection("Unidad propuesta");
        var currentUnit = proposal.currentUnit || { titulo: "", componentes: [] };
        var proposedUnit = proposal.unit || { titulo: "", componentes: [] };
        var proposedSummary = getUnitSummary(proposedUnit);
        var detailsList = [];
        var componentList = createElement(
          "div",
          "ia-assistant-chatbar-preview__accordion-list"
        );

        comparison.appendChild(
          createInfoRow("Título actual", currentUnit.titulo || "Unidad sin título")
        );
        comparison.appendChild(
          createInfoRow(
            "Componentes actuales",
            String(
              Array.isArray(currentUnit.componentes)
                ? currentUnit.componentes.length
                : 0
            )
          )
        );
        comparison.appendChild(
          createInfoRow(
            "Título propuesto",
            proposedUnit.titulo || "Unidad sin título"
          )
        );
        comparison.appendChild(
          createInfoRow("Componentes propuestos", String(proposedSummary.length))
        );
        comparison.appendChild(
          createElement(
            "p",
            "ia-assistant-chatbar-preview__highlight",
            "Aplicar esta propuesta reemplazará la unidad actual en Studio."
          )
        );
        container.appendChild(comparison);

        generated.appendChild(
          createInfoRow(
            "Título generado",
            proposedUnit.titulo || "Unidad sin título"
          )
        );
        generated.appendChild(
          createInfoRow("Cantidad total", String(proposedSummary.length))
        );

        if (proposedSummary.length) {
          proposedUnit.componentes.forEach(function (component, index) {
            var details = createAccordionItem(component, index, index === 0);

            detailsList.push(details);
            componentList.appendChild(details);
          });

          if (detailsList.length > 1) {
            appendAccordionControls(generated, detailsList);
          }

          generated.appendChild(componentList);
        } else {
          generated.appendChild(
            createElement(
              "p",
              "ia-assistant-chatbar-preview__empty",
              "La propuesta no incluye componentes visibles."
            )
          );
        }

        container.appendChild(generated);
      }

      function renderCreateProposal(container, proposal) {
        var section = createSection("Componente generado");

        section.appendChild(createComponentPreview(proposal.component));
        section.appendChild(
          createElement(
            "p",
            "ia-assistant-chatbar-preview__highlight",
            "Si aplicas esta propuesta, el componente se agregará a la unidad actual. No reemplazará la unidad completa."
          )
        );
        container.appendChild(section);
      }

      function renderEditProposal(container, proposal) {
        var currentSection = createSection("Componente actual");
        var proposedSection = createSection("Componente propuesto");

        container.appendChild(
          createEditComparisonSection(
            proposal.currentComponent,
            proposal.component
          )
        );
        currentSection.appendChild(createComponentPreview(proposal.currentComponent));
        container.appendChild(currentSection);

        proposedSection.appendChild(createComponentPreview(proposal.component));
        proposedSection.appendChild(
          createElement(
            "p",
            "ia-assistant-chatbar-preview__highlight",
            "Si aplicas esta propuesta, se reemplazará solo el componente activo."
          )
        );
        container.appendChild(proposedSection);
      }

      function renderProposalPreview() {
        var validation;

        if (!previewOverlay || !previewBody || !previewTitle || !previewSubtitle) {
          return;
        }

        clearElement(previewBody);

        if (!pendingProposal) {
          previewOverlay.hidden = true;
          previewTitle.textContent = "Vista previa de propuesta";
          previewSubtitle.textContent =
            "Revisa esta propuesta antes de aplicar cambios en Studio.";
          updateChatbarVisibility();
          return;
        }

        validation = getProposalValidation(pendingProposal);
        previewOverlay.hidden = false;

        if (pendingProposal.kind === MODE_UNIT) {
          previewTitle.textContent = "Vista previa de unidad completa";
          previewSubtitle.textContent =
            "La IA propone una unidad completa. Revisa el comparativo y cada componente antes de decidir.";
          renderUnitProposal(previewBody, pendingProposal);
        } else if (pendingProposal.kind === MODE_CREATE) {
          previewTitle.textContent = "Vista previa de componente nuevo";
          previewSubtitle.textContent =
            "La IA propone un componente para agregar a la unidad actual.";
          renderCreateProposal(previewBody, pendingProposal);
        } else {
          previewTitle.textContent = "Vista previa de edición";
          previewSubtitle.textContent =
            "La IA propone reemplazar el componente activo por esta versión.";
          renderEditProposal(previewBody, pendingProposal);
        }

        appendProposalWarnings(previewBody, pendingProposal.warnings, validation);

        if (previewApplyButton) {
          if (pendingProposal.kind === MODE_UNIT) {
            previewApplyButton.textContent =
              "Aplicar y reemplazar unidad actual";
          } else if (pendingProposal.kind === MODE_CREATE) {
            previewApplyButton.textContent = "Aplicar y agregar componente";
          } else {
            previewApplyButton.textContent = "Aplicar y reemplazar componente";
          }

          previewApplyButton.disabled = !validation.isValid;
        }

        if (previewDiscardButton) {
          previewDiscardButton.disabled = false;
        }

        updateChatbarVisibility();
      }

      function getConfirmationConfig(proposal) {
        if (!proposal) {
          return null;
        }

        if (proposal.kind === MODE_UNIT) {
          return {
            title: "Reemplazar unidad actual",
            message:
              "Esta acción reemplazará la unidad actual en Studio. Los cambios actuales no guardados podrían perderse al aplicar esta propuesta.",
            confirmLabel: "Sí, aplicar propuesta",
          };
        }

        if (proposal.kind === MODE_CREATE) {
          return {
            title: "Agregar componente a la unidad",
            message:
              "Esta acción agregará un nuevo componente a la unidad actual.",
            confirmLabel: "Sí, aplicar propuesta",
          };
        }

        return {
          title: "Reemplazar componente seleccionado",
          message: "Esta acción reemplazará el componente seleccionado.",
          confirmLabel: "Sí, aplicar propuesta",
        };
      }

      function renderConfirmationDialog() {
        if (!confirmOverlay || !confirmTitle || !confirmBody || !confirmApplyButton) {
          return;
        }

        clearElement(confirmBody);

        if (!pendingConfirmation) {
          confirmOverlay.hidden = true;
          confirmTitle.textContent = "Confirmar propuesta";
          confirmApplyButton.textContent = "Sí, aplicar propuesta";
          updateChatbarVisibility();
          return;
        }

        confirmOverlay.hidden = false;
        confirmTitle.textContent = pendingConfirmation.title;
        confirmApplyButton.textContent = pendingConfirmation.confirmLabel;
        confirmBody.appendChild(
          createElement(
            "p",
            "ia-assistant-chatbar-confirm__message",
            pendingConfirmation.message
          )
        );
        updateChatbarVisibility();
      }

      function setPendingConfirmation(config) {
        pendingConfirmation = config || null;
        renderConfirmationDialog();
      }

      function setPendingProposal(proposal) {
        pendingProposal = proposal || null;
        setPendingConfirmation(null);

        renderProposalPreview();
      }

      function discardPendingProposal(message) {
        setPendingProposal(null);
        setStatus(statusElement, message || "Propuesta descartada.", "neutral");
        renderDetectedIntent();
        updateChatbarVisibility();
      }

      function generateProposal() {
        var prompt = getCleanPrompt(textarea);
        var intent = detectIntent(prompt);

        currentIntent = intent;
        renderDetectedIntent();

        if (!validateBeforeGenerate(prompt, intent)) {
          return;
        }

        setPendingProposal(null);
        setBusy(true);
        setStatus(statusElement, "Generando propuesta...", "loading");

        getGeneratePromise(prompt, intent)
          .then(function (payload) {
            var proposal = createProposalFromPayload(payload, intent);

            setPendingProposal(proposal);
            setStatus(
              statusElement,
              "Propuesta generada. Revisa la vista previa antes de aplicar.",
              "success"
            );
          })
          .catch(function (error) {
            setPendingProposal(null);
            setStatus(
              statusElement,
              error && error.message
                ? error.message
                : "No se pudo generar la propuesta.",
              "error"
            );
          })
          .finally(function () {
            setBusy(false);
            resizeTextarea(textarea);
            renderDetectedIntent();
            updateChatbarVisibility();
          });
      }

      function executeApplyPendingProposal() {
        var State = window.IAAssistant.Studio.State;
        var Renderer = window.IAAssistant.Studio.Renderer;
        var applied = false;

        if (!pendingProposal) {
          setStatus(statusElement, "No hay propuesta pendiente.", "warning");
          return;
        }

        if (pendingProposal.kind === MODE_CREATE) {
          applied = State.addGeneratedComponent(pendingProposal.component);
        } else if (pendingProposal.kind === MODE_EDIT) {
          applied = State.replaceComponent(pendingProposal.component);
        } else {
          applied = State.replaceUnit(pendingProposal.unit);
        }

        if (!applied) {
          setStatus(statusElement, "No se pudo aplicar la propuesta.", "error");
          return;
        }

        Renderer.render();
        setPendingProposal(null);
        setStatus(
          statusElement,
          "Propuesta aplicada localmente. Revisa y presiona Guardar.",
          "success"
        );
        renderDetectedIntent();
        updateChatbarVisibility();
      }

      function requestApplyPendingProposal() {
        var validation = getProposalValidation(pendingProposal);

        if (!pendingProposal) {
          setStatus(statusElement, "No hay propuesta pendiente.", "warning");
          return;
        }

        if (!validation.isValid) {
          setStatus(
            statusElement,
            validation.warnings[0] || "No se puede aplicar esta propuesta.",
            "error"
          );
          renderProposalPreview();
          return;
        }

        setPendingConfirmation(getConfirmationConfig(pendingProposal));
      }

      textarea.addEventListener("input", function () {
        renderDetectedIntent();
      });

      textarea.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          generateProposal();
        }
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        generateProposal();
      });

      if (previewApplyButton) {
        previewApplyButton.addEventListener("click", function () {
          requestApplyPendingProposal();
        });
      }

      if (previewDiscardButton) {
        previewDiscardButton.addEventListener("click", function () {
          discardPendingProposal("Propuesta descartada.");
        });
      }

      if (confirmApplyButton) {
        confirmApplyButton.addEventListener("click", function () {
          setPendingConfirmation(null);
          executeApplyPendingProposal();
        });
      }

      if (confirmCancelButton) {
        confirmCancelButton.addEventListener("click", function () {
          setPendingConfirmation(null);
        });
      }

      Array.prototype.forEach.call(previewCloseButtons || [], function (button) {
        button.addEventListener("click", function () {
          discardPendingProposal("Propuesta descartada.");
        });
      });

      Array.prototype.forEach.call(confirmCloseButtons || [], function (button) {
        button.addEventListener("click", function () {
          setPendingConfirmation(null);
        });
      });

      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") {
          return;
        }

        if (confirmOverlay && !confirmOverlay.hidden && pendingConfirmation) {
          setPendingConfirmation(null);
          return;
        }

        if (
          previewOverlay &&
          !previewOverlay.hidden &&
          pendingProposal &&
          !pendingConfirmation
        ) {
          discardPendingProposal("Propuesta descartada.");
        }
      });

      currentRoot.addEventListener("click", function () {
        window.setTimeout(renderDetectedIntent, 0);
        window.setTimeout(updateChatbarVisibility, 0);
      });

      initOverlayVisibilityWatcher();
      renderDetectedIntent();
      setPendingProposal(null);
      resizeTextarea(textarea);
      updateChatbarVisibility();
    },
  };
})();
