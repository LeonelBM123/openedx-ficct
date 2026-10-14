import json
import math

from .openrouter_client import OpenRouterClient
from .ai_errors import (
    AIInvalidResponseError,
    AIValidationError,
    ai_error_to_payload,
)
from .prompts.student_review_prompt import (
    build_student_review_system_prompt,
    build_student_review_user_prompt,
)
from .unit_service import parse_ai_json_response

ALLOWED_TYPES = {"quiz_multiple", "pregunta_abierta", "codigo"}
MAX_OPENAI_ANSWER_CHARS = 4000
MAX_CODE_CHARS = 12000
MAX_PROMPT_COMPONENT_CHARS = 2000
MAX_CRITERIA_CHARS = 1500
MAX_CODE_BASE_CHARS = 4000
MAX_OPTION_TEXT_CHARS = 300
MAX_COMMENT_CHARS = 500
MAX_SUGGESTION_CHARS = 650
MAX_RECOMMENDATIONS = 4


def _truncate(value, limit):
    if value is None:
        return ""
    s = str(value)
    if len(s) <= limit:
        return s
    return s[:limit] + " [truncado]"


def _append_internal_warning(warnings, message, details=None):
    warning = {"message": message}

    if isinstance(details, dict) and details:
        warning["details"] = details

    warnings.append(warning)


def _get_component_max_score(component):
    if not isinstance(component, dict):
        return 0

    score = component.get("puntaje")

    if (
        isinstance(score, int)
        and not isinstance(score, bool)
        and score > 0
    ):
        return score

    return 0


def _normalize_quiz_answer_ids(answer_value):
    if answer_value is None or answer_value == "":
        return []

    if isinstance(answer_value, list):
        return [str(value) for value in answer_value]

    return [str(answer_value)]


def _normalize_quiz_correct_ids(component_data):
    correct_ids = component_data.get("respuestas_correctas")

    if not isinstance(correct_ids, list):
        return []

    return [str(value) for value in correct_ids]


def _round_half_up(value):
    return int(math.floor(float(value) + 0.5))


def _calculate_quiz_review_result(component, saved_answer):
    data = component.get("data") if isinstance(component, dict) else {}
    puntaje_maximo = _get_component_max_score(component)
    selected_ids = _normalize_quiz_answer_ids(
        saved_answer.get("value") if isinstance(saved_answer, dict) else None
    )
    correct_ids = _normalize_quiz_correct_ids(data)

    if not selected_ids:
        return {
            "estado": "sin_respuesta",
            "puntaje_obtenido": 0,
            "puntaje_maximo": puntaje_maximo,
        }

    if not correct_ids:
        return {
            "estado": "revisar",
            "puntaje_obtenido": 0,
            "puntaje_maximo": puntaje_maximo,
        }

    selected_set = set(selected_ids)
    correct_set = set(correct_ids)

    if len(correct_set) == 1:
        is_correct = selected_set == correct_set
        return {
            "estado": "bien" if is_correct else "revisar",
            "puntaje_obtenido": puntaje_maximo if is_correct else 0,
            "puntaje_maximo": puntaje_maximo,
        }

    aciertos = len(selected_set & correct_set)
    errores = len(selected_set - correct_set)
    proporcion = float(aciertos - errores) / float(len(correct_set))

    if proporcion < 0:
        proporcion = 0.0

    if proporcion > 1:
        proporcion = 1.0

    puntaje_obtenido = _round_half_up(puntaje_maximo * proporcion)

    if puntaje_obtenido >= puntaje_maximo and not errores:
        estado = "bien"
    elif puntaje_obtenido > 0:
        estado = "parcial"
    else:
        estado = "revisar"

    return {
        "estado": estado,
        "puntaje_obtenido": puntaje_obtenido,
        "puntaje_maximo": puntaje_maximo,
    }


def _attach_review_scores(validated_review, comp_map, student_answers):
    components = validated_review.get("componentes", [])
    total_obtenido = 0
    total_maximo = 0

    for item in components:
        component_id = item.get("componentId")
        component = comp_map.get(component_id) or {}
        component_type = item.get("tipo")
        saved_answer = (
            student_answers.get(component_id)
            if isinstance(student_answers, dict)
            else None
        )
        puntaje_maximo = _get_component_max_score(component)
        puntaje_obtenido = item.get("puntaje_obtenido", 0)

        if component_type == "quiz_multiple":
            quiz_result = _calculate_quiz_review_result(component, saved_answer)
            item["estado"] = quiz_result["estado"]
            puntaje_obtenido = quiz_result["puntaje_obtenido"]
            puntaje_maximo = quiz_result["puntaje_maximo"]
        elif component_type in ("pregunta_abierta", "codigo"):
            puntaje_obtenido = item.get("puntaje_obtenido", 0)
            puntaje_maximo = _get_component_max_score(component)
        else:
            puntaje_obtenido = 0
            puntaje_maximo = 0

        item["puntaje_obtenido"] = puntaje_obtenido
        item["puntaje_maximo"] = puntaje_maximo

        total_obtenido += puntaje_obtenido
        total_maximo += puntaje_maximo

    validated_review["puntaje_total_obtenido"] = total_obtenido
    validated_review["puntaje_total_maximo"] = total_maximo
    return validated_review


def _normalize_ai_component_score(raw_component, component, warnings):
    component_id = raw_component.get("componentId")
    component_type = raw_component.get("tipo")
    puntaje_maximo = _get_component_max_score(component)
    raw_maximo = raw_component.get("puntaje_maximo")
    raw_obtenido = raw_component.get("puntaje_obtenido")

    if component_type not in ("pregunta_abierta", "codigo"):
        return {"puntaje_obtenido": 0, "puntaje_maximo": puntaje_maximo}

    if puntaje_maximo <= 0:
        if raw_obtenido not in (None, 0):
            _append_internal_warning(
                warnings,
                "Se ignoro puntaje IA porque el componente no tiene puntaje maximo.",
                {
                    "componentId": component_id,
                    "tipo": component_type,
                    "puntaje_obtenido": raw_obtenido,
                },
            )
        return {"puntaje_obtenido": 0, "puntaje_maximo": 0}

    if raw_maximo not in (None, puntaje_maximo):
        _append_internal_warning(
            warnings,
            "Se ajusto puntaje_maximo al valor definido por el docente.",
            {
                "componentId": component_id,
                "tipo": component_type,
                "puntaje_maximo_ia": raw_maximo,
                "puntaje_maximo_backend": puntaje_maximo,
            },
        )

    if isinstance(raw_obtenido, bool) or not isinstance(raw_obtenido, int):
        _append_internal_warning(
            warnings,
            "Se normalizo puntaje_obtenido invalido a 0.",
            {
                "componentId": component_id,
                "tipo": component_type,
                "puntaje_obtenido": raw_obtenido,
            },
        )
        return {"puntaje_obtenido": 0, "puntaje_maximo": puntaje_maximo}

    if raw_obtenido < 0:
        _append_internal_warning(
            warnings,
            "Se normalizo puntaje_obtenido negativo a 0.",
            {
                "componentId": component_id,
                "tipo": component_type,
                "puntaje_obtenido": raw_obtenido,
            },
        )
        return {"puntaje_obtenido": 0, "puntaje_maximo": puntaje_maximo}

    if raw_obtenido > puntaje_maximo:
        _append_internal_warning(
            warnings,
            "Se ajusto puntaje_obtenido al puntaje maximo permitido.",
            {
                "componentId": component_id,
                "tipo": component_type,
                "puntaje_obtenido": raw_obtenido,
                "puntaje_maximo": puntaje_maximo,
            },
        )
        return {
            "puntaje_obtenido": puntaje_maximo,
            "puntaje_maximo": puntaje_maximo,
        }

    return {
        "puntaje_obtenido": raw_obtenido,
        "puntaje_maximo": puntaje_maximo,
    }


def _prepare_components_for_ai(unit, student_answers, component_ids=None):
    """Prepara una lista reducida de componentes auditables con respuestas del alumno."""
    components = unit.get("componentes") if isinstance(unit, dict) else []
    comp_map = {}
    for comp in components:
        if not isinstance(comp, dict):
            continue
        cid = comp.get("id")
        ctype = comp.get("tipo")
        if not cid or not ctype:
            continue
        if ctype not in ALLOWED_TYPES:
            continue
        comp_map[cid] = comp

    # decide which components to include
    if (
        component_ids
        and isinstance(component_ids, list)
        and len(component_ids) > 0
    ):
        selected_ids = [cid for cid in component_ids if cid in comp_map]
    else:
        selected_ids = list(comp_map.keys())

    prepared = []
    for cid in selected_ids:
        comp = comp_map.get(cid)
        data = comp.get("data") if isinstance(comp.get("data"), dict) else {}
        # get student's saved answer
        saved = (
            student_answers.get(cid)
            if isinstance(student_answers, dict)
            else None
        )
        value = None
        metadata = {}
        if isinstance(saved, dict):
            value = saved.get("value")
            metadata = saved.get("metadata") or {}

        # Include pedagogical fields from component data when available
        pregunta = _truncate(data.get("pregunta") or "", MAX_PROMPT_COMPONENT_CHARS)
        enunciado = _truncate(data.get("enunciado") or "", MAX_PROMPT_COMPONENT_CHARS)
        titulo = _truncate(data.get("titulo") or "", MAX_PROMPT_COMPONENT_CHARS)
        criterio = _truncate(data.get("criterio") or data.get("criterios") or "", MAX_CRITERIA_CHARS)
        criterios = _truncate(json.dumps(data.get("criterios")) if data.get("criterios") is not None else "", MAX_CRITERIA_CHARS)
        rubrica = _truncate(data.get("rubrica") or data.get("rúbrica") or "", MAX_CRITERIA_CHARS)
        instrucciones = _truncate(data.get("instrucciones") or "", MAX_CRITERIA_CHARS)
        lenguaje = data.get("lenguaje") or data.get("language") or ""
        codigo_base = _truncate(data.get("codigo_base") or data.get("codigoBase") or "", MAX_CODE_BASE_CHARS)
        respuesta_correcta = data.get("respuesta_correcta") or data.get("respuestas_correctas") or None

        # build basic item
        item = {
            "componentId": cid,
            "tipo": comp.get("tipo"),
            "nombre": comp.get("nombre") or "",
            "puntaje_maximo": _get_component_max_score(comp),
            "pregunta": pregunta,
            "enunciado": enunciado,
            "titulo": titulo,
            "criterio": criterio,
            "criterios": criterios,
            "rubrica": rubrica,
            "instrucciones": instrucciones,
            "lenguaje": lenguaje,
            "codigo_base": codigo_base,
            # opciones: include id and truncated text
            "opciones": [],
            "respuesta_correcta": respuesta_correcta,
            "respuesta": None,
        }

        if comp.get("tipo") == "quiz_multiple":
            opciones = (
                data.get("opciones") if isinstance(data.get("opciones"), list) else []
            )
            option_map = {}
            opciones_list = []
            for op in opciones:
                oid = str((op or {}).get("id") or "")
                texto = _truncate((op or {}).get("texto") or "", MAX_OPTION_TEXT_CHARS)
                option_map[oid] = texto
                opciones_list.append({"id": oid, "texto": texto})
            item["opciones"] = opciones_list

            if (
                value is None
                or value == ""
                or (isinstance(value, list) and len(value) == 0)
            ):
                item["respuesta"] = None
            elif isinstance(value, list):
                texts = [option_map.get(str(v)) or str(v) for v in value]
                item["respuesta"] = _truncate(
                    ", ".join(texts), MAX_OPENAI_ANSWER_CHARS
                )
            else:
                item["respuesta"] = _truncate(
                    option_map.get(str(value)) or str(value), MAX_OPENAI_ANSWER_CHARS
                )

            # include respuesta correcta if present
            if isinstance(respuesta_correcta, (list, tuple)):
                item["respuesta_correcta"] = [str(x) for x in respuesta_correcta]
            elif respuesta_correcta is not None:
                item["respuesta_correcta"] = str(respuesta_correcta)

        elif comp.get("tipo") == "codigo":
            code_text = _truncate(value or "", MAX_CODE_CHARS)
            lang = lenguaje or metadata.get("lenguaje") or metadata.get("language") or ""
            item["respuesta"] = {"lenguaje": lang, "codigo": code_text}
            item["codigo_base"] = codigo_base
        else:  # pregunta_abierta
            item["respuesta"] = _truncate(value or "", MAX_OPENAI_ANSWER_CHARS)

        prepared.append(item)

    return prepared, comp_map


def _validate_ai_payload(payload, comp_map):
    if not isinstance(payload, dict):
        raise AIInvalidResponseError(
            "La IA no devolvió un objeto JSON.", code="invalid_ai_json_object"
        )

    status = payload.get("status")
    if status != "ai":
        raise AIInvalidResponseError(
            "La IA no marcó la respuesta con status 'ai'.",
            code="invalid_status",
        )

    resumen = payload.get("resumen_general") or ""
    componentes = payload.get("componentes")
    if not isinstance(componentes, list):
        raise AIInvalidResponseError(
            "El campo 'componentes' debe ser una lista.",
            code="invalid_componentes",
        )

    validated_components = []
    warnings = []
    for comp in componentes:
        if not isinstance(comp, dict):
            raise AIInvalidResponseError(
                "Cada componente debe ser un objeto.",
                code="invalid_component_item",
            )
        cid = comp.get("componentId")
        ctype = comp.get("tipo")
        estado = comp.get("estado")
        comentario = comp.get("comentario") or ""
        sugerencia = comp.get("sugerencia") or ""
        component = comp_map.get(cid) or {}

        if cid not in comp_map:
            raise AIInvalidResponseError(
                f"componentId desconocido: {cid}", code="unknown_component"
            )
        if ctype not in ALLOWED_TYPES:
            raise AIInvalidResponseError(
                f"tipo invalido: {ctype}", code="invalid_type"
            )
        if estado not in ("bien", "parcial", "revisar", "sin_respuesta"):
            raise AIInvalidResponseError(
                f"estado invalido: {estado}", code="invalid_estado"
            )

        normalized_score = _normalize_ai_component_score(
            comp, component, warnings
        )

        validated_components.append(
            {
                "componentId": cid,
                "tipo": ctype,
                "estado": estado,
                "comentario": _truncate(comentario, MAX_COMMENT_CHARS),
                "sugerencia": _truncate(sugerencia, MAX_SUGGESTION_CHARS),
                "puntaje_obtenido": normalized_score["puntaje_obtenido"],
                "puntaje_maximo": normalized_score["puntaje_maximo"],
            }
        )

    # ensure all auditables present: add missing with sin_respuesta
    for cid, comp in comp_map.items():
        if cid not in [c["componentId"] for c in validated_components]:
            component = comp_map.get(cid) or {}
            puntaje_maximo = _get_component_max_score(component)
            if (
                component.get("tipo") in ("pregunta_abierta", "codigo")
                and puntaje_maximo > 0
            ):
                _append_internal_warning(
                    warnings,
                    "La IA omitio puntaje_obtenido y se normalizo a 0.",
                    {
                        "componentId": cid,
                        "tipo": component.get("tipo"),
                        "puntaje_maximo": puntaje_maximo,
                    },
                )
            validated_components.append(
                {
                    "componentId": cid,
                    "tipo": comp.get("tipo"),
                    "estado": "sin_respuesta",
                    "comentario": "",
                    "sugerencia": "",
                    "puntaje_obtenido": 0,
                    "puntaje_maximo": puntaje_maximo,
                }
            )

    recomendaciones = payload.get("recomendaciones")
    if recomendaciones is None:
        recomendaciones = []
    if not isinstance(recomendaciones, list):
        raise AIInvalidResponseError(
            "El campo 'recomendaciones' debe ser una lista.",
            code="invalid_recomendaciones",
        )

    validated = {
        "status": "ai",
        "resumen_general": _truncate(resumen, MAX_COMMENT_CHARS),
        "componentes": validated_components,
        "recomendaciones": [str(r) for r in recomendaciones][:MAX_RECOMMENDATIONS],
    }

    if warnings:
        validated["_ia_assistant"] = {"warnings": warnings}

    return validated


def generate_student_review(
    unit, student_answers, component_ids=None, client=None
):
    try:
        components_for_ai, comp_map = _prepare_components_for_ai(
            unit, student_answers, component_ids=component_ids
        )

        system_prompt = build_student_review_system_prompt()
        user_prompt = build_student_review_user_prompt(unit, components_for_ai)

        current_client = client or OpenRouterClient()
        raw_response = current_client.generate_text(system_prompt, user_prompt)

        parsed = parse_ai_json_response(raw_response)

        validated = _validate_ai_payload(parsed, comp_map)
        validated = _attach_review_scores(
            validated, comp_map, student_answers
        )

        return {"ok": True, "success": True, "review": validated}
    except Exception as error:
        return ai_error_to_payload(error)
