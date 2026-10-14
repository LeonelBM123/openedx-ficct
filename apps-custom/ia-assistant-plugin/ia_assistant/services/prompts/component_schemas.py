"""Schemas textuales de componentes para prompts IA."""

from ...schema import UNIT_SCHEMA_VERSION


UNIT_SCHEMA_TEXT = """{
  "version": %d,
  "titulo": "string",
  "componentes": []
}""" % UNIT_SCHEMA_VERSION

SCORE_RULES_TEXT = (
    'Usa "puntaje" solo como campo top-level entero >= 0. '
    'Si el docente no especifica puntaje, usa "puntaje": 0. '
    '"teoria" siempre debe tener "puntaje": 0.'
)

COMPONENT_SCHEMA_TEXTS = {
    "teoria": """{
  "id": "teoria_1",
  "tipo": "teoria",
  "nombre": "string",
  "puntaje": 0,
  "data": {
    "titulo": "string",
    "formato": "markdown",
    "contenido": "string"
  }
}""",
    "quiz_multiple": """{
  "id": "quiz_multiple_1",
  "tipo": "quiz_multiple",
  "nombre": "string",
  "puntaje": 0,
  "data": {
    "pregunta": "string",
    "opciones": [
      {
        "id": "opcion_1",
        "texto": "string",
        "feedback": "string"
      }
    ],
    "respuestas_correctas": ["opcion_1"]
  }
}""",
    "pregunta_abierta": """{
  "id": "pregunta_abierta_1",
  "tipo": "pregunta_abierta",
  "nombre": "string",
  "puntaje": 0,
  "data": {
    "enunciado": "string",
    "rubrica": "string"
  }
}""",
    "codigo": """{
  "id": "codigo_1",
  "tipo": "codigo",
  "nombre": "string",
  "puntaje": 0,
  "data": {
    "enunciado": "string",
    "lenguaje": "string",
    "codigo_base": "string",
    "instrucciones": "string"
  }
}""",
}


def get_component_schema_text(component_type):
    """Devuelve el schema textual de un tipo de componente."""
    return COMPONENT_SCHEMA_TEXTS.get(component_type, "")


def build_all_component_schemas_text():
    """Devuelve los schemas de todos los componentes permitidos."""
    lines = []

    for component_type, schema_text in COMPONENT_SCHEMA_TEXTS.items():
        lines.extend([
            "{}:".format(component_type),
            schema_text,
            "",
        ])

    return "\n".join(lines).strip()

