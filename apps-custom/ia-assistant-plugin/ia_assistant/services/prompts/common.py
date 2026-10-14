"""Reglas comunes para prompts de IA Docente."""

import json

from ..ai_errors import AIValidationError


ALLOWED_COMPONENT_TYPES = (
    "teoria",
    "quiz_multiple",
    "pregunta_abierta",
    "codigo",
)

MAX_THEORIES_IN_CONTEXT = 3
MAX_THEORY_CONTENT_CHARS = 3000
MAX_UNIT_SUMMARY_COMPONENTS = 12


def build_json_only_rules():
    """Devuelve reglas comunes para respuestas JSON."""
    return "\n".join([
        "Devuelve SOLO JSON valido.",
        "Prohibido usar markdown fences como ```json.",
        "Prohibido agregar texto antes o despues del JSON.",
        "Prohibido usar imagenes Markdown como ![texto](url).",
        "Prohibido usar HTML crudo.",
        "Prohibido explicitamente el uso de las etiquetas HTML <img>, <script>, <iframe>, <object> y <embed>.",
        "Prohibido usar campos desconocidos.",
        "Prohibido incluir revision.",
    ])


def build_content_quality_rules():
    """Devuelve reglas comunes de calidad textual para contenido generado."""
    return "\n".join([
        "Redacta en español claro, natural y correcto.",
        "Antes de devolver el JSON, revisa ortografía, tildes, puntuación y espacios.",
        "Conserva signos de apertura en español: ¿ ? y ¡ ! cuando correspondan.",
        "Evita caracteres corruptos como ?Qu? cuando debería ser ¿Qué.",
        "Evita palabras pegadas por error, por ejemplo: largode debe ser largo de, almacenael debe ser almacena el, endiferentes debe ser en diferentes, mantienenlos debe ser mantienen los.",
        "Usa mayúsculas y minúsculas de forma correcta.",
        "Mantén un tono educativo, claro y sobrio.",
        "No cambies el contrato JSON por corregir estilo.",
        "No agregues campos nuevos por corregir estilo.",
    ])


def build_allowed_types_text():
    """Devuelve los tipos de componentes permitidos."""
    return "\n".join(
        "- {}".format(component_type)
        for component_type in ALLOWED_COMPONENT_TYPES
    )


def extract_theory_context(unit_context):
    """Extrae teoria disponible desde el contexto de unidad."""
    if not isinstance(unit_context, dict):
        unit_context = {}

    components = unit_context.get("componentes")
    if components is None:
        components = unit_context.get("componentes_actuales")

    if not isinstance(components, list):
        return []

    theories = []
    for component in components:
        if not isinstance(component, dict) or component.get("tipo") != "teoria":
            continue

        data = component.get("data") if isinstance(
            component.get("data"), dict
        ) else {}
        theories.append({
            "id": str(component.get("id") or ""),
            "nombre": str(component.get("nombre") or ""),
            "titulo": str(data.get("titulo") or ""),
            "contenido": str(data.get("contenido") or ""),
        })

    return theories


def build_theory_context_text(unit_context):
    """Construye texto de contexto con teorias existentes."""
    theories = extract_theory_context(unit_context)

    if not theories:
        return "No hay teoria existente en la unidad."

    lines = ["Teoria existente de la unidad:"]
    theories_to_include = theories[:MAX_THEORIES_IN_CONTEXT]

    for index, theory in enumerate(theories_to_include, start=1):
        contenido = theory["contenido"] or "sin contenido"
        if len(contenido) > MAX_THEORY_CONTENT_CHARS:
            contenido = contenido[:MAX_THEORY_CONTENT_CHARS] + " [contenido truncado]"

        lines.extend([
            "Teoria {}:".format(index),
            "- id: {}".format(theory["id"] or "sin id"),
            "- nombre: {}".format(theory["nombre"] or "sin nombre"),
            "- titulo: {}".format(theory["titulo"] or "sin titulo"),
            "- contenido:",
            contenido,
        ])

    return "\n".join(lines)


def dump_json_context(value):
    """Serializa contexto para incluirlo en prompts."""
    return json.dumps(value or {}, ensure_ascii=False, indent=2)


def clean_teacher_prompt(prompt_docente):
    """Normaliza y valida una indicación docente."""
    clean_prompt = str(prompt_docente or "").strip()

    if not clean_prompt:
        raise AIValidationError(
            "Escribe una indicacion para generar contenido con IA.",
            code="empty_teacher_prompt",
        )

    return clean_prompt


def build_unit_summary_text(unit_context):
    """Construye un resumen breve de la unidad para el contexto de prompts."""
    if not isinstance(unit_context, dict):
        unit_context = {}

    title = (
        unit_context.get("titulo") or
        unit_context.get("titulo_actual") or
        "sin titulo definido"
    )
    components = unit_context.get("componentes")

    if components is None:
        components = unit_context.get("componentes_actuales")

    if not isinstance(components, list):
        components = []

    lines = [
        "Resumen de la unidad:",
        "- Titulo: {}".format(title),
        "- Cantidad de componentes: {}".format(len(components)),
    ]

    if components:
        lines.append("- Componentes existentes:")
        for comp in components[:MAX_UNIT_SUMMARY_COMPONENTS]:
            if isinstance(comp, dict):
                comp_id = comp.get("id") or "sin id"
                comp_tipo = comp.get("tipo") or "sin tipo"
                comp_nombre = comp.get("nombre") or "sin nombre"
                lines.append(
                    "  * [id: {}, tipo: {}, nombre: {}]".format(
                        comp_id,
                        comp_tipo,
                        comp_nombre,
                    )
                )

        if len(components) > MAX_UNIT_SUMMARY_COMPONENTS:
            lines.append(
                "  * ... (y {} componentes mas)".format(
                    len(components) - MAX_UNIT_SUMMARY_COMPONENTS
                )
            )

    return "\n".join(lines)
