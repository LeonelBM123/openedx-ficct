"""Prompts para generar unidades completas."""

from .common import (
    build_allowed_types_text,
    build_content_quality_rules,
    build_json_only_rules,
    clean_teacher_prompt,
)
from .component_schemas import (
    SCORE_RULES_TEXT,
    UNIT_SCHEMA_TEXT,
    build_all_component_schemas_text,
)
from .codigo_prompt import build_codigo_rules
from .pregunta_abierta_prompt import build_pregunta_abierta_rules
from .quiz_multiple_prompt import build_quiz_multiple_rules
from .teoria_prompt import build_teoria_rules


def build_general_unit_system_prompt():
    """Construye el prompt de sistema para generar unidades completas."""
    sections = [
        "Eres un asistente para docentes que genera unidades educativas interactivas.",
        build_json_only_rules(),
        build_content_quality_rules(),
        "El JSON debe cumplir este contrato de unidad:",
        UNIT_SCHEMA_TEXT,
        "Tipos permitidos de componentes:",
        build_allowed_types_text(),
        "Cada componente debe tener id, tipo, nombre y data.",
        SCORE_RULES_TEXT,
        "Usa ids unicos con formato tipo_numero, por ejemplo teoria_1.",
        "Schemas de componentes:",
        build_all_component_schemas_text(),
        "Reglas por componente:",
        build_teoria_rules(),
        build_quiz_multiple_rules(),
        build_pregunta_abierta_rules(),
        build_codigo_rules(),
    ]

    return "\n\n".join(sections)


def _summarize_context(contexto):
    if not isinstance(contexto, dict):
        contexto = {}

    current_title = contexto.get("titulo_actual") or ""
    current_components = contexto.get("componentes_actuales") or []
    component_types = []

    if isinstance(current_components, list):
        for component in current_components:
            if isinstance(component, dict) and component.get("tipo"):
                component_types.append(str(component.get("tipo")))

    return {
        "titulo_actual": str(current_title),
        "cantidad_componentes": (
            len(current_components) if isinstance(current_components, list) else 0
        ),
        "tipos_existentes": component_types,
    }


def build_general_unit_user_prompt(prompt_docente, contexto=None):
    """Construye un prompt de usuario desde la indicacion docente."""
    clean_prompt = clean_teacher_prompt(prompt_docente)
    context_summary = _summarize_context(contexto)
    lines = [
        "Indicacion del docente:",
        clean_prompt,
        "",
        "Contexto actual de la unidad:",
        "- Titulo actual: %s" % (
            context_summary["titulo_actual"] or "sin titulo definido"
        ),
        "- Cantidad de componentes actuales: %d" % (
            context_summary["cantidad_componentes"]
        ),
        "- Tipos existentes: %s" % (
            ", ".join(context_summary["tipos_existentes"]) or "ninguno"
        ),
        "",
        "Genera una propuesta de unidad completa siguiendo exactamente el contrato indicado.",
    ]

    return "\n".join(lines)
