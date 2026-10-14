"""Declarative schema contract for IA Assistant units and components."""

from copy import deepcopy


UNIT_SCHEMA_VERSION = 1

DEFAULT_UNIT = {
    "version": UNIT_SCHEMA_VERSION,
    "titulo": "Unidad sin título",
    "componentes": [],
}

QUIZ_MULTIPLE_OPTION_DEFAULT = {
    "id": "",
    "texto": "",
    "feedback": "",
}

COMPONENT_DEFINITIONS = {
    "teoria": {
        "type": "teoria",
        "label": "Teoría",
        "allow_multiple": True,
        "authorable": True,
        "default_puntaje": 0,
        "reviewable": False,
        "system": False,
        "student_visible": True,
        "default_data": {
            "titulo": "",
            "formato": "markdown",
            "contenido": "",
        },
        "ai_editable_fields": [
            "data.titulo",
            "data.formato",
            "data.contenido",
        ],
    },
    "quiz_multiple": {
        "type": "quiz_multiple",
        "label": "Quiz múltiple",
        "allow_multiple": True,
        "authorable": True,
        "default_puntaje": 0,
        "reviewable": True,
        "system": False,
        "student_visible": True,
        "default_data": {
            "pregunta": "",
            "opciones": [],
            "respuestas_correctas": [],
        },
        "option_default_data": QUIZ_MULTIPLE_OPTION_DEFAULT,
        "ai_editable_fields": [
            "data.pregunta",
            "data.opciones",
            "data.respuestas_correctas",
        ],
    },
    "pregunta_abierta": {
        "type": "pregunta_abierta",
        "label": "Pregunta abierta",
        "allow_multiple": True,
        "authorable": True,
        "default_puntaje": 0,
        "reviewable": True,
        "system": False,
        "student_visible": True,
        "default_data": {
            "enunciado": "",
            "rubrica": "",
        },
        "ai_editable_fields": [
            "data.enunciado",
            "data.rubrica",
        ],
    },
    "codigo": {
        "type": "codigo",
        "label": "Código",
        "allow_multiple": True,
        "authorable": True,
        "default_puntaje": 0,
        "reviewable": True,
        "system": False,
        "student_visible": True,
        "default_data": {
            "enunciado": "",
            "lenguaje": "",
            "codigo_base": "",
            "instrucciones": "",
        },
        "ai_editable_fields": [
            "data.enunciado",
            "data.lenguaje",
            "data.codigo_base",
            "data.instrucciones",
        ],
    },
    "revision": {
        "type": "revision",
        "label": "Revisión",
        "allow_multiple": False,
        "authorable": False,
        "default_puntaje": 0,
        "reviewable": False,
        "system": True,
        "student_visible": True,
        "default_data": {
            "instrucciones": "",
            "criterios": [],
        },
        "ai_editable_fields": [
            "data.instrucciones",
            "data.criterios",
        ],
    },
}

COMPONENT_TYPES = tuple(COMPONENT_DEFINITIONS.keys())

AUTHORABLE_COMPONENT_TYPES = tuple(
    component_type
    for component_type, definition in COMPONENT_DEFINITIONS.items()
    if definition["authorable"]
)

REVIEWABLE_COMPONENT_TYPES = tuple(
    component_type
    for component_type, definition in COMPONENT_DEFINITIONS.items()
    if definition["reviewable"]
)

SYSTEM_COMPONENT_TYPES = tuple(
    component_type
    for component_type, definition in COMPONENT_DEFINITIONS.items()
    if definition["system"]
)

STUDENT_VISIBLE_COMPONENT_TYPES = tuple(
    component_type
    for component_type, definition in COMPONENT_DEFINITIONS.items()
    if definition["student_visible"]
)


def get_default_unit():
    """Return a safe copy of the default unit payload."""
    return deepcopy(DEFAULT_UNIT)


def get_component_definition(component_type):
    """Return a safe copy of a component definition."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    if not component_definition:
        return None

    return deepcopy(component_definition)


def get_default_data(component_type):
    """Return a safe copy of a component default data payload."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    if not component_definition:
        return None

    return deepcopy(component_definition["default_data"])


def get_default_puntaje(component_type):
    """Return the default top-level score for a component type."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    if not component_definition:
        return None

    return int(component_definition.get("default_puntaje", 0))


def is_authorable_component(component_type):
    """Return whether a component type can be added by authors."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    return bool(component_definition and component_definition["authorable"])


def is_reviewable_component(component_type):
    """Return whether a component type requires review support."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    return bool(component_definition and component_definition["reviewable"])


def is_system_component(component_type):
    """Return whether a component type is managed by the system."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    return bool(component_definition and component_definition["system"])


def is_student_visible_component(component_type):
    """Return whether a component type can be shown to students."""
    component_definition = COMPONENT_DEFINITIONS.get(component_type)

    return bool(component_definition and component_definition["student_visible"])
