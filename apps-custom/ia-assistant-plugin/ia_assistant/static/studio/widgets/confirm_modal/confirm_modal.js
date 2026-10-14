(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var currentModal = null;
    var currentKeydownHandler = null;

    function removeCurrentModal() {
        if (currentKeydownHandler) {
            document.removeEventListener("keydown", currentKeydownHandler);
            currentKeydownHandler = null;
        }

        if (currentModal && currentModal.parentNode) {
            currentModal.parentNode.removeChild(currentModal);
        }

        currentModal = null;
    }

    function createButton(className, text) {
        var button = document.createElement("button");

        button.className = className;
        button.type = "button";
        button.textContent = text;

        return button;
    }

    function normalizeOptions(options) {
        return {
            title: options && options.title ? options.title : "Confirmar accion",
            message: options && options.message ? options.message : "Deseas continuar?",
            confirmText: options && options.confirmText ? options.confirmText : "Confirmar",
            cancelText: options && options.cancelText ? options.cancelText : "Cancelar",
            variant: options && options.variant ? options.variant : "default",
            onConfirm: options && options.onConfirm
        };
    }

    function confirm(options) {
        var modalOptions = normalizeOptions(options);
        var overlay = document.createElement("div");
        var modal = document.createElement("section");
        var header = document.createElement("header");
        var title = document.createElement("h3");
        var closeButton = createButton(
            "ia-assistant-confirm-modal__close",
            "×"
        );
        var message = document.createElement("p");
        var actions = document.createElement("div");
        var cancelButton = createButton(
            "ia-assistant-confirm-modal__button " +
                "ia-assistant-confirm-modal__button--secondary",
            modalOptions.cancelText
        );
        var confirmButton = createButton(
            "ia-assistant-confirm-modal__button " +
                "ia-assistant-confirm-modal__button--primary",
            modalOptions.confirmText
        );

        removeCurrentModal();

        overlay.className = "ia-assistant-confirm-modal";
        modal.className = "ia-assistant-confirm-modal__card";
        header.className = "ia-assistant-confirm-modal__header";
        title.className = "ia-assistant-confirm-modal__title";
        message.className = "ia-assistant-confirm-modal__message";
        actions.className = "ia-assistant-confirm-modal__actions";

        if (modalOptions.variant === "danger") {
            confirmButton.className = "ia-assistant-confirm-modal__button " +
                "ia-assistant-confirm-modal__button--danger";
        }

        overlay.setAttribute("role", "presentation");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        closeButton.setAttribute("aria-label", "Cerrar confirmacion");
        closeButton.setAttribute("title", "Cerrar");

        title.textContent = modalOptions.title;
        message.textContent = modalOptions.message;

        closeButton.addEventListener("click", removeCurrentModal);
        cancelButton.addEventListener("click", removeCurrentModal);
        confirmButton.addEventListener("click", function () {
            if (typeof modalOptions.onConfirm === "function") {
                modalOptions.onConfirm();
            }

            removeCurrentModal();
        });
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                removeCurrentModal();
            }
        });

        currentKeydownHandler = function (event) {
            if (event.key === "Escape") {
                removeCurrentModal();
            }
        };
        document.addEventListener("keydown", currentKeydownHandler);

        header.appendChild(title);
        header.appendChild(closeButton);
        actions.appendChild(cancelButton);
        actions.appendChild(confirmButton);
        modal.appendChild(header);
        modal.appendChild(message);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        currentModal = overlay;
        cancelButton.focus();
    }

    window.IAAssistant.Studio.ConfirmModal = {
        confirm: confirm
    };
}());
