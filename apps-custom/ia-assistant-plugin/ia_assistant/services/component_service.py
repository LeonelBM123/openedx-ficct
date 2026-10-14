"""Orquestacion de generacion de componentes con IA Docente."""

from ..validators import (
    is_valid_component_type,
    validate_and_normalize_generated_component,
)
from .ai_errors import AIValidationError, ai_error_to_payload
from .openrouter_client import OpenRouterClient
from .prompt_builder import (
    build_teacher_component_create_system_prompt,
    build_teacher_component_create_user_prompt,
    build_teacher_component_edit_system_prompt,
    build_teacher_component_edit_user_prompt,
)
from .unit_service import parse_ai_json_response


def _get_component_identity(active_component):
    if not isinstance(active_component, dict):
        raise AIValidationError(
            "El componente activo no tiene un formato valido.",
            code="invalid_active_component",
        )

    component_id = str(active_component.get("id") or "").strip()
    component_type = str(active_component.get("tipo") or "").strip()

    if not component_id:
        raise AIValidationError(
            "El componente activo no tiene id.",
            code="missing_active_component_id",
        )

    if not is_valid_component_type(component_type):
        raise AIValidationError(
            "El componente activo usa un tipo no permitido.",
            code="invalid_active_component_type",
        )

    return component_id, component_type


def _validate_target_component_type(target_component_type):
    component_type = str(target_component_type or "").strip()

    if not is_valid_component_type(component_type):
        raise AIValidationError(
            "El tipo de componente solicitado no esta permitido.",
            code="invalid_target_component_type",
        )

    return component_type


def _get_existing_components(unit_context):
    if not isinstance(unit_context, dict):
        return []

    components = unit_context.get("componentes")

    if isinstance(components, list):
        return components

    return []


def generate_component_edit_from_teacher_prompt(
    prompt_docente,
    active_component,
    unit_context=None,
    client=None,
):
    """Genera una nueva version de un componente existente."""
    try:
        expected_id, expected_type = _get_component_identity(active_component)
        system_prompt = build_teacher_component_edit_system_prompt(
            active_component
        )
        user_prompt = build_teacher_component_edit_user_prompt(
            prompt_docente,
            active_component,
            unit_context,
        )
        current_client = client or OpenRouterClient()
        raw_response = current_client.generate_text(system_prompt, user_prompt)
        generated_component = parse_ai_json_response(raw_response)
        validation_payload = validate_and_normalize_generated_component(
            generated_component,
            expected_type=expected_type,
            expected_id=expected_id,
            teacher_prompt=prompt_docente,
        )

        if not validation_payload.get("ok"):
            raise AIValidationError(
                validation_payload.get(
                    "error",
                    "El componente generado no tiene un formato valido.",
                ),
                code=validation_payload.get("code", "invalid_generated_component"),
                details=validation_payload.get("details", []),
            )

        return {
            "ok": True,
            "component": validation_payload["component"],
            "warnings": validation_payload.get("warnings", []),
        }
    except Exception as error:
        return ai_error_to_payload(error)


def generate_component_create_from_teacher_prompt(
    prompt_docente,
    target_component_type,
    unit_context=None,
    client=None,
):
    """Genera un componente nuevo del tipo solicitado."""
    try:
        expected_type = _validate_target_component_type(target_component_type)
        system_prompt = build_teacher_component_create_system_prompt(
            expected_type
        )
        user_prompt = build_teacher_component_create_user_prompt(
            prompt_docente,
            expected_type,
            unit_context,
        )
        current_client = client or OpenRouterClient()
        raw_response = current_client.generate_text(system_prompt, user_prompt)
        generated_component = parse_ai_json_response(raw_response)
        existing_components = _get_existing_components(unit_context)
        validation_payload = validate_and_normalize_generated_component(
            generated_component,
            expected_type=expected_type,
            existing_components=existing_components,
            teacher_prompt=prompt_docente,
        )

        if not validation_payload.get("ok"):
            raise AIValidationError(
                validation_payload.get(
                    "error",
                    "El componente generado no tiene un formato valido.",
                ),
                code=validation_payload.get("code", "invalid_generated_component"),
                details=validation_payload.get("details", []),
            )

        return {
            "ok": True,
            "component": validation_payload["component"],
            "warnings": validation_payload.get("warnings", []),
        }
    except Exception as error:
        return ai_error_to_payload(error)
