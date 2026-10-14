"""Helpers de configuración para IA Assistant."""

import os

try:
    from django.conf import settings as django_settings
except Exception:  # pragma: no cover
    django_settings = None


try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None


OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY"
OPENROUTER_MODEL_ENV = "OPENROUTER_MODEL"
OPENROUTER_BASE_URL_ENV = "OPENROUTER_BASE_URL"
OPENROUTER_TIMEOUT_ENV = "OPENROUTER_TIMEOUT"
OPENROUTER_FALLBACK_MODELS_ENV = "OPENROUTER_FALLBACK_MODELS"

DEFAULT_OPENROUTER_MODEL = "openrouter/auto"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_TIMEOUT = 30
DEFAULT_OPENROUTER_FALLBACK_MODELS = []


if load_dotenv is not None:
    load_dotenv()


def _get_config_value(name, default=None):
    """Lee configuración desde Django settings, entorno o .env local."""

    if django_settings is not None and getattr(
        django_settings, "configured", False
    ):
        value = getattr(django_settings, name, None)
        if value not in (None, ""):
            return value

    value = os.environ.get(name)
    if value not in (None, ""):
        return value

    return default


def _clean_string(value, default=""):
    """Convierte un valor a string limpio."""
    if value is None:
        return default

    cleaned = str(value).strip()
    return cleaned or default


def get_openrouter_api_key():
    """Devuelve la API key configurada para OpenRouter, si existe."""
    return _clean_string(_get_config_value(OPENROUTER_API_KEY_ENV, ""))


def get_openrouter_model():
    """Devuelve el modelo principal configurado para OpenRouter."""
    return _clean_string(
        _get_config_value(OPENROUTER_MODEL_ENV, DEFAULT_OPENROUTER_MODEL),
        DEFAULT_OPENROUTER_MODEL,
    )


def get_openrouter_base_url():
    """Devuelve la URL base configurada para OpenRouter."""
    return _clean_string(
        _get_config_value(
            OPENROUTER_BASE_URL_ENV, DEFAULT_OPENROUTER_BASE_URL
        ),
        DEFAULT_OPENROUTER_BASE_URL,
    )


def get_openrouter_timeout():
    """Devuelve el timeout configurado para OpenRouter en segundos."""
    raw_timeout = _get_config_value(
        OPENROUTER_TIMEOUT_ENV,
        DEFAULT_OPENROUTER_TIMEOUT,
    )

    try:
        timeout = int(raw_timeout)
    except (TypeError, ValueError):
        return DEFAULT_OPENROUTER_TIMEOUT

    if timeout <= 0:
        return DEFAULT_OPENROUTER_TIMEOUT

    return timeout


def get_openrouter_fallback_models():
    """Devuelve los modelos fallback configurados para OpenRouter."""
    raw_models = _get_config_value(
        OPENROUTER_FALLBACK_MODELS_ENV,
        DEFAULT_OPENROUTER_FALLBACK_MODELS,
    )

    if raw_models is None:
        return []

    if isinstance(raw_models, (list, tuple)):
        return [
            _clean_string(model)
            for model in raw_models
            if _clean_string(model)
        ]

    return [
        model.strip() for model in str(raw_models).split(",") if model.strip()
    ]


def is_ai_configured():
    """Indica si el backend tiene configuración suficiente para llamadas IA."""
    return bool(get_openrouter_api_key())
