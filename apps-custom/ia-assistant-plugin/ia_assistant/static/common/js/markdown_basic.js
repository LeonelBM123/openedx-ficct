(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    function normalizeMarkdown(markdown) {
        if (typeof markdown !== "string") {
            return "";
        }

        return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }

    function escapeText(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isHeading(line) {
        return /^#{1,3}\s+/.test(String(line || ""));
    }

    function getHeadingLevel(line) {
        var match = String(line || "").match(/^(#{1,3})\s+/);

        return match ? match[1].length : 0;
    }

    function isHorizontalRule(line) {
        return /^\s*---+\s*$/.test(String(line || ""));
    }

    function isBulletListItem(line) {
        return /^\s*-\s+/.test(String(line || ""));
    }

    function isNumberedListItem(line) {
        return /^\s*\d+\.\s+/.test(String(line || ""));
    }

    function isQuote(line) {
        return /^\s*>\s?/.test(String(line || ""));
    }

    function isCodeFence(line) {
        return /^\s*```/.test(String(line || ""));
    }

    function getHeadingText(line) {
        return String(line || "").replace(/^#{1,3}\s+/, "");
    }

    function getBulletListText(line) {
        return String(line || "").replace(/^\s*-\s+/, "");
    }

    function getNumberedListText(line) {
        return String(line || "").replace(/^\s*\d+\.\s+/, "");
    }

    function getQuoteText(line) {
        return String(line || "").replace(/^\s*>\s?/, "");
    }

    function parseInlineTokens(text) {
        var source = String(text || "");
        var pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
        var tokens = [];
        var currentIndex = 0;
        var match;
        var token;

        while ((match = pattern.exec(source)) !== null) {
            if (match.index > currentIndex) {
                tokens.push({
                    type: "text",
                    text: source.slice(currentIndex, match.index)
                });
            }

            token = match[0];
            if (token.indexOf("**") === 0) {
                tokens.push({
                    type: "bold",
                    text: token.slice(2, -2)
                });
            } else if (token.indexOf("*") === 0) {
                tokens.push({
                    type: "italic",
                    text: token.slice(1, -1)
                });
            } else {
                tokens.push({
                    type: "code",
                    text: token.slice(1, -1)
                });
            }

            currentIndex = match.index + token.length;
        }

        if (currentIndex < source.length) {
            tokens.push({
                type: "text",
                text: source.slice(currentIndex)
            });
        }

        return tokens;
    }

    function getSupportedFeatures() {
        return [
            "paragraph",
            "h1",
            "h2",
            "h3",
            "bold",
            "italic",
            "bullet_list",
            "numbered_list",
            "quote",
            "inline_code",
            "code_block",
            "horizontal_rule",
            "advanced_markdown_mode"
        ];
    }

    window.IAAssistant.MarkdownBasic = {
        escapeText: escapeText,
        normalizeMarkdown: normalizeMarkdown,
        getSupportedFeatures: getSupportedFeatures,
        isHeading: isHeading,
        getHeadingLevel: getHeadingLevel,
        isHorizontalRule: isHorizontalRule,
        isBulletListItem: isBulletListItem,
        isNumberedListItem: isNumberedListItem,
        isQuote: isQuote,
        isCodeFence: isCodeFence,
        getHeadingText: getHeadingText,
        getBulletListText: getBulletListText,
        getNumberedListText: getNumberedListText,
        getQuoteText: getQuoteText,
        parseInlineTokens: parseInlineTokens
    };
}());
