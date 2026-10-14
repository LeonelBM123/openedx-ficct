import json
import unittest
from unittest.mock import Mock, patch

from xblock.field_data import DictFieldData
from xblock.fields import ScopeIds
from xblock.test.tools import TestRuntime

from ia_assistant.xblock import IAAssistantXBlock


def build_quiz_component(component_id="quiz_1", puntaje=5):
    return {
        "id": component_id,
        "tipo": "quiz_multiple",
        "nombre": "Quiz",
        "puntaje": puntaje,
        "data": {
            "pregunta": "Pregunta",
            "opciones": [
                {"id": "a", "texto": "A", "feedback": ""},
                {"id": "b", "texto": "B", "feedback": ""},
            ],
            "respuestas_correctas": ["a"],
        },
    }


def build_unit():
    return {
        "version": 1,
        "titulo": "Unidad",
        "componentes": [build_quiz_component()],
    }


def build_answers():
    return {
        "quiz_1": {
            "componentId": "quiz_1",
            "tipo": "quiz_multiple",
            "value": "a",
            "metadata": {},
        }
    }


def build_review(total_obtenido, total_maximo):
    return {
        "status": "ai",
        "resumen_general": "Resumen",
        "componentes": [
            {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "estado": "bien",
                "comentario": "Comentario",
                "sugerencia": "Sugerencia",
                "puntaje_obtenido": total_obtenido,
                "puntaje_maximo": total_maximo,
            }
        ],
        "recomendaciones": [],
        "puntaje_total_obtenido": total_obtenido,
        "puntaje_total_maximo": total_maximo,
    }


class GradePublishTests(unittest.TestCase):
    def call_request_student_review(self, block, data=None, suffix=""):
        handler = getattr(
            IAAssistantXBlock.request_student_review,
            "__wrapped__",
            None,
        )
        if handler is None:
            raise AssertionError("No se encontro el handler original.")

        return handler(block, data or {}, suffix)

    def build_block(self):
        runtime = TestRuntime(services={"field-data": DictFieldData({})})
        runtime.publish = Mock()
        block = IAAssistantXBlock(
            runtime,
            scope_ids=ScopeIds("student", "ia_assistant", "def_id", "usage_id"),
        )
        block.unidad_json = json.dumps(build_unit(), ensure_ascii=False)
        block.student_answers = build_answers()
        return block, runtime

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_publishes_grade_with_raw_score(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        mock_generate_student_review.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(135, 155),
        }

        result = self.call_request_student_review(block)

        runtime.publish.assert_called_once_with(
            block,
            "grade",
            {
                "value": 135,
                "max_value": 155,
            },
        )
        self.assertTrue(result["ok"])
        self.assertTrue(result["review"]["_ia_assistant"]["grade_published"])
        self.assertEqual(
            result["review"]["_ia_assistant"]["grade_value"], 135
        )
        self.assertEqual(
            result["review"]["_ia_assistant"]["grade_max_value"], 155
        )

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_does_not_publish_without_valid_max_score(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        mock_generate_student_review.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(0, 0),
        }

        result = self.call_request_student_review(block)

        runtime.publish.assert_not_called()
        self.assertTrue(result["ok"])
        self.assertFalse(
            result["review"]["_ia_assistant"]["grade_published"]
        )
        self.assertNotIn("grade_value", result["review"]["_ia_assistant"])

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_does_not_publish_when_review_fails(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        mock_generate_student_review.return_value = {
            "ok": False,
            "success": False,
            "error": "No se pudo generar la revision.",
        }

        result = self.call_request_student_review(block)

        runtime.publish.assert_not_called()
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "No se pudo generar la revision.")

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_publishes_on_each_resend(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        mock_generate_student_review.side_effect = [
            {
                "ok": True,
                "success": True,
                "review": build_review(10, 20),
            },
            {
                "ok": True,
                "success": True,
                "review": build_review(18, 20),
            },
        ]

        first_result = self.call_request_student_review(block)
        second_result = self.call_request_student_review(block)

        self.assertEqual(runtime.publish.call_count, 2)
        self.assertEqual(
            runtime.publish.call_args_list[0].args,
            (
                block,
                "grade",
                {"value": 10, "max_value": 20},
            ),
        )
        self.assertEqual(
            runtime.publish.call_args_list[1].args,
            (
                block,
                "grade",
                {"value": 18, "max_value": 20},
            ),
        )
        self.assertEqual(
            first_result["review"]["_ia_assistant"]["grade_value"], 10
        )
        self.assertEqual(
            second_result["review"]["_ia_assistant"]["grade_value"], 18
        )

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_never_normalizes_grade_to_100(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        mock_generate_student_review.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(135, 155),
        }

        self.call_request_student_review(block)

        published_payload = runtime.publish.call_args.args[2]
        self.assertEqual(published_payload["value"], 135)
        self.assertEqual(published_payload["max_value"], 155)
        self.assertNotEqual(published_payload["value"], 87)
        self.assertNotEqual(published_payload["max_value"], 100)

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_request_student_review_returns_warning_when_publish_fails(
        self, mock_generate_student_review
    ):
        block, runtime = self.build_block()
        runtime.publish.side_effect = RuntimeError("publish failed")
        mock_generate_student_review.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(12, 20),
        }

        result = self.call_request_student_review(block)

        runtime.publish.assert_called_once()
        self.assertTrue(result["ok"])
        self.assertIn("warnings", result)
        self.assertFalse(
            result["review"]["_ia_assistant"]["grade_published"]
        )
        self.assertEqual(
            result["review"]["_ia_assistant"]["grade_publish_error"],
            "publish failed",
        )


if __name__ == "__main__":
    unittest.main()


class ReviewHistoryAndWeightTests(unittest.TestCase):
    def build_block(self, unit=None):
        runtime = TestRuntime(services={"field-data": DictFieldData({})})
        runtime.publish = Mock()
        block = IAAssistantXBlock(
            runtime,
            scope_ids=ScopeIds("student", "ia_assistant", "def_id", "usage_id"),
        )
        block.unidad_json = json.dumps(unit or build_unit(), ensure_ascii=False)
        block.student_answers = build_answers()
        return block

    def request_review(self, block):
        handler = IAAssistantXBlock.request_student_review.__wrapped__
        return handler(block, {}, "")

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_review_appends_history_entry(self, mock_generate):
        block = self.build_block()
        mock_generate.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(3, 5),
        }

        self.request_review(block)

        self.assertEqual(len(block.student_review_history), 1)
        entry = block.student_review_history[0]
        self.assertEqual(entry["value"], 3)
        self.assertEqual(entry["max_value"], 5)
        self.assertTrue(entry["grade_published"])
        self.assertIn("timestamp", entry)

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_history_is_capped(self, mock_generate):
        block = self.build_block()
        mock_generate.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(1, 5),
        }

        for _ in range(IAAssistantXBlock.MAX_REVIEW_HISTORY + 5):
            self.request_review(block)

        self.assertEqual(
            len(block.student_review_history),
            IAAssistantXBlock.MAX_REVIEW_HISTORY,
        )

    @patch("ia_assistant.services.student_review_service.generate_student_review")
    def test_history_records_unpublished_grade(self, mock_generate):
        block = self.build_block()
        mock_generate.return_value = {
            "ok": True,
            "success": True,
            "review": build_review(0, 0),
        }

        self.request_review(block)

        self.assertFalse(block.student_review_history[0]["grade_published"])

    def test_max_score_sums_gradable_components(self):
        unit = build_unit()
        unit["componentes"].append(
            {"id": "teoria_1", "tipo": "teoria", "nombre": "T", "puntaje": 0,
             "data": {"formato": "markdown", "contenido": "x"}}
        )
        self.assertEqual(self.build_block(unit).max_score(), 5)

    def test_max_score_is_none_without_points(self):
        unit = {"version": 1, "titulo": "U", "componentes": []}
        self.assertIsNone(self.build_block(unit).max_score())

    def test_parse_weight(self):
        parse = IAAssistantXBlock._parse_weight
        self.assertEqual(parse(None), (None, ""))
        self.assertEqual(parse(""), (None, ""))
        self.assertEqual(parse("2.5"), (2.5, ""))
        self.assertEqual(parse(10), (10.0, ""))
        for bad in ("abc", "0", -1, True, "nan"):
            value, error = parse(bad)
            self.assertIsNone(value)
            self.assertTrue(error)
