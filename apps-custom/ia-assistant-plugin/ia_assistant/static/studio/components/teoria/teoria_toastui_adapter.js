(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function noop() {}

    function normalizeMarkdown(markdown) {
        return typeof markdown === "string" ? markdown : "";
    }

    function createRemovedImageLabel(altText) {
        var normalizedAltText = normalizeMarkdown(altText).trim();

        return normalizedAltText ?
            "[imagen removida: " + normalizedAltText + "]" :
            "[imagen removida]";
    }

    function normalizeMarkdownImages(line) {
        return line
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, function (match, altText) {
                return createRemovedImageLabel(altText);
            })
            .replace(/<img\b[^>]*>/gi, "[imagen removida]");
    }

    function normalizeMarkdownBreaks(line) {
        return line.replace(/<br\s*\/?>/gi, "\n");
    }

    function normalizeTheoryMarkdown(markdown) {
        var lines = normalizeMarkdown(markdown).split("\n");
        var insideCodeFence = false;

        return lines.map(function (line) {
            var normalizedLine = line;

            if (line.trim().indexOf("```") === 0) {
                insideCodeFence = !insideCodeFence;
                return line;
            }

            if (insideCodeFence) {
                return line;
            }

            normalizedLine = normalizeMarkdownImages(normalizedLine);
            normalizedLine = normalizeMarkdownBreaks(normalizedLine);

            return normalizedLine;
        }).join("\n");
    }

    function getChangeHandler(onChange) {
        return typeof onChange === "function" ? onChange : noop;
    }

    function clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function isToastAvailable() {
        return !!(
            window.toastui &&
            window.toastui.Editor
        );
    }

    function createFallbackEditor(container, initialMarkdown, onChange) {
        var fallbackRoot = document.createElement("div");
        var message = document.createElement("p");
        var textarea = document.createElement("textarea");
        var handleInput = function () {
            onChange(normalizeTheoryMarkdown(textarea.value));
        };

        fallbackRoot.className = "ia-assistant-teoria-toastui-fallback";
        message.className = "ia-assistant-teoria-toastui-fallback-message";
        message.textContent = "Editor Markdown de respaldo";

        textarea.className = "ia-assistant-teoria-toastui-fallback-textarea";
        textarea.value = normalizeMarkdown(initialMarkdown);
        textarea.rows = 16;
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", "Contenido Markdown de respaldo");
        textarea.addEventListener("input", handleInput);

        fallbackRoot.appendChild(message);
        fallbackRoot.appendChild(textarea);
        container.appendChild(fallbackRoot);

        return {
            destroy: function () {
                textarea.removeEventListener("input", handleInput);
                clearContainer(container);
            },
            getMarkdown: function () {
                return normalizeTheoryMarkdown(textarea.value);
            },
            setMarkdown: function (markdown) {
                textarea.value = normalizeMarkdown(markdown);
            }
        };
    }

    function createToastEditor(container, initialMarkdown, onChange) {
        var editor = new window.toastui.Editor({
            el: container,
            height: "500px",
            initialEditType: "wysiwyg",
            initialValue: normalizeMarkdown(initialMarkdown),
            previewStyle: "vertical",
            toolbarItems: [
                ["heading", "bold", "italic", "strike"],
                ["hr", "quote"],
                ["ul", "ol", "task", "indent", "outdent"],
                ["table", "link"],
                ["code", "codeblock"]
            ]
        });

        if (editor.on) {
            editor.on("change", function () {
                if (editor.getMarkdown) {
                    onChange(normalizeTheoryMarkdown(editor.getMarkdown()));
                }
            });
        }

        return {
            destroy: function () {
                if (editor.destroy) {
                    editor.destroy();
                } else {
                    clearContainer(container);
                }
            },
            getMarkdown: function () {
                return editor.getMarkdown ?
                    normalizeTheoryMarkdown(editor.getMarkdown()) :
                    "";
            },
            setMarkdown: function (markdown) {
                if (editor.setMarkdown) {
                    editor.setMarkdown(normalizeMarkdown(markdown));
                }
            }
        };
    }

    window.IAAssistant.Studio.TeoriaToastUIAdapter = {
        isToastAvailable: isToastAvailable,
        normalizeTheoryMarkdown: normalizeTheoryMarkdown,
        create: function (options) {
            var safeOptions = options || {};
            var container = safeOptions.container;
            var initialMarkdown = normalizeMarkdown(safeOptions.initialMarkdown);
            var onChange = getChangeHandler(safeOptions.onChange);

            if (!container) {
                return {
                    destroy: noop,
                    getMarkdown: function () {
                        return normalizeTheoryMarkdown(initialMarkdown);
                    },
                    setMarkdown: function (markdown) {
                        initialMarkdown = normalizeMarkdown(markdown);
                    }
                };
            }

            clearContainer(container);

            if (!isToastAvailable()) {
                return createFallbackEditor(container, initialMarkdown, onChange);
            }

            try {
                return createToastEditor(container, initialMarkdown, onChange);
            } catch (error) {
                if (window.console && typeof window.console.error === "function") {
                    window.console.error(
                        "IA Assistant teoria: ToastUI fallo al inicializar.",
                        {
                            name: error && error.name ? error.name : "Error",
                            message: error && error.message ? error.message : String(error)
                        }
                    );
                }
                clearContainer(container);
                return createFallbackEditor(container, initialMarkdown, onChange);
            }
        }
    };
}());
