import unittest

from ia_assistant.validators import (
    teacher_prompt_requests_score,
    validate_and_normalize_generated_component,
    validate_and_normalize_generated_unit,
)


def build_generated_unit():
    return {
        "version": 1,
        "titulo": "Unidad IA",
        "componentes": [
            {
                "id": "teoria_1",
                "tipo": "teoria",
                "nombre": "Marco teorico",
                "data": {
                    "titulo": "Marco teorico",
                    "formato": "markdown",
                    "contenido": "Contenido base",
                },
            },
            {
                "id": "quiz_multiple_1",
                "tipo": "quiz_multiple",
                "nombre": "Quiz",
                "data": {
                    "pregunta": "Pregunta",
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
            {
                "id": "codigo_1",
                "tipo": "codigo",
                "nombre": "Codigo",
                "data": {
                    "enunciado": "Resuelve",
                    "lenguaje": "python",
                    "codigo_base": "",
                    "instrucciones": "Sigue las instrucciones",
                },
            },
        ],
    }


class GeneratedPuntajeValidationTests(unittest.TestCase):
    def test_detects_score_request_terms(self):
        self.assertTrue(
            teacher_prompt_requests_score(
                "Crea un quiz que valga 5 puntos."
            )
        )
        self.assertTrue(
            teacher_prompt_requests_score(
                "Agrega una pregunta con puntaje 3."
            )
        )
        self.assertTrue(
            teacher_prompt_requests_score(
                "Haz un ejercicio con calificación máxima de 10."
            )
        )
        self.assertFalse(
            teacher_prompt_requests_score(
                "Genera una unidad completa sobre POO con teoría y quiz."
            )
        )

    def test_generated_unit_defaults_missing_scores_to_zero(self):
        payload = validate_and_normalize_generated_unit(
            build_generated_unit(),
            teacher_prompt=(
                "Genera una unidad completa sobre Programación "
                "Orientada a Objetos con teoría, quiz, pregunta abierta y código."
            ),
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["unit"]["componentes"][0]["puntaje"], 0)
        self.assertEqual(payload["unit"]["componentes"][1]["puntaje"], 0)
        self.assertEqual(payload["unit"]["componentes"][2]["puntaje"], 0)

    def test_generated_component_preserves_valid_score(self):
        component = {
            "id": "quiz_multiple_2",
            "tipo": "quiz_multiple",
            "nombre": "Quiz con puntaje",
            "puntaje": 5,
            "data": {
                "pregunta": "Pregunta",
                "opciones": [
                    {"id": "opcion_a", "texto": "A", "feedback": ""},
                    {"id": "opcion_b", "texto": "B", "feedback": ""},
                ],
                "respuestas_correctas": ["opcion_a"],
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un quiz sobre clases en C# que valga 5 puntos.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 5)

    def test_generated_component_defaults_missing_score_to_zero(self):
        component = {
            "id": "pregunta_abierta_1",
            "tipo": "pregunta_abierta",
            "nombre": "Pregunta abierta",
            "data": {
                "enunciado": "Explica",
                "rubrica": "Criterio base",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea una pregunta abierta sobre encapsulamiento.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)

    def test_generated_component_forces_zero_when_prompt_did_not_request_score(self):
        component = {
            "id": "codigo_3",
            "tipo": "codigo",
            "nombre": "Codigo invalido",
            "puntaje": 7,
            "data": {
                "enunciado": "Resuelve",
                "lenguaje": "python",
                "codigo_base": "",
                "instrucciones": "Sigue",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un ejercicio de código sobre clases en C#.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_component_normalizes_invalid_score_to_zero(self):
        component = {
            "id": "codigo_3b",
            "tipo": "codigo",
            "nombre": "Codigo invalido",
            "puntaje": "5",
            "data": {
                "enunciado": "Resuelve",
                "lenguaje": "python",
                "codigo_base": "",
                "instrucciones": "Sigue",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un ejercicio de código que valga 5 puntos.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_component_normalizes_null_score_to_zero(self):
        component = {
            "id": "codigo_5",
            "tipo": "codigo",
            "nombre": "Codigo nulo",
            "puntaje": None,
            "data": {
                "enunciado": "Resuelve",
                "lenguaje": "python",
                "codigo_base": "",
                "instrucciones": "Sigue",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un ejercicio de código que valga 5 puntos.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_component_normalizes_boolean_score_to_zero(self):
        component = {
            "id": "codigo_6",
            "tipo": "codigo",
            "nombre": "Codigo booleano",
            "puntaje": True,
            "data": {
                "enunciado": "Resuelve",
                "lenguaje": "python",
                "codigo_base": "",
                "instrucciones": "Sigue",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un ejercicio de código que valga 5 puntos.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_component_normalizes_negative_score_to_zero(self):
        component = {
            "id": "codigo_4",
            "tipo": "codigo",
            "nombre": "Codigo negativo",
            "puntaje": -3,
            "data": {
                "enunciado": "Resuelve",
                "lenguaje": "python",
                "codigo_base": "",
                "instrucciones": "Sigue",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt="Crea un ejercicio de código que valga 5 puntos.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_teoria_forces_score_zero_with_warning(self):
        component = {
            "id": "teoria_7",
            "tipo": "teoria",
            "nombre": "Teoria puntuable",
            "puntaje": 9,
            "data": {
                "titulo": "Teoria",
                "formato": "markdown",
                "contenido": "Contenido",
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            teacher_prompt=(
                "Crea una teoría sobre encapsulamiento que valga 10 puntos."
            ),
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])

    def test_generated_edit_without_score_request_forces_zero(self):
        component = {
            "id": "quiz_multiple_4",
            "tipo": "quiz_multiple",
            "nombre": "Quiz editado",
            "puntaje": 6,
            "data": {
                "pregunta": "Pregunta",
                "opciones": [
                    {"id": "opcion_a", "texto": "A", "feedback": ""},
                    {"id": "opcion_b", "texto": "B", "feedback": ""},
                ],
                "respuestas_correctas": ["opcion_a"],
            },
        }

        payload = validate_and_normalize_generated_component(
            component,
            expected_type="quiz_multiple",
            expected_id="quiz_multiple_4",
            teacher_prompt="Mejora el feedback de este quiz sobre clases en C#.",
        )

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["puntaje"], 0)
        self.assertTrue(payload["warnings"])


if __name__ == "__main__":
    unittest.main()
