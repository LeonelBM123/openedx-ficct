"""Errores controlados para los servicios IA de IA Assistant."""


class AIError(Exception):
    """Clase base para errores controlados de IA."""

    default_code = "ai_error"

    def __init__(self, message, code=None, details=None):
        super().__init__(message)
        self.message = message
        self.code = code or self.default_code

        if details is None:
            details = []
        elif not isinstance(details, list):
            details = [details]

        self.details = details


class AIConfigurationError(AIError):
    """Error cuando falta configuración IA o es inválida."""

    default_code = "ai_configuration_error"


class AIProviderError(AIError):
    """Error cuando el proveedor IA no puede completar una solicitud."""

    default_code = "ai_provider_error"


class AITimeoutError(AIError):
    """Error cuando una solicitud IA excede el tiempo límite."""

    default_code = "ai_timeout"


class AIInvalidResponseError(AIError):
    """Error cuando una respuesta IA no puede parsearse o usarse."""

    default_code = "ai_invalid_response"


class AIValidationError(AIError):
    """Error cuando el contenido generado no pasa validación."""

    default_code = "ai_validation_error"


def ai_error_to_payload(error):
    """Convierte un error IA controlado en un payload seguro para JSON."""
    if isinstance(error, AIError):
        return {
            "ok": False,
            "error": error.message,
            "code": error.code,
            "details": error.details,
        }

    return {
        "ok": False,
        "error": "No se pudo completar la operación de IA.",
        "code": "ai_error",
        "details": [],
    }
