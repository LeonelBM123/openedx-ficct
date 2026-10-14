"""Reglas de prompt para componentes pregunta_abierta."""


def build_pregunta_abierta_rules():
    """Devuelve reglas especificas para pregunta_abierta."""
    return "\n".join([
        "Pregunta abierta:",
        "- data.enunciado debe ser claro, abierto y evaluable.",
        "- Debe evitar preguntas ambiguas o demasiado generales.",
        "- data.rubrica debe ser una guia interna para el docente.",
        "- La rubrica debe incluir criterios concretos de evaluacion.",
        "- No debe incluir una respuesta del alumno.",
        "- No debe presentar la rubrica como texto visible para el alumno.",
        "- Si hay teoria existente, la pregunta debe estar alineada con esa teoria.",
    ])
