(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    function setNotice(root, message, variant) {
        var Dom = window.IAAssistant.Student.Dom;
        var notice = Dom.getNotice(root);

        if (!notice) {
            return;
        }

        notice.className = "ia-assistant-student__notice";

        if (!message) {
            notice.hidden = true;
            notice.textContent = "";
            return;
        }

        notice.textContent = message;
        notice.hidden = false;

        if (variant) {
            notice.classList.add("ia-assistant-student__notice--" + variant);
        }
    }

    function init(root, initArgs) {
        var args = initArgs || {};

        if (args.load_warning) {
            setNotice(root, args.load_warning, "warning");
        } else {
            setNotice(root, "", "");
        }
    }

    window.IAAssistant.Student.Events = {
        init: init,
        setNotice: setNotice
    };
}());
