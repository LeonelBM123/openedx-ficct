(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};

  function getCookie(name) {
    try {
      var parts = document.cookie.split(";");
      for (var i = 0; i < parts.length; i++) {
        var c = parts[i].trim();
        if (c.indexOf(name + "=") === 0)
          return decodeURIComponent(c.substring(name.length + 1));
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function saveAnswers(runtime, element, answers, callback) {
    var payload = {
      answers: answers || {},
    };

    if (!runtime || typeof runtime.handlerUrl !== "function") {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se encontro la URL del handler para guardar respuestas.",
        });
      }
      return;
    }

    var url = runtime.handlerUrl(element, "save_student_answers");
    if (!url) {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se encontro la URL del handler para guardar respuestas.",
        });
      }
      return;
    }

    var csrf = getCookie("csrftoken");
    var headers = {
      "Content-Type": "application/json",
    };
    if (csrf) {
      headers["X-CSRFToken"] = csrf;
    }

    // Use fetch if available; fallback to XHR
    if (typeof fetch === "function") {
      try {
        fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            if (!response.ok) {
              return response
                .text()
                .then(function (text) {
                  var err = text || "Error de red";
                  if (callback)
                    callback({ ok: false, success: false, error: err });
                  return null;
                })
                .catch(function () {
                  if (callback)
                    callback({
                      ok: false,
                      success: false,
                      error: "Error de red",
                    });
                  return null;
                });
            }
            return response
              .json()
              .then(function (json) {
                if (callback) callback(json);
              })
              .catch(function () {
                if (callback)
                  callback({
                    ok: false,
                    success: false,
                    error: "Respuesta invalida del servidor.",
                  });
              });
          })
          .catch(function () {
            if (callback)
              callback({
                ok: false,
                success: false,
                error: "No se pudo enviar la solicitud de guardado.",
              });
          });
      } catch (e) {
        if (callback)
          callback({
            ok: false,
            success: false,
            error: "No se pudo enviar la solicitud de guardado.",
          });
      }
      return;
    }

    // Fallback XHR with credentials
    var xhr = new XMLHttpRequest();
    try {
      xhr.open("POST", url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      if (csrf) xhr.setRequestHeader("X-CSRFToken", csrf);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var result = {
          ok: false,
          success: false,
          error: "Respuesta invalida del servidor.",
        };
        try {
          result = JSON.parse(xhr.responseText || "{}");
        } catch (error) {
          result = {
            ok: false,
            success: false,
            error: "No se pudo interpretar la respuesta del servidor.",
          };
        }
        if (callback) callback(result);
      };
      xhr.send(JSON.stringify(payload));
    } catch (error) {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se pudo enviar la solicitud de guardado.",
        });
      }
    }
  }

  function requestReview(runtime, element, componentIds, callback) {
    var payload = {};
    if (Array.isArray(componentIds)) {
      payload.component_ids = componentIds;
    }

    if (!runtime || typeof runtime.handlerUrl !== "function") {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se encontro la URL del handler para solicitar revisión.",
        });
      }
      return;
    }

    var url = runtime.handlerUrl(element, "request_student_review");
    if (!url) {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se encontro la URL del handler para solicitar revisión.",
        });
      }
      return;
    }

    var csrf = getCookie("csrftoken");
    var headers = {
      "Content-Type": "application/json",
    };
    if (csrf) {
      headers["X-CSRFToken"] = csrf;
    }

    if (typeof fetch === "function") {
      try {
        fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then(function (response) {
            if (!response.ok) {
              return response
                .text()
                .then(function (text) {
                  var err = text || "Error de red";
                  if (callback)
                    callback({ ok: false, success: false, error: err });
                  return null;
                })
                .catch(function () {
                  if (callback)
                    callback({
                      ok: false,
                      success: false,
                      error: "Error de red",
                    });
                  return null;
                });
            }
            return response
              .json()
              .then(function (json) {
                if (callback) callback(json);
              })
              .catch(function () {
                if (callback)
                  callback({
                    ok: false,
                    success: false,
                    error: "Respuesta invalida del servidor.",
                  });
              });
          })
          .catch(function () {
            if (callback)
              callback({
                ok: false,
                success: false,
                error: "No se pudo enviar la solicitud.",
              });
          });
      } catch (e) {
        if (callback)
          callback({
            ok: false,
            success: false,
            error: "No se pudo enviar la solicitud.",
          });
      }
      return;
    }

    var xhr = new XMLHttpRequest();
    try {
      xhr.open("POST", url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      if (csrf) xhr.setRequestHeader("X-CSRFToken", csrf);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var result = {
          ok: false,
          success: false,
          error: "Respuesta invalida del servidor.",
        };
        try {
          result = JSON.parse(xhr.responseText || "{}");
        } catch (error) {
          result = {
            ok: false,
            success: false,
            error: "No se pudo interpretar la respuesta del servidor.",
          };
        }
        if (callback) callback(result);
      };
      xhr.send(JSON.stringify(payload));
    } catch (error) {
      if (callback) {
        callback({
          ok: false,
          success: false,
          error: "No se pudo enviar la solicitud.",
        });
      }
    }
  }

  window.IAAssistant.Student.Api = {
    saveAnswers: saveAnswers,
    requestReview: requestReview,
  };
})();
