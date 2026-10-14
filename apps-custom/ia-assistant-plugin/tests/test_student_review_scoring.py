import json
import unittest

from ia_assistant.services.student_review_service import (
    _prepare_components_for_ai,
    generate_student_review,
)


class FakeClient(object):
    def __init__(self, payload):
        self.payload = payload

    def generate_text(self, system_prompt, user_prompt):
        return json.dumps(self.payload, ensure_ascii=False)


def build_quiz_component(
    puntaje,
    correct_ids,
    opciones=None,
    component_id="quiz_1",
):
    return {
        "id": component_id,
        "tipo": "quiz_multiple",
        "nombre": "Quiz",
        "puntaje": puntaje,
        "data": {
            "pregunta": "Pregunta",
            "opciones": opciones
            or [
                {"id": "a", "texto": "A", "feedback": ""},
                {"id": "b", "texto": "B", "feedback": ""},
                {"id": "c", "texto": "C", "feedback": ""},
            ],
            "respuestas_correctas": correct_ids,
        },
    }


def build_open_question_component(puntaje, component_id="pregunta_1"):
    return {
        "id": component_id,
        "tipo": "pregunta_abierta",
        "nombre": "Pregunta",
        "puntaje": puntaje,
        "data": {
            "enunciado": "Explica",
            "rubrica": "Criterio base",
        },
    }


def build_code_component(puntaje, component_id="codigo_1"):
    return {
        "id": component_id,
        "tipo": "codigo",
        "nombre": "Codigo",
        "puntaje": puntaje,
        "data": {
            "enunciado": "Resuelve",
            "lenguaje": "python",
            "instrucciones": "Sigue las instrucciones",
            "codigo_base": "",
        },
    }


class StudentReviewScoringTests(unittest.TestCase):
    def test_prepare_components_for_ai_includes_puntaje_maximo(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }

        components_for_ai, _ = _prepare_components_for_ai(unit, {})

        self.assertEqual(components_for_ai[0]["puntaje_maximo"], 5)

    def test_single_answer_quiz_correct_gets_full_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "a",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "quiz_1",
                    "tipo": "quiz_multiple",
                    "estado": "revisar",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component = review["componentes"][0]

        self.assertTrue(result["ok"])
        self.assertEqual(component["estado"], "bien")
        self.assertEqual(component["puntaje_obtenido"], 5)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_single_answer_quiz_incorrect_gets_zero_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "b",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "quiz_1",
                    "tipo": "quiz_multiple",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "revisar")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_single_answer_quiz_without_response_gets_zero(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(unit, {}, client=FakeClient(ai_payload))
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "sin_respuesta")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_multi_answer_quiz_partial_score_for_partial_correct_selection(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(10, ["a", "b"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": ["a"],
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "parcial")
        self.assertEqual(component["puntaje_obtenido"], 5)
        self.assertEqual(component["puntaje_maximo"], 10)

    def test_multi_answer_quiz_penalizes_incorrect_selected_option(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(10, ["a", "b"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": ["a", "c"],
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "revisar")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 10)

    def test_review_includes_total_obtenido_and_total_maximo(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [
                build_quiz_component(5, ["a"]),
                build_open_question_component(3),
                build_code_component(7),
            ],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "a",
                "metadata": {},
            },
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            },
            "codigo_1": {
                "componentId": "codigo_1",
                "tipo": "codigo",
                "value": "print('hola')",
                "metadata": {},
            },
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "estado": "parcial",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 2,
                    "puntaje_maximo": 3,
                },
                {
                    "componentId": "codigo_1",
                    "tipo": "codigo",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 4,
                    "puntaje_maximo": 7,
                },
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component_map = {
            component["componentId"]: component
            for component in review["componentes"]
        }

        self.assertEqual(review["puntaje_total_obtenido"], 11)
        self.assertEqual(review["puntaje_total_maximo"], 15)
        self.assertEqual(component_map["pregunta_1"]["puntaje_obtenido"], 2)
        self.assertEqual(component_map["pregunta_1"]["puntaje_maximo"], 3)
        self.assertEqual(component_map["codigo_1"]["puntaje_obtenido"], 4)
        self.assertEqual(component_map["codigo_1"]["puntaje_maximo"], 7)

    def test_open_question_uses_valid_ai_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_open_question_component(3)],
        }
        answers = {
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "estado": "parcial",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 2,
                    "puntaje_maximo": 3,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["puntaje_obtenido"], 2)
        self.assertEqual(component["puntaje_maximo"], 3)

    def test_open_question_missing_ai_score_defaults_to_zero_with_warning(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_open_question_component(3)],
        }
        answers = {
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component = review["componentes"][0]

        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 3)
        self.assertTrue(review["_ia_assistant"]["warnings"])

    def test_open_question_out_of_range_ai_score_is_clamped(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_open_question_component(3)],
        }
        answers = {
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 10,
                    "puntaje_maximo": 10,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component = review["componentes"][0]

        self.assertEqual(component["puntaje_obtenido"], 3)
        self.assertEqual(component["puntaje_maximo"], 3)
        self.assertTrue(review["_ia_assistant"]["warnings"])

    def test_code_uses_valid_ai_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_code_component(7)],
        }
        answers = {
            "codigo_1": {
                "componentId": "codigo_1",
                "tipo": "codigo",
                "value": "print('hola')",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "codigo_1",
                    "tipo": "codigo",
                    "estado": "parcial",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 5,
                    "puntaje_maximo": 7,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["puntaje_obtenido"], 5)
        self.assertEqual(component["puntaje_maximo"], 7)

    def test_code_invalid_ai_score_defaults_to_zero(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_code_component(7)],
        }
        answers = {
            "codigo_1": {
                "componentId": "codigo_1",
                "tipo": "codigo",
                "value": "print('hola')",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "codigo_1",
                    "tipo": "codigo",
                    "estado": "revisar",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": "5",
                    "puntaje_maximo": 7,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component = review["componentes"][0]

        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 7)
        self.assertTrue(review["_ia_assistant"]["warnings"])

    def test_open_question_invalid_non_integer_ai_scores_default_to_zero(self):
        invalid_scores = [True, None, 2.5]

        for invalid_score in invalid_scores:
            with self.subTest(invalid_score=invalid_score):
                unit = {
                    "version": 1,
                    "titulo": "Unidad",
                    "componentes": [build_open_question_component(3)],
                }
                answers = {
                    "pregunta_1": {
                        "componentId": "pregunta_1",
                        "tipo": "pregunta_abierta",
                        "value": "Respuesta",
                        "metadata": {},
                    }
                }
                ai_payload = {
                    "status": "ai",
                    "resumen_general": "Resumen",
                    "componentes": [
                        {
                            "componentId": "pregunta_1",
                            "tipo": "pregunta_abierta",
                            "estado": "parcial",
                            "comentario": "Comentario",
                            "sugerencia": "Sugerencia",
                            "puntaje_obtenido": invalid_score,
                            "puntaje_maximo": 3,
                        }
                    ],
                    "recomendaciones": [],
                }

                result = generate_student_review(
                    unit, answers, client=FakeClient(ai_payload)
                )
                review = result["review"]
                component = review["componentes"][0]

                self.assertEqual(component["puntaje_obtenido"], 0)
                self.assertEqual(component["puntaje_maximo"], 3)
                self.assertTrue(review["_ia_assistant"]["warnings"])

    def test_quiz_ignores_ai_score_and_keeps_backend_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "b",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "quiz_1",
                    "tipo": "quiz_multiple",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 5,
                    "puntaje_maximo": 5,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "revisar")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_backend_recalculates_totals_and_ignores_ai_totals(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [
                build_quiz_component(5, ["a"]),
                build_open_question_component(3),
            ],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "a",
                "metadata": {},
            },
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            },
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "puntaje_total_obtenido": 999,
            "puntaje_total_maximo": 999,
            "componentes": [
                {
                    "componentId": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "estado": "parcial",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                    "puntaje_obtenido": 2,
                    "puntaje_maximo": 3,
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]

        self.assertEqual(review["puntaje_total_obtenido"], 7)
        self.assertEqual(review["puntaje_total_maximo"], 8)


if __name__ == "__main__":
    unittest.main()
