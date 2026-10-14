(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};
    window.IAAssistant.Student.Components = window.IAAssistant.Student.Components || {};

    var INDENT = "    ";

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

    function getLineStart(value, position) {
        return value.lastIndexOf("\n", position - 1) + 1;
    }

    function getLineEnd(value, position) {
        var lineEnd = value.indexOf("\n", position);

        return lineEnd < 0 ? value.length : lineEnd;
    }

    function replaceRange(textarea, start, end, replacement, newStart, newEnd) {
        var value = textarea.value;

        textarea.value = value.slice(0, start) + replacement + value.slice(end);
        textarea.selectionStart = newStart;
        textarea.selectionEnd = newEnd;
    }

    function indentSelection(textarea) {
        var value = textarea.value;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var lineStart = getLineStart(value, start);
        var lineEnd = getLineEnd(value, end);
        var block = value.slice(lineStart, lineEnd);
        var lines = block.split("\n");
        var replacement = lines.map(function (line) {
            return INDENT + line;
        }).join("\n");

        replaceRange(
            textarea,
            lineStart,
            lineEnd,
            replacement,
            start + INDENT.length,
            end + (INDENT.length * lines.length)
        );
    }

    function removeIndent(line) {
        if (line.indexOf(INDENT) === 0) {
            return line.slice(INDENT.length);
        }

        if (line.indexOf("\t") === 0) {
            return line.slice(1);
        }

        return line;
    }

    function getRemovedBeforeCursor(value, lineStart, cursor) {
        var before = value.slice(lineStart, cursor);
        var after = removeIndent(before);

        return before.length - after.length;
    }

    function outdentSelection(textarea) {
        var value = textarea.value;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var lineStart = getLineStart(value, start);
        var lineEnd = getLineEnd(value, end);
        var block = value.slice(lineStart, lineEnd);
        var replacement = block.split("\n").map(removeIndent).join("\n");
        var removedTotal = block.length - replacement.length;
        var removedBeforeStart = getRemovedBeforeCursor(value, lineStart, start);

        replaceRange(
            textarea,
            lineStart,
            lineEnd,
            replacement,
            Math.max(lineStart, start - removedBeforeStart),
            Math.max(lineStart, end - removedTotal)
        );
    }

    function insertIndent(textarea) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;

        replaceRange(textarea, start, end, INDENT, start + INDENT.length, start + INDENT.length);
    }

    function insertIndentedNewline(textarea) {
        var value = textarea.value;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var lineStart = getLineStart(value, start);
        var currentLine = value.slice(lineStart, start);
        var indentMatch = currentLine.match(/^\s*/);
        var nextIndent = indentMatch ? indentMatch[0] : "";

        if (/[\{\:\(]\s*$/.test(currentLine)) {
            nextIndent += INDENT;
        }

        replaceRange(
            textarea,
            start,
            end,
            "\n" + nextIndent,
            start + 1 + nextIndent.length,
            start + 1 + nextIndent.length
        );
    }

    function bindEditorKeys(textarea) {
        textarea.addEventListener("keydown", function (event) {
            if (event.key === "Tab") {
                event.preventDefault();

                if (event.shiftKey) {
                    outdentSelection(textarea);
                } else if (textarea.selectionStart === textarea.selectionEnd) {
                    insertIndent(textarea);
                } else {
                    indentSelection(textarea);
                }
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                insertIndentedNewline(textarea);
            }
        });
    }

    function render(component, container) {
        var data = component.data || {};
        var baseCode = typeof data.codigo_base === "string" ? data.codigo_base : "";
        var wrapper = createElement("section", "ia-assistant-student-code");
        var prompt = createElement(
            "p",
            "ia-assistant-student-code__prompt",
            data.enunciado || "Ejercicio de codigo sin enunciado."
        );
        var solution = createElement("div", "ia-assistant-student-code__solution");
        var label = createElement("label", "ia-assistant-student-code__solution-label", "Tu solucion");
        var textarea = document.createElement("textarea");
        var actions = createElement("div", "ia-assistant-student-code__actions");
        var resetButton = createElement("button", "ia-assistant-student-code__reset", "Restaurar codigo base");

        wrapper.appendChild(prompt);

        if (data.lenguaje) {
            wrapper.appendChild(createElement(
                "span",
                "ia-assistant-student-code__language",
                data.lenguaje
            ));
        }

        if (data.instrucciones) {
            wrapper.appendChild(createElement(
                "p",
                "ia-assistant-student-code__instructions",
                data.instrucciones
            ));
        }

        wrapper.appendChild(createElement(
            "p",
            "ia-assistant-student-code__note",
            "Este editor no ejecuta el código. Tu respuesta se guarda como texto y será revisada de forma orientativa."
        ));

        textarea.className = "ia-assistant-student-code__textarea";
        textarea.value = baseCode;
        textarea.placeholder = baseCode ?
            "Modifica el codigo base aqui..." :
            "No hay codigo base configurado. Puedes escribir tu solucion desde cero.";
        textarea.rows = Math.max(12, baseCode.split("\n").length + 3);
        textarea.spellcheck = false;
        textarea.autocomplete = "off";
        textarea.setAttribute("autocapitalize", "off");
        textarea.setAttribute("autocorrect", "off");
        textarea.setAttribute("wrap", "off");
        textarea.setAttribute("aria-label", "Editor de codigo del estudiante");
        bindEditorKeys(textarea);

        // prefill from frontend answers if present
        try {
            var existing = window.IAAssistant.Student.Answers && window.IAAssistant.Student.Answers.getAnswer(component.id);
            if (existing && typeof existing.value === 'string') {
                textarea.value = existing.value;
            }
        } catch (e) {}

        textarea.addEventListener('input', function () {
            if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                window.IAAssistant.Student.Answers.setAnswer(component.id, {
                    componentId: component.id,
                    tipo: 'codigo',
                    value: textarea.value,
                    metadata: { lenguaje: data.lenguaje || '' }
                });
            }
        });

        resetButton.type = "button";
        resetButton.addEventListener("click", function () {
            textarea.value = baseCode;
            textarea.focus();

            // update frontend answer to baseCode
            if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                window.IAAssistant.Student.Answers.setAnswer(component.id, {
                    componentId: component.id,
                    tipo: 'codigo',
                    value: textarea.value,
                    metadata: { lenguaje: data.lenguaje || '' }
                });
            }
        });

        label.appendChild(textarea);
        actions.appendChild(resetButton);
        solution.appendChild(label);
        solution.appendChild(actions);
        wrapper.appendChild(solution);
        container.appendChild(wrapper);
    }

    window.IAAssistant.Student.Components.CodigoPlayer = {
        render: render
    };
}());
