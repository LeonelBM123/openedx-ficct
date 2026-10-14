"""Orquestación de generación de unidades con IA Docente."""

import json
import re

from ..validators import validate_and_normalize_generated_unit
from .ai_errors import AIInvalidResponseError, AIValidationError, ai_error_to_payload
from .openrouter_client import OpenRouterClient
from .prompt_builder import (
    build_teacher_unit_system_prompt,
    build_teacher_unit_user_prompt,
)


JSON_FENCE_RE = re.compile(
    r"^\s*```(?:json)?\s*(.*?)\s*```\s*$",
    re.IGNORECASE | re.DOTALL,
)


def _clean_ai_json_text(text):
    if text is None:
        clean_text = ""
    elif not isinstance(text, str):
        raise AIInvalidResponseError(
            "La IA devolvió una respuesta no textual.",
            code="non_text_ai_response",
        )
    else:
        clean_text = text.strip()

    fence_match = JSON_FENCE_RE.match(clean_text)

    if fence_match:
        return fence_match.group(1).strip()

    return clean_text


def parse_ai_json_response(text):
    """Parsea un objeto JSON devuelto por un proveedor IA."""
    clean_text = _clean_ai_json_text(text)

    if not clean_text:
        raise AIInvalidResponseError(
            "La IA devolvió una respuesta vacía.",
            code="empty_ai_response",
        )

    try:
        payload = json.loads(clean_text)
    except (TypeError, ValueError):
        raise AIInvalidResponseError(
            "La IA no devolvió un JSON válido.",
            code="invalid_ai_json",
        )

    if not isinstance(payload, dict):
        raise AIInvalidResponseError(
            "La IA no devolvió un objeto JSON válido.",
            code="invalid_ai_json_object",
        )

    return payload


def generate_unit_from_teacher_prompt(prompt_docente, contexto=None, client=None):
    """Genera una propuesta de unidad desde una indicación docente.

    En esta fase el cliente OpenRouter por defecto está deshabilitado, por lo
    que esta función devuelve un error controlado salvo que se inyecte
    explícitamente un cliente de prueba o de una fase futura.
    """
    try:
        system_prompt = build_teacher_unit_system_prompt()
        user_prompt = build_teacher_unit_user_prompt(prompt_docente, contexto)
        current_client = client or OpenRouterClient()
        raw_response = current_client.generate_text(system_prompt, user_prompt)
        generated_unit = parse_ai_json_response(raw_response)
        validation_payload = validate_and_normalize_generated_unit(
            generated_unit,
            teacher_prompt=prompt_docente,
        )

        if not validation_payload.get("ok"):
            raise AIValidationError(
                validation_payload.get(
                    "error",
                    "La unidad generada no tiene un formato válido.",
                ),
                code=validation_payload.get("code", "invalid_generated_unit"),
                details=validation_payload.get("details", []),
            )

        return {
            "ok": True,
            "unit": validation_payload["unit"],
            "warnings": validation_payload.get("warnings", []),
        }
    except Exception as error:
        return ai_error_to_payload(error)
