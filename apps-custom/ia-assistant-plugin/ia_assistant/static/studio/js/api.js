(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var saveUrl = "";
    var generateTeacherUnitUrl = "";
    var generateTeacherComponentCreateUrl = "";
    var generateTeacherComponentEditUrl = "";

    function getCookie(name) {
        var cookieName = name + "=";
        var cookies = document.cookie ? document.cookie.split(";") : [];
        var index;
        var cookie;

        for (index = 0; index < cookies.length; index += 1) {
            cookie = cookies[index].trim();

            if (cookie.indexOf(cookieName) === 0) {
                return decodeURIComponent(cookie.slice(cookieName.length));
            }
        }

        return "";
    }

    function createJsonHeaders() {
        var csrfToken = getCookie("csrftoken") || getCookie("csrf_token");
        var headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        };

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        } else if (window.console && window.console.warn) {
            window.console.warn(
                "No se encontro cookie CSRF; el guardado podria fallar con 403."
            );
        }

        return headers;
    }

    function parseJsonResponse(response) {
        return response.json().catch(function () {
            throw new Error("Respuesta invalida del servidor.");
        });
    }

    function getPayloadErrors(payload) {
        return payload && Array.isArray(payload.errors) ? payload.errors : [];
    }

    function getPayloadWarnings(payload) {
        return payload && Array.isArray(payload.warnings) ? payload.warnings : [];
    }

    function getPayloadErrorMessage(payload) {
        var errors = getPayloadErrors(payload);
        var firstError = errors.length ? errors[0] : null;

        if (
            firstError &&
            typeof firstError.message === "string" &&
            firstError.message.trim()
        ) {
            return firstError.message.trim();
        }

        if (
            payload &&
            typeof payload.error === "string" &&
            payload.error.trim()
        ) {
            return payload.error.trim();
        }

        return "No se pudo guardar la unidad.";
    }

    function createApiError(message, payload, status) {
        var error = new Error(message || "No se pudo guardar la unidad.");

        error.errors = getPayloadErrors(payload);
        error.warnings = getPayloadWarnings(payload);
        error.ok = payload && typeof payload.ok !== "undefined" ? payload.ok : undefined;
        error.success = (
            payload && typeof payload.success !== "undefined" ?
                payload.success :
                undefined
        );
        error.status = status;
        error.payload = payload || null;

        return error;
    }

    function createHttpError(response) {
        return response.text().catch(function () {
            return "";
        }).then(function (responseText) {
            var payload = null;

            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch (error) {
                    payload = null;
                }
            }

            if (payload) {
                throw createApiError(
                    getPayloadErrorMessage(payload),
                    payload,
                    response.status
                );
            }

            if (response.status === 403) {
                throw createApiError(
                    "No se pudo guardar la unidad: CSRF token faltante o invalido.",
                    null,
                    response.status
                );
            }

            throw createApiError(
                "No se pudo guardar la unidad.",
                null,
                response.status
            );
        });
    }

    function ensureOkResponse(payload) {
        if (!payload || payload.ok === false || payload.success === false) {
            throw createApiError(
                getPayloadErrorMessage(payload),
                payload,
                null
            );
        }

        return payload;
    }

    function postJson(url, payload) {
        if (!url) {
            return Promise.reject(
                new Error("No hay URL configurada para esta accion.")
            );
        }

        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: createJsonHeaders(),
            body: JSON.stringify(payload || {})
        }).then(function (response) {
            if (!response.ok) {
                return createHttpError(response);
            }

            return parseJsonResponse(response);
        }).then(ensureOkResponse);
    }

    window.IAAssistant.Studio.Api = {
        configure: function (options) {
            var apiOptions = options || {};

            saveUrl = apiOptions.saveUrl || "";
            generateTeacherUnitUrl = apiOptions.generateTeacherUnitUrl || "";
            generateTeacherComponentCreateUrl =
                apiOptions.generateTeacherComponentCreateUrl || "";
            generateTeacherComponentEditUrl =
                apiOptions.generateTeacherComponentEditUrl || "";
        },

        isConfigured: function () {
            return Boolean(saveUrl);
        },

        saveUnit: function (unit, weight) {
            var payload = {
                unit: unit
            };

            if (typeof weight !== "undefined") {
                payload.weight = weight;
            }

            return postJson(saveUrl, payload);
        },

        generateTeacherUnit: function (promptDocente, contexto) {
            return postJson(generateTeacherUnitUrl, {
                prompt_docente: promptDocente,
                contexto: contexto || {}
            });
        },

        generateTeacherComponentCreate: function (
            promptDocente,
            targetComponentType,
            unitContext
        ) {
            return postJson(generateTeacherComponentCreateUrl, {
                prompt_docente: promptDocente,
                target_component_type: targetComponentType,
                unit_context: unitContext || {}
            });
        },

        generateTeacherComponentEdit: function (
            promptDocente,
            activeComponent,
            unitContext
        ) {
            return postJson(generateTeacherComponentEditUrl, {
                prompt_docente: promptDocente,
                active_component: activeComponent,
                unit_context: unitContext || {}
            });
        }
    };
}());
