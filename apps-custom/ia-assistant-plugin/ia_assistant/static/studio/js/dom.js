(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    window.IAAssistant.Studio.Dom = {
        getRoot: function () {
            return document.querySelector(".ia-assistant-studio");
        },

        getComponentPicker: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-picker");
        },

        getComponentPickerButton: function (root) {
            var componentPicker = this.getComponentPicker(root);

            if (!componentPicker) {
                return null;
            }

            return componentPicker.querySelector(".ia-assistant-component-picker__button");
        },

        getComponentTabs: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-tabs");
        },

        getComponentEditor: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-editor");
        },

        getUnitTitleInput: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-unit-title]");
        },

        getUnitScoreSummary: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-unit-score]");
        },

        getJsonToggleButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-toggle");
        },

        getSaveButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-save-button");
        },

        getSaveStatus: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-save-status");
        },

        getStudentPreviewButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-student-preview-button]");
        },

        getStudentPreview: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-student-preview]");
        },

        getStudentPreviewCloseButtons: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return [];
            }

            return currentRoot.querySelectorAll("[data-ia-assistant-student-preview-close]");
        },

        getChatbarProposalPreview: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-chatbar-preview]");
        },

        getChatbarProposalPreviewCloseButtons: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return [];
            }

            return currentRoot.querySelectorAll(
                "[data-ia-assistant-chatbar-preview-close]"
            );
        },

        getChatbarProposalPreviewTitle: function (root) {
            var preview = this.getChatbarProposalPreview(root);

            if (!preview) {
                return null;
            }

            return preview.querySelector(
                "[data-ia-assistant-chatbar-preview-title]"
            );
        },

        getChatbarProposalPreviewSubtitle: function (root) {
            var preview = this.getChatbarProposalPreview(root);

            if (!preview) {
                return null;
            }

            return preview.querySelector(
                "[data-ia-assistant-chatbar-preview-subtitle]"
            );
        },

        getChatbarProposalPreviewBody: function (root) {
            var preview = this.getChatbarProposalPreview(root);

            if (!preview) {
                return null;
            }

            return preview.querySelector(
                "[data-ia-assistant-chatbar-preview-body]"
            );
        },

        getChatbarProposalPreviewApplyButton: function (root) {
            var preview = this.getChatbarProposalPreview(root);

            if (!preview) {
                return null;
            }

            return preview.querySelector(
                "[data-ia-assistant-chatbar-preview-apply]"
            );
        },

        getChatbarProposalPreviewDiscardButton: function (root) {
            var preview = this.getChatbarProposalPreview(root);

            if (!preview) {
                return null;
            }

            return preview.querySelector(
                "[data-ia-assistant-chatbar-preview-discard]"
            );
        },

        getChatbarConfirm: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-chatbar-confirm]");
        },

        getChatbarConfirmCloseButtons: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return [];
            }

            return currentRoot.querySelectorAll(
                "[data-ia-assistant-chatbar-confirm-close]"
            );
        },

        getChatbarConfirmTitle: function (root) {
            var confirmDialog = this.getChatbarConfirm(root);

            if (!confirmDialog) {
                return null;
            }

            return confirmDialog.querySelector(
                "[data-ia-assistant-chatbar-confirm-title]"
            );
        },

        getChatbarConfirmBody: function (root) {
            var confirmDialog = this.getChatbarConfirm(root);

            if (!confirmDialog) {
                return null;
            }

            return confirmDialog.querySelector(
                "[data-ia-assistant-chatbar-confirm-body]"
            );
        },

        getChatbarConfirmCancelButton: function (root) {
            var confirmDialog = this.getChatbarConfirm(root);

            if (!confirmDialog) {
                return null;
            }

            return confirmDialog.querySelector(
                "[data-ia-assistant-chatbar-confirm-cancel]"
            );
        },

        getChatbarConfirmApplyButton: function (root) {
            var confirmDialog = this.getChatbarConfirm(root);

            if (!confirmDialog) {
                return null;
            }

            return confirmDialog.querySelector(
                "[data-ia-assistant-chatbar-confirm-apply]"
            );
        },

        getJsonPanel: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-panel");
        },

        getJsonModalOverlay: function (root) {
            return this.getJsonPanel(root);
        },

        getJsonModal: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-modal");
        },

        getJsonOutput: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-output");
        },

        getJsonCloseButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-close");
        },

        getJsonCopyButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-copy");
        }
    };
}());
