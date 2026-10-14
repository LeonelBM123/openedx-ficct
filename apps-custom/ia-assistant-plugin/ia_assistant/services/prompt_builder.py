"""Fachada de construccion de prompts para IA Docente."""

from .prompts.create_component_prompt import (
    build_create_component_system_prompt,
    build_create_component_user_prompt,
)
from .prompts.edit_component_prompt import (
    build_edit_component_system_prompt,
    build_edit_component_user_prompt,
)
from .prompts.general_unit_prompt import (
    build_general_unit_system_prompt,
    build_general_unit_user_prompt,
)
from .prompts.common import clean_teacher_prompt


def build_teacher_unit_system_prompt():
    """Construye el prompt de sistema para generar unidades docentes."""
    return build_general_unit_system_prompt()


def build_teacher_unit_user_prompt(prompt_docente, contexto=None):
    """Construye un prompt de usuario desde la indicacion docente."""
    return build_general_unit_user_prompt(prompt_docente, contexto)


def build_teacher_component_edit_system_prompt(active_component):
    """Construye el prompt de sistema para editar un componente."""
    component_type = ""

    if isinstance(active_component, dict):
        component_type = str(active_component.get("tipo") or "").strip()

    return build_edit_component_system_prompt(component_type)


def build_teacher_component_edit_user_prompt(
    prompt_docente,
    active_component,
    unit_context=None,
):
    """Construye el prompt de usuario para editar un componente."""
    clean_prompt = clean_teacher_prompt(prompt_docente)

    return build_edit_component_user_prompt(
        clean_prompt,
        active_component,
        unit_context,
    )


def build_teacher_component_create_system_prompt(target_component_type):
    """Construye el prompt de sistema para crear un componente."""
    return build_create_component_system_prompt(target_component_type)


def build_teacher_component_create_user_prompt(
    prompt_docente,
    target_component_type,
    unit_context=None,
):
    """Construye el prompt de usuario para crear un componente."""
    clean_prompt = clean_teacher_prompt(prompt_docente)

    return build_create_component_user_prompt(
        clean_prompt,
        target_component_type,
        unit_context,
    )
