(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    window.IAAssistantStudent = function (runtime, element, initArgs) {
        var Student = window.IAAssistant.Student;
        var args = initArgs || {};
        var root;

        if (!Student.Dom || !Student.State || !Student.Events || !Student.Renderer) {
            if (window.console && window.console.warn) {
                window.console.warn("IA Assistant Student no pudo inicializarse: faltan modulos base.");
            }
            return;
        }

        root = Student.Dom.getRoot(element);

        if (!root) {
            if (window.console && window.console.warn) {
                window.console.warn("IA Assistant Student no encontro el contenedor raiz.");
            }
            return;
        }

        Student.State.loadUnit(args.initial_unit);
        if (typeof Student.Answers === "object" && typeof Student.Answers.loadAnswers === "function") {
            Student.Answers.loadAnswers(args.initial_student_answers || {});
        }
        if (typeof Student.ReviewState === "object" && typeof Student.ReviewState.loadReview === "function") {
            Student.ReviewState.loadReview(args.initial_student_review_result || {});
        }

        if (typeof Student.AutoSave === "object" && typeof Student.AutoSave.init === "function") {
            Student.AutoSave.init(runtime, element, root);
        }

        Student.Events.init(root, args);
        Student.Renderer.render(root);
    };
}());
