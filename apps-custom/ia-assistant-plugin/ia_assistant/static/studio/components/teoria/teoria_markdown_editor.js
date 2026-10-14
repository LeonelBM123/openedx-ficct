(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function getMarkdownBasic() {
        return window.IAAssistant.MarkdownBasic || {
            escapeText: function (text) {
                return String(text || "");
            },
            normalizeMarkdown: function (markdown) {
                return typeof markdown === "string" ? markdown : "";
            },
            isHeading: function () {
                return false;
            },
            getHeadingLevel: function () {
                return 0;
            },
            getHeadingText: function (line) {
                return String(line || "");
            },
            isHorizontalRule: function () {
                return false;
            },
            isBulletListItem: function () {
                return false;
            },
            getBulletListText: function (line) {
                return String(line || "");
            },
            isNumberedListItem: function () {
                return false;
            },
            getNumberedListText: function (line) {
                return String(line || "");
            },
            isQuote: function () {
                return false;
            },
            getQuoteText: function (line) {
                return String(line || "");
            },
            isCodeFence: function () {
                return false;
            },
            parseInlineTokens: function (text) {
                return [{ type: "text", text: String(text || "") }];
            }
        };
    }

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        element.textContent = text;
        return element;
    }

    function appendInlineNodes(parent, text) {
        var markdownBasic = getMarkdownBasic();

        markdownBasic.parseInlineTokens(text).forEach(function (token) {
            var element;

            if (token.type === "bold") {
                element = document.createElement("strong");
                element.textContent = token.text;
                parent.appendChild(element);
                return;
            }

            if (token.type === "italic") {
                element = document.createElement("em");
                element.textContent = token.text;
                parent.appendChild(element);
                return;
            }

            if (token.type === "code") {
                element = document.createElement("code");
                element.textContent = token.text;
                parent.appendChild(element);
                return;
            }

            parent.appendChild(document.createTextNode(token.text));
        });
    }

    function appendParagraph(container, lines) {
        var paragraph = document.createElement("p");

        appendInlineNodes(paragraph, lines.join(" "));
        container.appendChild(paragraph);
    }

    function appendList(container, items, ordered) {
        var list = document.createElement(ordered ? "ol" : "ul");

        items.forEach(function (itemText) {
            var item = document.createElement("li");

            appendInlineNodes(item, itemText);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    function renderPreview(previewRoot, markdown) {
        var markdownBasic = getMarkdownBasic();
        var lines = markdownBasic.normalizeMarkdown(markdown).split("\n");
        var paragraphLines = [];
        var codeLines = [];
        var inCodeBlock = false;
        var index = 0;

        function flushParagraph() {
            if (paragraphLines.length) {
                appendParagraph(previewRoot, paragraphLines);
                paragraphLines = [];
            }
        }

        clearElement(previewRoot);

        while (index < lines.length) {
            var line = lines[index];
            var trimmedLine = line.trim();
            var heading;
            var quote;
            var listItems;
            var pre;
            var code;

            if (markdownBasic.isCodeFence(line)) {
                flushParagraph();

                if (inCodeBlock) {
                    pre = document.createElement("pre");
                    code = document.createElement("code");
                    code.textContent = codeLines.join("\n");
                    pre.appendChild(code);
                    previewRoot.appendChild(pre);
                    codeLines = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }

                index += 1;
                continue;
            }

            if (inCodeBlock) {
                codeLines.push(line);
                index += 1;
                continue;
            }

            if (!trimmedLine) {
                flushParagraph();
                index += 1;
                continue;
            }

            if (markdownBasic.isHorizontalRule(line)) {
                flushParagraph();
                previewRoot.appendChild(document.createElement("hr"));
                index += 1;
                continue;
            }

            if (markdownBasic.isHeading(line)) {
                flushParagraph();
                heading = document.createElement(
                    "h" + String(markdownBasic.getHeadingLevel(line) || 2)
                );
                appendInlineNodes(heading, markdownBasic.getHeadingText(line));
                previewRoot.appendChild(heading);
                index += 1;
                continue;
            }

            if (markdownBasic.isQuote(line)) {
                flushParagraph();
                quote = document.createElement("blockquote");
                appendInlineNodes(quote, markdownBasic.getQuoteText(line));
                previewRoot.appendChild(quote);
                index += 1;
                continue;
            }

            if (markdownBasic.isBulletListItem(line)) {
                flushParagraph();
                listItems = [];

                while (index < lines.length && markdownBasic.isBulletListItem(lines[index])) {
                    listItems.push(markdownBasic.getBulletListText(lines[index]));
                    index += 1;
                }

                appendList(previewRoot, listItems, false);
                continue;
            }

            if (markdownBasic.isNumberedListItem(line)) {
                flushParagraph();
                listItems = [];

                while (index < lines.length && markdownBasic.isNumberedListItem(lines[index])) {
                    listItems.push(markdownBasic.getNumberedListText(lines[index]));
                    index += 1;
                }

                appendList(previewRoot, listItems, true);
                continue;
            }

            paragraphLines.push(line);
            index += 1;
        }

        flushParagraph();

        if (!previewRoot.childNodes.length) {
            previewRoot.appendChild(createTextElement(
                "p",
                "ia-assistant-teoria-editor__preview-empty",
                "La vista previa aparecera aqui."
            ));
        }
    }

    function focusTextarea(textarea, selectionStart, selectionEnd) {
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
    }

    function replaceSelection(textarea, beforeText, afterText, fallbackText) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var selection = textarea.value.slice(start, end) || fallbackText;
        var replacement = beforeText + selection + afterText;

        textarea.setRangeText(replacement, start, end, "select");
        focusTextarea(
            textarea,
            start + beforeText.length,
            start + beforeText.length + selection.length
        );
    }

    function transformSelectedLines(textarea, transformLine) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var value = textarea.value;
        var blockStart = value.lastIndexOf("\n", start - 1) + 1;
        var blockEnd = value.indexOf("\n", end);
        var selectedBlock;
        var updatedBlock;

        if (blockEnd === -1) {
            blockEnd = value.length;
        }

        selectedBlock = value.slice(blockStart, blockEnd);
        updatedBlock = selectedBlock.split("\n").map(transformLine).join("\n");
        textarea.setRangeText(updatedBlock, blockStart, blockEnd, "select");
        focusTextarea(textarea, blockStart, blockStart + updatedBlock.length);
    }

    function prefixSelectedLines(textarea, prefix) {
        transformSelectedLines(textarea, function (line) {
            return prefix + line;
        });
    }

    function togglePreview(previewRoot, toggleButton) {
        var nextHiddenState = !previewRoot.hidden;

        previewRoot.hidden = nextHiddenState;
        toggleButton.setAttribute("aria-pressed", String(!nextHiddenState));
        toggleButton.textContent = nextHiddenState ? "Preview" : "Ocultar preview";
    }

    function clearEditor(textarea) {
        textarea.value = "";
        focusTextarea(textarea, 0, 0);
    }

    function createToolbarButton(label, title, onClick) {
        var button = document.createElement("button");

        button.className = "ia-markdown-toolbar__button ia-assistant-teoria-editor__toolbar-button";
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.addEventListener("click", onClick);

        return button;
    }

    function createToolbar(textarea, previewRoot, emitChange) {
        var toolbar = document.createElement("div");
        var toggleButton;

        toolbar.className = "ia-markdown-toolbar ia-assistant-teoria-editor__toolbar";
        toolbar.setAttribute("aria-label", "Herramientas de Markdown");

        toolbar.appendChild(createToolbarButton("Negrita", "Insertar negrita", function () {
            replaceSelection(textarea, "**", "**", "texto");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Cursiva", "Insertar cursiva", function () {
            replaceSelection(textarea, "*", "*", "texto");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Titulo", "Insertar titulo", function () {
            prefixSelectedLines(textarea, "## ");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Lista", "Insertar lista", function () {
            prefixSelectedLines(textarea, "- ");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Cita", "Insertar cita", function () {
            prefixSelectedLines(textarea, "> ");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Codigo", "Insertar codigo inline", function () {
            replaceSelection(textarea, "`", "`", "codigo");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Bloque", "Insertar bloque de codigo", function () {
            replaceSelection(textarea, "```text\n", "\n```", "codigo");
            emitChange();
        }));

        toolbar.appendChild(createToolbarButton("Enlace", "Insertar enlace", function () {
            replaceSelection(textarea, "[", "](https://)", "texto");
            emitChange();
        }));

        toggleButton = createToolbarButton("Ocultar preview", "Mostrar u ocultar vista previa", function () {
            togglePreview(previewRoot, toggleButton);
        });
        toggleButton.setAttribute("aria-pressed", "true");
        toolbar.appendChild(toggleButton);

        toolbar.appendChild(createToolbarButton("Limpiar", "Limpiar contenido", function () {
            clearEditor(textarea);
            emitChange();
        }));

        return toolbar;
    }

    function create(options) {
        var settings = options && typeof options === "object" ? options : {};
        var markdownBasic = getMarkdownBasic();
        var container = settings.container;
        var root;
        var header;
        var title;
        var textarea;
        var previewRoot;
        var onChange;

        if (!container) {
            return null;
        }

        onChange = typeof settings.onChange === "function" ? settings.onChange : function () {};
        root = document.createElement("div");
        header = document.createElement("div");
        title = createTextElement(
            "span",
            "ia-assistant-teoria-editor__markdown-label",
            "Editor Markdown de respaldo"
        );
        textarea = document.createElement("textarea");
        previewRoot = document.createElement("div");

        function emitChange() {
            var markdown = markdownBasic.normalizeMarkdown(textarea.value);

            if (textarea.value !== markdown) {
                textarea.value = markdown;
            }

            renderPreview(previewRoot, markdown);
            onChange(markdown);
        }

        clearElement(container);

        root.className = "ia-teoria-editor ia-assistant-teoria-editor__markdown-editor";
        header.className = "ia-assistant-teoria-editor__markdown-header";
        header.appendChild(title);
        header.appendChild(createTextElement(
            "span",
            "ia-assistant-teoria-editor__markdown-help",
            "Se usa solo si el editor visual ToastUI no esta disponible."
        ));

        textarea.className = "ia-teoria-markdown-textarea ia-assistant-teoria-editor__textarea";
        textarea.name = "ia_assistant_teoria_contenido";
        textarea.rows = 16;
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", "Contenido Markdown");
        textarea.value = markdownBasic.normalizeMarkdown(settings.initialMarkdown || "");
        textarea.addEventListener("input", emitChange);

        previewRoot.className = "ia-assistant-teoria-editor__preview";
        previewRoot.setAttribute("aria-live", "polite");

        root.appendChild(header);
        root.appendChild(createToolbar(textarea, previewRoot, emitChange));
        root.appendChild(textarea);
        root.appendChild(previewRoot);
        container.appendChild(root);

        emitChange();

        return {
            destroy: function () {
                textarea.removeEventListener("input", emitChange);
                clearElement(container);
            },
            getMarkdown: function () {
                return markdownBasic.normalizeMarkdown(textarea.value);
            },
            setMarkdown: function (markdown) {
                textarea.value = markdownBasic.normalizeMarkdown(markdown);
                emitChange();
            }
        };
    }

    window.IAAssistant.Studio.TeoriaMarkdownEditor = {
        create: create
    };
}());
