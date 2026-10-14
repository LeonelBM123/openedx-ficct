import unittest

from ia_assistant.validators import validate_and_normalize_studio_unit


def build_valid_unit():
    return {
        "version": 1,
        "titulo": "Unidad de prueba",
        "componentes": [
            {
                "id": "teoria_1",
                "tipo": "teoria",
                "nombre": "Introducción",
                "data": {
                    "titulo": "Introducción",
                    "contenido": "Contenido base",
                    "formato": "markdown",
                },
            },
            {
                "id": "quiz_multiple_1",
                "tipo": "quiz_multiple",
                "nombre": "Quiz inicial",
                "puntaje": 5,
                "data": {
                    "pregunta": "¿Cuál es la respuesta correcta?",
                    "opciones": [
                        {
                            "id": "opcion_a",
                            "texto": "A",
                            "feedback": "",
                        },
                        {
                            "id": "opcion_b",
                            "texto": "B",
                            "feedback": "",
                        },
                    ],
                    "respuestas_correctas": ["opcion_a"],
                },
            },
        ],
    }


class StudioUnitValidationTests(unittest.TestCase):
    def test_accepts_valid_unit(self):
        payload = validate_and_normalize_studio_unit(build_valid_unit())

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["unit"]["version"], 1)
        self.assertEqual(len(payload["unit"]["componentes"]), 2)
        self.assertEqual(payload["unit"]["componentes"][0]["puntaje"], 0)
        self.assertEqual(payload["unit"]["componentes"][1]["puntaje"], 5)

    def test_rejects_revision_component(self):
        unit = build_valid_unit()
        unit["componentes"].append(
            {
                "id": "revision_1",
                "tipo": "revision",
                "nombre": "Revision final",
                "data": {
                    "instrucciones": "",
                    "criterios": [],
                },
            }
        )

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "forbidden_revision_component",
        )

    def test_rejects_duplicate_component_ids(self):
        unit = build_valid_unit()
        unit["componentes"][1]["id"] = "teoria_1"

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "duplicate_component_id",
        )

    def test_rejects_quiz_with_missing_correct_answer_option(self):
        unit = build_valid_unit()
        unit["componentes"][1]["data"]["respuestas_correctas"] = ["opcion_z"]

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "missing_quiz_correct_answer_option",
        )

    def test_rejects_code_without_language(self):
        unit = {
            "version": 1,
            "titulo": "Unidad código",
            "componentes": [
                {
                    "id": "codigo_1",
                    "tipo": "codigo",
                    "nombre": "Práctica",
                    "data": {
                        "enunciado": "Resuelve el ejercicio",
                        "lenguaje": "",
                        "codigo_base": "",
                        "instrucciones": "",
                    },
                }
            ],
        }

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(payload["errors"][0]["code"], "missing_code_language")

    def test_accepts_open_question_without_rubric_and_returns_warning(self):
        unit = {
            "version": 1,
            "titulo": "Unidad abierta",
            "componentes": [
                {
                    "id": "pregunta_abierta_1",
                    "tipo": "pregunta_abierta",
                    "nombre": "Reflexión",
                    "data": {
                        "enunciado": "Explica tu respuesta",
                        "rubrica": "",
                    },
                }
            ],
        }

        payload = validate_and_normalize_studio_unit(unit)

        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["warnings"]), 1)

    def test_normalizes_missing_theory_format_to_markdown(self):
        unit = build_valid_unit()
        del unit["componentes"][0]["data"]["formato"]

        payload = validate_and_normalize_studio_unit(unit)

        self.assertTrue(payload["ok"])
        self.assertEqual(
            payload["unit"]["componentes"][0]["data"]["formato"],
            "markdown",
        )

    def test_normalizes_missing_score_to_zero_for_legacy_units(self):
        unit = build_valid_unit()
        del unit["componentes"][1]["puntaje"]

        payload = validate_and_normalize_studio_unit(unit)

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["unit"]["componentes"][1]["puntaje"], 0)

    def test_rejects_negative_component_score(self):
        unit = build_valid_unit()
        unit["componentes"][1]["puntaje"] = -1

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "invalid_component_score_value",
        )

    def test_rejects_decimal_component_score(self):
        unit = build_valid_unit()
        unit["componentes"][1]["puntaje"] = 2.5

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "invalid_component_score_type",
        )

    def test_rejects_string_component_score(self):
        unit = build_valid_unit()
        unit["componentes"][1]["puntaje"] = "5"

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "invalid_component_score_type",
        )

    def test_rejects_null_component_score(self):
        unit = build_valid_unit()
        unit["componentes"][1]["puntaje"] = None

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["errors"][0]["code"],
            "invalid_component_score_type",
        )

    def test_rejects_teoria_score_different_from_zero(self):
        unit = build_valid_unit()
        unit["componentes"][0]["puntaje"] = 1

        payload = validate_and_normalize_studio_unit(unit)

        self.assertFalse(payload["ok"])
        self.assertEqual(payload["errors"][0]["code"], "invalid_teoria_score")


if __name__ == "__main__":
    unittest.main()
