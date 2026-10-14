"""Validation helpers for IA Assistant unit payloads."""

import re
import unicodedata
from copy import deepcopy

from .schema import (
    COMPONENT_TYPES,
    UNIT_SCHEMA_VERSION,
    get_component_definition,
    get_default_data,
    get_default_puntaje,
    is_authorable_component,
    is_system_component,
)

AI_AUTHORABLE_COMPONENT_TYPES = (
    "teoria",
    "quiz_multiple",
    "pregunta_abierta",
    "codigo",
)
MAX_GENERATED_COMPONENTS = 12
DEFAULT_GENERATED_TITLE = "Unidad generada con IA"

# NOTE: This module intentionally keeps generated-unit validation together for
# IA Docente fase 1. If student responses/calification are added later, split
# response-specific validation into a dedicated module.

IMAGE_MARKDOWN_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
DANGEROUS_HTML_RE = re.compile(
    r"<(script|iframe|object|embed)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
DANGEROUS_SELF_CLOSING_RE = re.compile(
    r"<(script|iframe|object|embed)\b[^>]*\/?>",
    re.IGNORECASE,
)
SCORE_REQUEST_PATTERNS = (
    re.compile(r"\bpuntaje\b", re.IGNORECASE),
    re.compile(r"\bpuntos\b", re.IGNORECASE),
    re.compile(r"\bpto\b", re.IGNORECASE),
    re.compile(r"\bpts\b", re.IGNORECASE),
    re.compile(r"\bvale\b", re.IGNORECASE),
    re.compile(r"\bvalor\b", re.IGNORECASE),
    re.compile(r"\bcalificacion\b", re.IGNORECASE),
    re.compile(r"\bnota\b", re.IGNORECASE),
)


def is_valid_component_type(component_type):
    """Return whether a component type is allowed for teacher AI generation."""
    return component_type in AI_AUTHORABLE_COMPONENT_TYPES


def normalize_component_id(component_type, index):
    """Return a stable generated component id."""
    return "{}_{}".format(component_type, index)


def _slugify_identifier(value):
    text = _as_string(value).strip().lower()
    text = re.sub(r"[^a-zA-Z0-9_]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def _as_string(value):
    if value is None:
        return ""

    if isinstance(value, str):
        return value

    return str(value)


def _strip_accents(text):
    normalized = unicodedata.normalize("NFKD", _as_string(text))
    return "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )


def teacher_prompt_requests_score(prompt_docente):
    """Return whether the teacher prompt explicitly requests a score."""
    normalized_prompt = _strip_accents(prompt_docente).lower()

    if not normalized_prompt.strip():
        return False

    return any(
        pattern.search(normalized_prompt)
        for pattern in SCORE_REQUEST_PATTERNS
    )


def _append_warning(warnings, message, details=None):
    warning = {"message": message}

    if details:
        warning["details"] = details

    warnings.append(warning)


def _append_error(
    errors,
    code,
    message,
    component_id=None,
    component_type=None,
    field=None,
    details=None,
):
    error = {
        "code": code,
        "message": message,
    }

    if component_id:
        error["component_id"] = component_id

    if component_type:
        error["component_type"] = component_type

    if field:
        error["field"] = field

    if details:
        error["details"] = details

    errors.append(error)


def strip_disallowed_markdown(markdown_text):
    """Remove currently disallowed Markdown/HTML constructs from text."""
    text = _as_string(markdown_text)
    warnings = []

    if IMAGE_MARKDOWN_RE.search(text):
        text = IMAGE_MARKDOWN_RE.sub("[imagen removida]", text)
        _append_warning(warnings, "Se removieron imagenes Markdown.")

    if HTML_IMAGE_RE.search(text):
        text = HTML_IMAGE_RE.sub("[imagen removida]", text)
        _append_warning(warnings, "Se removieron etiquetas img.")

    if DANGEROUS_HTML_RE.search(text) or DANGEROUS_SELF_CLOSING_RE.search(
        text
    ):
        text = DANGEROUS_HTML_RE.sub("[contenido removido]", text)
        text = DANGEROUS_SELF_CLOSING_RE.sub("[contenido removido]", text)
        _append_warning(warnings, "Se removio HTML no permitido.")

    return text, warnings


def _normalize_safe_text(value, warnings):
    text, text_warnings = strip_disallowed_markdown(value)
    warnings.extend(text_warnings)
    return text


def _component_display_name(component):
    if not isinstance(component, dict):
        return "Componente"

    component_name = _as_string(component.get("nombre")).strip()
    component_id = _as_string(component.get("id")).strip()

    return component_name or component_id or "Componente"


def _validate_required_string(
    value,
    errors,
    code,
    message,
    component_id=None,
    component_type=None,
    field=None,
):
    if not isinstance(value, str) or not value.strip():
        _append_error(
            errors,
            code,
            message,
            component_id=component_id,
            component_type=component_type,
            field=field,
        )
        return None

    return value


def _validate_optional_string(
    value,
    errors,
    code,
    message,
    component_id=None,
    component_type=None,
    field=None,
):
    if value is None:
        return ""

    if not isinstance(value, str):
        _append_error(
            errors,
            code,
            message,
            component_id=component_id,
            component_type=component_type,
            field=field,
        )
        return None

    return value


def _build_component_ref(component):
    component_id = ""
    component_type = ""
    component_name = "Componente"

    if isinstance(component, dict):
        component_id = _as_string(component.get("id")).strip()
        component_type = _as_string(component.get("tipo")).strip()
        component_name = _component_display_name(component)

    return {
        "id": component_id,
        "type": component_type,
        "name": component_name,
    }


def _build_studio_validation_error(error_message, errors, warnings=None):
    warnings = warnings or []

    return {
        "ok": False,
        "error": error_message,
        "errors": errors,
        "warnings": warnings,
    }


def _validate_component_puntaje(component, component_ref, errors):
    component_type = component_ref["type"]
    component_name = component_ref["name"]
    default_puntaje = get_default_puntaje(component_type)

    if default_puntaje is None:
        default_puntaje = 0

    if "puntaje" not in component:
        return default_puntaje

    puntaje = component.get("puntaje")

    if isinstance(puntaje, bool) or not isinstance(puntaje, int):
        _append_error(
            errors,
            "invalid_component_score_type",
            "El componente '{}' debe tener un puntaje entero.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_type,
            field="puntaje",
        )
        return None

    if puntaje < 0:
        _append_error(
            errors,
            "invalid_component_score_value",
            "El componente '{}' debe tener un puntaje mayor o igual a 0.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_type,
            field="puntaje",
        )
        return None

    if component_type == "teoria" and puntaje != 0:
        _append_error(
            errors,
            "invalid_teoria_score",
            "La teoría '{}' debe tener puntaje 0.".format(component_name),
            component_id=component_ref["id"],
            component_type=component_type,
            field="puntaje",
        )
        return None

    return puntaje


def _validate_studio_teoria_data(data, component_ref, warnings):
    errors = []
    normalized = deepcopy(get_default_data("teoria") or {})
    component_name = component_ref["name"]

    title = _validate_required_string(
        data.get("titulo"),
        errors,
        "missing_teoria_title",
        "La teoría '{}' debe tener un título.".format(component_name),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.titulo",
    )
    content = _validate_required_string(
        data.get("contenido"),
        errors,
        "missing_teoria_content",
        "La teoría '{}' debe tener contenido.".format(component_name),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.contenido",
    )

    if "formato" in data and data.get("formato") != "markdown":
        _append_error(
            errors,
            "invalid_teoria_format",
            "La teoría '{}' debe usar formato markdown.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.formato",
        )

    if errors:
        return None, errors

    normalized["titulo"] = _normalize_safe_text(title, warnings)
    normalized["contenido"] = _normalize_safe_text(content, warnings)
    normalized["formato"] = "markdown"
    return normalized, errors


def _validate_studio_quiz_multiple_data(data, component_ref, warnings):
    errors = []
    component_name = component_ref["name"]
    normalized_options = []
    option_ids = set()
    correct_answers_seen = set()
    option_map = {}
    question = _validate_required_string(
        data.get("pregunta"),
        errors,
        "missing_quiz_question",
        "El quiz '{}' debe tener una pregunta.".format(component_name),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.pregunta",
    )
    options = data.get("opciones")
    correct_answers = data.get("respuestas_correctas")

    if not isinstance(options, list):
        _append_error(
            errors,
            "invalid_quiz_options",
            "El quiz '{}' debe tener una lista de opciones.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.opciones",
        )
        options = []

    if isinstance(options, list) and len(options) < 2:
        _append_error(
            errors,
            "insufficient_quiz_options",
            "El quiz '{}' debe tener al menos 2 opciones.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.opciones",
        )

    for option_index, option in enumerate(options, start=1):
        option_field = "data.opciones[{}]".format(option_index - 1)

        if not isinstance(option, dict):
            _append_error(
                errors,
                "invalid_quiz_option",
                "El quiz '{}' tiene una opción con formato inválido.".format(
                    component_name
                ),
                component_id=component_ref["id"],
                component_type=component_ref["type"],
                field=option_field,
            )
            continue

        option_id = _validate_required_string(
            option.get("id"),
            errors,
            "missing_quiz_option_id",
            "El quiz '{}' tiene una opción sin ID.".format(component_name),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field=option_field + ".id",
        )
        option_text = _validate_required_string(
            option.get("texto"),
            errors,
            "missing_quiz_option_text",
            "El quiz '{}' tiene una opción sin texto.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field=option_field + ".texto",
        )
        option_feedback = _validate_optional_string(
            option.get("feedback"),
            errors,
            "invalid_quiz_option_feedback",
            "El quiz '{}' tiene feedback de opción inválido.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field=option_field + ".feedback",
        )

        if option_id and option_id in option_ids:
            _append_error(
                errors,
                "duplicate_quiz_option_id",
                "El quiz '{}' tiene IDs de opción duplicados.".format(
                    component_name
                ),
                component_id=component_ref["id"],
                component_type=component_ref["type"],
                field=option_field + ".id",
            )
        elif option_id:
            option_ids.add(option_id)
            option_map[option_id] = True

        if option_id is None or option_text is None or option_feedback is None:
            continue

        normalized_options.append(
            {
                "id": option_id,
                "texto": _normalize_safe_text(option_text, warnings),
                "feedback": _normalize_safe_text(option_feedback, warnings),
            }
        )

    if not isinstance(correct_answers, list):
        _append_error(
            errors,
            "invalid_quiz_correct_answers",
            "El quiz '{}' debe tener una lista de respuestas correctas.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.respuestas_correctas",
        )
        correct_answers = []

    if isinstance(correct_answers, list) and not correct_answers:
        _append_error(
            errors,
            "missing_quiz_correct_answers",
            "El quiz '{}' debe tener al menos una respuesta correcta.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.respuestas_correctas",
        )

    normalized_correct_answers = []

    for answer_index, answer_id in enumerate(correct_answers, start=1):
        normalized_answer = _validate_required_string(
            answer_id,
            errors,
            "invalid_quiz_correct_answer",
            "El quiz '{}' tiene una respuesta correcta inválida.".format(
                component_name
            ),
            component_id=component_ref["id"],
            component_type=component_ref["type"],
            field="data.respuestas_correctas[{}]".format(answer_index - 1),
        )

        if normalized_answer is None:
            continue

        if normalized_answer in correct_answers_seen:
            _append_error(
                errors,
                "duplicate_quiz_correct_answer",
                "El quiz '{}' tiene respuestas correctas duplicadas.".format(
                    component_name
                ),
                component_id=component_ref["id"],
                component_type=component_ref["type"],
                field="data.respuestas_correctas",
            )
            continue

        correct_answers_seen.add(normalized_answer)

        if normalized_answer not in option_map:
            _append_error(
                errors,
                "missing_quiz_correct_answer_option",
                "El quiz '{}' tiene una respuesta correcta que no existe en las opciones.".format(
                    component_name
                ),
                component_id=component_ref["id"],
                component_type=component_ref["type"],
                field="data.respuestas_correctas",
                details={"respuesta": normalized_answer},
            )
            continue

        normalized_correct_answers.append(normalized_answer)

    if errors:
        return None, errors

    return {
        "pregunta": _normalize_safe_text(question, warnings),
        "opciones": normalized_options,
        "respuestas_correctas": normalized_correct_answers,
    }, errors


def _validate_studio_pregunta_abierta_data(data, component_ref, warnings):
    errors = []
    component_name = component_ref["name"]
    prompt = _validate_required_string(
        data.get("enunciado"),
        errors,
        "missing_open_question_prompt",
        "La pregunta abierta '{}' debe tener enunciado.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.enunciado",
    )
    rubric = _validate_optional_string(
        data.get("rubrica"),
        errors,
        "invalid_open_question_rubric",
        "La pregunta abierta '{}' tiene una rúbrica inválida.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.rubrica",
    )
    criteria = _validate_optional_string(
        data.get("criterio"),
        errors,
        "invalid_open_question_criteria",
        "La pregunta abierta '{}' tiene un criterio inválido.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.criterio",
    )

    if errors:
        return None, errors

    normalized = {
        "enunciado": _normalize_safe_text(prompt, warnings),
        "rubrica": _normalize_safe_text(rubric, warnings),
    }

    if "criterio" in data or criteria:
        normalized["criterio"] = _normalize_safe_text(criteria, warnings)

    if not normalized["rubrica"].strip() and not normalized.get(
        "criterio", ""
    ).strip():
        _append_warning(
            warnings,
            "La pregunta abierta '{}' no tiene rúbrica ni criterio.".format(
                component_name
            ),
            {"component_id": component_ref["id"]},
        )

    return normalized, errors


def _validate_studio_codigo_data(data, component_ref, warnings):
    errors = []
    component_name = component_ref["name"]
    statement = _validate_required_string(
        data.get("enunciado"),
        errors,
        "missing_code_statement",
        "El ejercicio de código '{}' debe tener enunciado.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.enunciado",
    )
    language = _validate_required_string(
        data.get("lenguaje"),
        errors,
        "missing_code_language",
        "El ejercicio de código '{}' debe tener lenguaje.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.lenguaje",
    )
    instructions = _validate_optional_string(
        data.get("instrucciones"),
        errors,
        "invalid_code_instructions",
        "El ejercicio de código '{}' tiene instrucciones inválidas.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.instrucciones",
    )
    code = _validate_optional_string(
        data.get("codigo_base"),
        errors,
        "invalid_code_base",
        "El ejercicio de código '{}' tiene código base inválido.".format(
            component_name
        ),
        component_id=component_ref["id"],
        component_type=component_ref["type"],
        field="data.codigo_base",
    )

    if errors:
        return None, errors

    normalized = {
        "enunciado": _normalize_safe_text(statement, warnings),
        "lenguaje": _normalize_safe_text(language, warnings),
        "codigo_base": _normalize_safe_text(code, warnings),
        "instrucciones": _normalize_safe_text(instructions, warnings),
    }

    if not normalized["instrucciones"].strip():
        _append_warning(
            warnings,
            "El ejercicio de código '{}' no tiene instrucciones.".format(
                component_name
            ),
            {"component_id": component_ref["id"]},
        )

    return normalized, errors


def validate_studio_component(component, seen_ids, type_counts):
    warnings = []
    errors = []
    component_ref = _build_component_ref(component)
    component_id = component_ref["id"]
    component_type = component_ref["type"]
    component_name = component_ref["name"]
    normalized = {}
    component_definition = None
    normalized_data = None
    normalized_puntaje = None

    if not isinstance(component, dict):
        return {
            "ok": False,
            "errors": [
                {
                    "code": "invalid_component",
                    "message": "Se encontró un componente con formato inválido.",
                }
            ],
            "warnings": warnings,
        }

    if not isinstance(component.get("nombre"), str):
        _append_error(
            errors,
            "invalid_component_name",
            "El componente '{}' tiene un nombre inválido.".format(
                component_name
            ),
            component_id=component_id,
            component_type=component_type,
            field="nombre",
        )

    if not isinstance(component_id, str) or not component_id:
        _append_error(
            errors,
            "missing_component_id",
            "Se encontró un componente sin ID.",
            component_type=component_type,
            field="id",
        )
    elif component_id in seen_ids:
        _append_error(
            errors,
            "duplicate_component_id",
            "Hay IDs de componentes duplicados en la unidad.",
            component_id=component_id,
            component_type=component_type,
            field="id",
        )
    else:
        seen_ids.add(component_id)

    if component_type not in COMPONENT_TYPES:
        _append_error(
            errors,
            "unknown_component_type",
            "El componente '{}' usa un tipo desconocido.".format(
                component_name
            ),
            component_id=component_id,
            component_type=component_type,
            field="tipo",
        )
    else:
        component_definition = get_component_definition(component_type)

        if component_type == "revision":
            _append_error(
                errors,
                "forbidden_revision_component",
                "El componente '{}' no puede guardarse desde Studio.".format(
                    component_name
                ),
                component_id=component_id,
                component_type=component_type,
                field="tipo",
            )
        elif is_system_component(component_type):
            _append_error(
                errors,
                "system_component_not_allowed",
                "El componente '{}' no puede guardarse como parte de la unidad docente.".format(
                    component_name
                ),
                component_id=component_id,
                component_type=component_type,
                field="tipo",
            )
        elif not is_authorable_component(component_type):
            _append_error(
                errors,
                "non_authorable_component",
                "El componente '{}' no es authorable desde Studio.".format(
                    component_name
                ),
                component_id=component_id,
                component_type=component_type,
                field="tipo",
            )
        else:
            type_counts[component_type] = type_counts.get(component_type, 0) + 1

            if (
                component_definition
                and not component_definition.get("allow_multiple", True)
                and type_counts[component_type] > 1
            ):
                _append_error(
                    errors,
                    "disallowed_multiple_component",
                    "El tipo '{}' no permite múltiples instancias en la unidad.".format(
                        component_type
                    ),
                    component_id=component_id,
                    component_type=component_type,
                    field="tipo",
                )

    data = component.get("data")
    if not isinstance(data, dict):
        _append_error(
            errors,
            "invalid_component_data",
            "El componente '{}' debe tener un objeto data válido.".format(
                component_name
            ),
            component_id=component_id,
            component_type=component_type,
            field="data",
        )
        data = None

    normalized_puntaje = _validate_component_puntaje(
        component,
        component_ref,
        errors,
    )

    if errors:
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
        }

    if component_type == "teoria":
        normalized_data, errors = _validate_studio_teoria_data(
            data,
            component_ref,
            warnings,
        )
    elif component_type == "quiz_multiple":
        normalized_data, errors = _validate_studio_quiz_multiple_data(
            data,
            component_ref,
            warnings,
        )
    elif component_type == "pregunta_abierta":
        normalized_data, errors = _validate_studio_pregunta_abierta_data(
            data,
            component_ref,
            warnings,
        )
    elif component_type == "codigo":
        normalized_data, errors = _validate_studio_codigo_data(
            data,
            component_ref,
            warnings,
        )

    if errors:
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
        }

    normalized["id"] = component_id
    normalized["tipo"] = component_type
    normalized["nombre"] = component.get("nombre")
    normalized["puntaje"] = normalized_puntaje
    normalized["data"] = normalized_data

    return {
        "ok": True,
        "component": normalized,
        "warnings": warnings,
    }


def validate_and_normalize_studio_unit(unit):
    warnings = []
    errors = []
    normalized_components = []
    seen_ids = set()
    type_counts = {}

    if not isinstance(unit, dict):
        return _build_studio_validation_error(
            "La unidad debe ser un objeto JSON válido.",
            [
                {
                    "code": "invalid_unit",
                    "message": "La unidad debe ser un objeto JSON válido.",
                    "field": "unit",
                }
            ],
        )

    if unit.get("version") != UNIT_SCHEMA_VERSION:
        _append_error(
            errors,
            "invalid_unit_version",
            "La unidad debe usar version 1.",
            field="version",
        )

    title = _validate_required_string(
        unit.get("titulo"),
        errors,
        "invalid_unit_title",
        "La unidad debe tener un título no vacío.",
        field="titulo",
    )

    raw_components = unit.get("componentes")
    if not isinstance(raw_components, list):
        _append_error(
            errors,
            "invalid_unit_components",
            "La unidad debe tener una lista de componentes.",
            field="componentes",
        )
        raw_components = []

    if errors:
        return _build_studio_validation_error(
            "La unidad no pasó la validación de guardado.",
            errors,
            warnings,
        )

    for component in raw_components:
        component_payload = validate_studio_component(
            component,
            seen_ids,
            type_counts,
        )
        warnings.extend(component_payload.get("warnings", []))

        if not component_payload.get("ok"):
            errors.extend(component_payload.get("errors", []))
            continue

        normalized_components.append(component_payload["component"])

    if errors:
        return _build_studio_validation_error(
            "La unidad no pasó la validación de guardado.",
            errors,
            warnings,
        )

    normalized_title = _normalize_safe_text(title, warnings)

    return {
        "ok": True,
        "unit": {
            "version": UNIT_SCHEMA_VERSION,
            "titulo": normalized_title,
            "componentes": normalized_components,
        },
        "warnings": warnings,
        "errors": [],
        "error": "",
    }


def _normalize_component_name(component, component_type, type_index, warnings):
    name = _normalize_safe_text(component.get("nombre"), warnings).strip()

    if name:
        return name

    return normalize_component_id(component_type, type_index)


def _normalize_generated_component_puntaje(
    component,
    component_type,
    component_name,
    warnings,
    score_requested,
):
    default_puntaje = get_default_puntaje(component_type)

    if default_puntaje is None:
        default_puntaje = 0

    if not isinstance(component, dict) or "puntaje" not in component:
        return default_puntaje

    puntaje = component.get("puntaje")

    if component_type == "teoria":
        if puntaje != 0:
            _append_warning(
                warnings,
                "Se forzo puntaje 0 para la teoría '{}'.".format(
                    component_name
                ),
            )
        return 0

    if not score_requested:
        if puntaje not in (0, None):
            _append_warning(
                warnings,
                "Se ignoro el puntaje de '{}' porque el docente no pidio puntaje.".format(
                    component_name
                ),
                {"puntaje": puntaje},
            )
        return 0

    if isinstance(puntaje, bool) or not isinstance(puntaje, int):
        _append_warning(
            warnings,
            "Se normalizo puntaje invalido a 0 para '{}'.".format(
                component_name
            ),
            {"puntaje": puntaje},
        )
        return default_puntaje

    if puntaje < 0:
        _append_warning(
            warnings,
            "Se normalizo puntaje negativo a 0 para '{}'.".format(
                component_name
            ),
            {"puntaje": puntaje},
        )
        return default_puntaje

    return puntaje


def _normalize_component_base(
    component,
    component_type,
    type_index,
    warnings,
    forced_id=None,
    score_requested=False,
):
    component_id = forced_id or normalize_component_id(
        component_type,
        type_index,
    )

    return {
        "id": component_id,
        "tipo": component_type,
        "nombre": _normalize_component_name(
            component,
            component_type,
            type_index,
            warnings,
        ),
        "puntaje": _normalize_generated_component_puntaje(
            component,
            component_type,
            _component_display_name(component),
            warnings,
            score_requested,
        ),
    }


def _normalize_teoria_data(data, warnings):
    normalized = deepcopy(get_default_data("teoria") or {})

    normalized["titulo"] = _normalize_safe_text(data.get("titulo"), warnings)
    normalized["formato"] = "markdown"
    normalized["contenido"] = _normalize_safe_text(
        data.get("contenido"),
        warnings,
    )

    if data.get("formato") != "markdown":
        _append_warning(warnings, "Se normalizo teoria a formato markdown.")

    return normalized


def _normalize_quiz_option(option, index, warnings):
    current_option = option if isinstance(option, dict) else {}
    option_id = "opcion_{}".format(index)

    return {
        "id": option_id,
        "texto": _normalize_safe_text(current_option.get("texto"), warnings),
        "feedback": _normalize_safe_text(
            current_option.get("feedback"),
            warnings,
        ),
    }


def _register_option_id_aliases(option, normalized_id, option_id_map):
    raw_original_id = _as_string(option.get("id")).strip()
    sanitized_original_id = _slugify_identifier(raw_original_id)

    if raw_original_id:
        option_id_map[raw_original_id] = normalized_id

    if sanitized_original_id:
        option_id_map[sanitized_original_id] = normalized_id

    option_id_map[normalized_id] = normalized_id


def _normalize_quiz_data(data, warnings):
    raw_options = data.get("opciones")
    raw_correct_answers = data.get("respuestas_correctas")
    option_id_map = {}
    options = []
    correct_answers = []
    correct_answer_ids = set()
    duplicate_answers_removed = False

    if not isinstance(raw_options, list):
        raw_options = []
        _append_warning(warnings, "El quiz no tenia opciones validas.")

    if not raw_options:
        _append_warning(warnings, "El quiz no tiene opciones configuradas.")

    for index, option in enumerate(raw_options, start=1):
        current_option = option if isinstance(option, dict) else {}
        normalized_option = _normalize_quiz_option(
            current_option,
            index,
            warnings,
        )
        options.append(normalized_option)
        _register_option_id_aliases(
            current_option,
            normalized_option["id"],
            option_id_map,
        )

    if not isinstance(raw_correct_answers, list):
        raw_correct_answers = []
        _append_warning(
            warnings, "El quiz no tenia respuestas correctas validas."
        )

    for answer_id in raw_correct_answers:
        raw_answer_id = _as_string(answer_id).strip()
        sanitized_answer_id = _slugify_identifier(raw_answer_id)
        normalized_answer_id = option_id_map.get(
            raw_answer_id
        ) or option_id_map.get(sanitized_answer_id)

        if not normalized_answer_id:
            _append_warning(
                warnings,
                "Se removio una respuesta correcta inexistente.",
                {"respuesta": raw_answer_id},
            )
            continue

        if normalized_answer_id in correct_answer_ids:
            duplicate_answers_removed = True
            continue

        correct_answer_ids.add(normalized_answer_id)
        correct_answers.append(normalized_answer_id)

    if duplicate_answers_removed:
        _append_warning(
            warnings, "Se removieron respuestas correctas duplicadas."
        )

    if not correct_answers:
        _append_warning(
            warnings, "El quiz no tiene respuesta correcta configurada."
        )

    return {
        "pregunta": _normalize_safe_text(data.get("pregunta"), warnings),
        "opciones": options,
        "respuestas_correctas": correct_answers,
    }


def _normalize_pregunta_abierta_data(data, warnings):
    return {
        "enunciado": _normalize_safe_text(data.get("enunciado"), warnings),
        "rubrica": _normalize_safe_text(data.get("rubrica"), warnings),
    }


def _normalize_codigo_data(data, warnings):
    return {
        "enunciado": _normalize_safe_text(data.get("enunciado"), warnings),
        "lenguaje": _normalize_safe_text(data.get("lenguaje"), warnings),
        "codigo_base": _normalize_safe_text(data.get("codigo_base"), warnings),
        "instrucciones": _normalize_safe_text(
            data.get("instrucciones"),
            warnings,
        ),
    }


def _normalize_component(
    component,
    type_counts,
    warnings,
    forced_id=None,
    initial_type_counts=None,
    score_requested=False,
):
    if not isinstance(component, dict):
        _append_warning(
            warnings, "Se descarto un componente que no era objeto."
        )
        return None

    component_type = _as_string(component.get("tipo")).strip()

    if not is_valid_component_type(component_type):
        _append_warning(
            warnings,
            "Se descarto un componente de tipo no permitido.",
            {"tipo": component_type},
        )
        return None

    if initial_type_counts:
        for current_type, current_count in initial_type_counts.items():
            type_counts[current_type] = max(
                type_counts.get(current_type, 0),
                current_count,
            )

    type_counts[component_type] = type_counts.get(component_type, 0) + 1
    type_index = type_counts[component_type]

    data = component.get("data")

    if not isinstance(data, dict):
        data = {}
        _append_warning(
            warnings,
            "Se completo data faltante de un componente.",
            {"tipo": component_type},
        )

    normalized = _normalize_component_base(
        component,
        component_type,
        type_index,
        warnings,
        forced_id=forced_id,
        score_requested=score_requested,
    )

    if component_type == "teoria":
        normalized["data"] = _normalize_teoria_data(data, warnings)
    elif component_type == "quiz_multiple":
        normalized["data"] = _normalize_quiz_data(data, warnings)
    elif component_type == "pregunta_abierta":
        normalized["data"] = _normalize_pregunta_abierta_data(data, warnings)
    elif component_type == "codigo":
        normalized["data"] = _normalize_codigo_data(data, warnings)

    return normalized


def normalize_unit_contract(unit, score_requested=False):
    """Normalize a generated unit into the current authoring contract."""
    warnings = []

    if not isinstance(unit, dict):
        return {
            "ok": False,
            "error": "La unidad generada no tiene un formato valido.",
            "code": "invalid_unit",
            "details": [],
        }

    raw_components = unit.get("componentes")
    type_counts = {}
    normalized_components = []

    if not isinstance(raw_components, list):
        raw_components = []
        _append_warning(
            warnings, "La unidad generada no tenia lista de componentes."
        )

    if len(raw_components) > MAX_GENERATED_COMPONENTS:
        raw_components = raw_components[:MAX_GENERATED_COMPONENTS]
        _append_warning(
            warnings,
            "Se limito la unidad al maximo de componentes permitido.",
            {"maximo": MAX_GENERATED_COMPONENTS},
        )

    for component in raw_components:
        normalized_component = _normalize_component(
            component,
            type_counts,
            warnings,
            score_requested=score_requested,
        )

        if normalized_component:
            normalized_components.append(normalized_component)

    if not normalized_components:
        return {
            "ok": False,
            "error": "La unidad generada no contiene componentes validos.",
            "code": "invalid_unit",
            "details": warnings,
        }

    title = _normalize_safe_text(unit.get("titulo"), warnings).strip()

    if not title:
        title = DEFAULT_GENERATED_TITLE
        _append_warning(warnings, "Se asigno un titulo por defecto.")

    return {
        "ok": True,
        "unit": {
            "version": UNIT_SCHEMA_VERSION,
            "titulo": title,
            "componentes": normalized_components,
        },
        "warnings": warnings,
    }


def validate_unit_contract(unit):
    """Return whether a unit matches the minimal generated unit contract."""
    return validate_and_normalize_generated_unit(unit).get("ok") is True


def _build_type_counts_from_components(existing_components):
    type_counts = {}

    if not isinstance(existing_components, list):
        return type_counts

    for component in existing_components:
        if not isinstance(component, dict):
            continue

        component_type = _as_string(component.get("tipo")).strip()

        if not is_valid_component_type(component_type):
            continue

        component_count = type_counts.get(component_type, 0) + 1
        component_id = _as_string(component.get("id")).strip()
        id_match = re.match(
            r"^{}_(\d+)$".format(re.escape(component_type)),
            component_id,
        )

        if id_match:
            component_count = max(component_count, int(id_match.group(1)))

        type_counts[component_type] = component_count

    return type_counts


def validate_and_normalize_generated_component(
    component,
    expected_type=None,
    expected_id=None,
    existing_components=None,
    teacher_prompt=None,
    score_requested=None,
):
    """Validate and normalize a single component generated by teacher AI."""
    warnings = []
    requested_score = (
        teacher_prompt_requests_score(teacher_prompt)
        if score_requested is None
        else bool(score_requested)
    )

    if not isinstance(component, dict):
        return {
            "ok": False,
            "error": "El componente generado no tiene un formato valido.",
            "code": "invalid_component",
            "details": [],
        }

    component_type = _as_string(component.get("tipo")).strip()

    if not is_valid_component_type(component_type):
        return {
            "ok": False,
            "error": "El componente generado usa un tipo no permitido.",
            "code": "invalid_component_type",
            "details": [{"tipo": component_type}],
        }

    if expected_type and component_type != expected_type:
        return {
            "ok": False,
            "error": "El componente generado no coincide con el tipo solicitado.",
            "code": "unexpected_component_type",
            "details": [
                {
                    "expected_type": expected_type,
                    "received_type": component_type,
                },
            ],
        }

    component_id = _as_string(component.get("id")).strip()

    if expected_id and component_id != expected_id:
        return {
            "ok": False,
            "error": "El componente generado no conserva el id esperado.",
            "code": "unexpected_component_id",
            "details": [
                {
                    "expected_id": expected_id,
                    "received_id": component_id,
                },
            ],
        }

    initial_type_counts = None

    if not expected_id:
        initial_type_counts = _build_type_counts_from_components(
            existing_components,
        )

    normalized_component = _normalize_component(
        component,
        {},
        warnings,
        forced_id=expected_id,
        initial_type_counts=initial_type_counts,
        score_requested=requested_score,
    )

    if not normalized_component:
        return {
            "ok": False,
            "error": "El componente generado no contiene datos validos.",
            "code": "invalid_component",
            "details": warnings,
        }

    return {
        "ok": True,
        "component": normalized_component,
        "warnings": warnings,
    }


def validate_and_normalize_generated_unit(
    raw_unit,
    teacher_prompt=None,
    score_requested=None,
):
    """Validate and normalize a unit generated by teacher AI."""
    requested_score = (
        teacher_prompt_requests_score(teacher_prompt)
        if score_requested is None
        else bool(score_requested)
    )

    if not isinstance(raw_unit, dict):
        return {
            "ok": False,
            "error": "La unidad generada no tiene un formato valido.",
            "code": "invalid_unit",
            "details": [],
        }

    if raw_unit.get("version") != UNIT_SCHEMA_VERSION:
        return {
            "ok": False,
            "error": "La unidad generada usa una version no soportada.",
            "code": "invalid_version",
            "details": [],
        }

    return normalize_unit_contract(
        raw_unit,
        score_requested=requested_score,
    )
