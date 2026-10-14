from .common import (
    build_json_only_rules,
    build_content_quality_rules,
    build_unit_summary_text,
)


def build_student_review_system_prompt():
    lines = [
        "Eres un asistente que revisa respuestas de estudiantes.",
        "Tu tarea: analizar las respuestas guardadas por un alumno y devolver un JSON con feedback por componente.",
        "Evalúa cada respuesta según la consigna, criterios, rúbricas e instrucciones proporcionadas por el docente.",
        "Si existe una rúbrica o criterio explícito en el componente, úsalo como referencia principal para la evaluación.",
        "Si no existe rúbrica explícita, evalúa según la consigna y buenas prácticas del tema y deja constancia de ello.",
        "No inventes rúbricas ni atribuyas criterios al docente que no estén presentes en el componente.",
        "Para pregunta_abierta y codigo con puntaje_maximo mayor que 0, devuelve puntaje_obtenido como entero entre 0 y puntaje_maximo.",
        "No asignes puntaje a teoria ni revision. El puntaje de quiz_multiple lo calcula el backend y no debes decidirlo tú.",
        "No ejecutes ningún código. No simules ejecución. Para código, haz análisis estático del texto proporcionado.",
        "Cuando el alumno se equivoque, explica brevemente qué está mal, por qué, y ofrece una respuesta orientativa o ejemplo breve.",
        "Devuelve SOLO JSON valido, sin texto fuera del JSON, sin markdown, sin fences.",
        "Responde en español.",
        "",
        build_json_only_rules(),
        "",
        build_content_quality_rules(),
    ]

    return "\n".join(lines)


def build_student_review_user_prompt(unit, components_for_ai):
    """
    Construye el contenido para el prompt de usuario que incluye un resumen de la unidad
    y la lista de componentes auditables con las respuestas del alumno.

    `components_for_ai` debe ser una lista de objetos con campos reducidos ya truncados.
    """
    unit_summary = build_unit_summary_text(unit)

    lines = [
        "Contexto de la unidad:",
        unit_summary,
        "",
        "Componentes a revisar (formato JSON):",
        "No modifiques la estructura JSON solicitada en las instrucciones finales.",
        "",
        "Lista de componentes:",
    ]

    # incluir componentes JSON como una lista para referencia
    import json

    lines.append(json.dumps(components_for_ai, ensure_ascii=False, indent=2))

    # Instrucciones sobre la salida esperada
    lines.append("")
    lines.append("INSTRUCCIONES DE SALIDA:")
    lines.append("Devuelve SOLO un objeto JSON con la siguiente estructura:")
    lines.append(
        '{"status": "ai", "resumen_general": "...", "componentes": [{"componentId": "...", "tipo": "...", "estado": "bien|parcial|revisar|sin_respuesta", "comentario": "...", "sugerencia": "...", "puntaje_obtenido": 0, "puntaje_maximo": 0}], "recomendaciones": ["..."] }'
    )
    lines.append("")
    lines.append("Estados permitidos: bien, parcial, revisar, sin_respuesta.")
    lines.append("")
    lines.append(
        "Reglas de evaluación: si el componente incluye 'criterio', 'criterios', 'rubrica' o 'instrucciones', utilízalos como guía principal y explícita en el comentario cómo se aplica el criterio.")
    lines.append(
        "Si no hay rúbrica, evalúa según la consigna y buenas prácticas, y deja claro que usas criterios generales.")
    lines.append(
        "Si el componente es pregunta_abierta o codigo y tiene puntaje_maximo > 0, incluye puntaje_obtenido y puntaje_maximo con valores enteros.")
    lines.append(
        "Si el componente es quiz_multiple, puedes omitir puntaje_obtenido y puntaje_maximo; el backend calculará ese puntaje.")
    lines.append("")
    lines.append("Longitudes: comentario máximo ~500 caracteres; sugerencia máximo ~650 caracteres; recomendaciones máximo 4 items.")
    lines.append("")
    lines.append("Trunca comentarios largos si es necesario; mantén respuestas concisas, específicas y accionables.")
    lines.append("")
    lines.append("No agregues campos adicionales al JSON.")
    lines.append("")

    return "\n".join(lines)
