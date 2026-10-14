(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    var languages = [
        { value: "python", label: "Python" },
        { value: "javascript", label: "JavaScript" },
        { value: "typescript", label: "TypeScript" },
        { value: "java", label: "Java" },
        { value: "c", label: "C" },
        { value: "cpp", label: "C++" },
        { value: "csharp", label: "C#" },
        { value: "sql", label: "SQL" },
        { value: "php", label: "PHP" },
        { value: "bash", label: "Bash" },
        { value: "html", label: "HTML" }
    ];

    var templates = {
        python: "print(\"Hola mundo\")",
        javascript: "console.log(\"Hola mundo\");",
        typescript: "console.log(\"Hola mundo\");",
        java: [
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(\"Hola mundo\");",
            "    }",
            "}"
        ].join("\n"),
        c: [
            "#include <stdio.h>",
            "",
            "int main() {",
            "    printf(\"Hola mundo\\n\");",
            "    return 0;",
            "}"
        ].join("\n"),
        cpp: [
            "#include <iostream>",
            "using namespace std;",
            "",
            "int main() {",
            "    cout << \"Hola mundo\" << endl;",
            "    return 0;",
            "}"
        ].join("\n"),
        csharp: [
            "using System;",
            "",
            "class Program {",
            "    static void Main() {",
            "        Console.WriteLine(\"Hola mundo\");",
            "    }",
            "}"
        ].join("\n"),
        sql: "SELECT 'Hola mundo' AS mensaje;",
        php: [
            "<?php",
            "echo \"Hola mundo\\n\";"
        ].join("\n"),
        bash: "echo \"Hola mundo\"",
        html: [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            "    <meta charset=\"UTF-8\">",
            "    <title>Ejercicio</title>",
            "</head>",
            "<body>",
            "    <script>",
            "        console.log(\"Hola mundo\");",
            "    <" + "/script>",
            "</body>",
            "</html>"
        ].join("\n")
    };

    function copyLanguage(language) {
        return {
            value: language.value,
            label: language.label
        };
    }

    window.IAAssistant.Studio.Components.CodigoBase = {
        getLanguages: function () {
            return languages.map(copyLanguage);
        },

        getTemplate: function (languageValue) {
            return templates[languageValue] || "";
        },

        hasTemplate: function (languageValue) {
            return Object.prototype.hasOwnProperty.call(templates, languageValue);
        }
    };
}());
