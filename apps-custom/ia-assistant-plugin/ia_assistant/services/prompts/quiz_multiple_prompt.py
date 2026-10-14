"""Reglas de prompt para componentes quiz_multiple."""


def build_quiz_multiple_rules():
    """Devuelve reglas especificas para quiz_multiple."""
    return "\n".join([
        "Quiz multiple:",
        "- data.pregunta debe ser clara, concreta y evaluable.",
        "- data.opciones debe tener al menos 2 opciones.",
        "- Cada opcion debe tener id, texto y feedback.",
        "- Las opciones no deben repetirse.",
        "- Las opciones incorrectas deben ser distractores plausibles, no absurdos.",
        "- data.respuestas_correctas debe contener solo ids existentes en opciones.",
        "- Si el docente no pide multiples correctas, usa una sola respuesta correcta.",
        "- Cada feedback debe explicar brevemente por que la opcion es correcta o incorrecta.",
        "- Si hay teoria existente, el quiz debe basarse principalmente en esa teoria.",
    ])
