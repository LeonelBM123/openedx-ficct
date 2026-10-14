"""Cliente base de OpenRouter para IA Assistant."""

import json
import socket
from urllib import error as url_error
from urllib import request as url_request

from ..config import (
    get_openrouter_api_key,
    get_openrouter_base_url,
    get_openrouter_fallback_models,
    get_openrouter_model,
    get_openrouter_timeout,
)
from .ai_errors import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIProviderError,
    AITimeoutError,
)


HTTP_ERROR_CODES = {
    401: "openrouter_unauthorized",
    402: "openrouter_payment_required",
    429: "openrouter_rate_limited",
}
MAX_OPENROUTER_MODELS = 3


class OpenRouterClient:
    """Fachada liviana para completar prompts con OpenRouter."""

    def __init__(
        self,
        api_key=None,
        model=None,
        base_url=None,
        timeout=None,
        fallback_models=None,
    ):
        self.api_key = api_key if api_key is not None else get_openrouter_api_key()
        self.model = model or get_openrouter_model()
        self.base_url = base_url or get_openrouter_base_url()
        self.timeout = timeout or get_openrouter_timeout()

        if fallback_models is None:
            fallback_models = get_openrouter_fallback_models()

        self.fallback_models = self._normalize_fallback_models(
            fallback_models
        )

    def is_configured(self):
        """Devuelve si el cliente tiene API key configurada."""
        return bool(self.api_key)

    def _build_url(self):
        """Construye la URL final del endpoint de chat completions."""
        return "{}/chat/completions".format(self.base_url.rstrip("/"))

    def _build_payload(self, system_prompt, user_prompt):
        """Construye el payload compatible con OpenRouter."""
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        }
        principal_model = str(self.model).strip()
        fallback_models = [
            model for model in self.fallback_models
            if model != principal_model
        ][:MAX_OPENROUTER_MODELS - 1]

        if fallback_models:
            payload["models"] = [principal_model] + fallback_models
        else:
            payload["model"] = principal_model

        return payload

    @staticmethod
    def _normalize_fallback_models(fallback_models):
        """Normaliza modelos fallback preservando el orden."""
        if not fallback_models:
            return []

        if isinstance(fallback_models, str):
            raw_models = fallback_models.split(",")
        elif isinstance(fallback_models, (list, tuple)):
            raw_models = fallback_models
        else:
            raw_models = [fallback_models]

        normalized_models = []
        seen_models = set()

        for model in raw_models:
            if model is None:
                continue

            clean_model = str(model).strip()

            if not clean_model or clean_model in seen_models:
                continue

            normalized_models.append(clean_model)
            seen_models.add(clean_model)

        return normalized_models

    def _build_request(self, system_prompt, user_prompt):
        """Construye la solicitud HTTP sin exponer credenciales."""
        body = json.dumps(
            self._build_payload(system_prompt, user_prompt)
        ).encode("utf-8")

        return url_request.Request(
            self._build_url(),
            data=body,
            headers={
                "Authorization": "Bearer {}".format(self.api_key),
                "Content-Type": "application/json",
            },
            method="POST",
        )

    @staticmethod
    def _raise_http_error(status_code):
        if status_code in HTTP_ERROR_CODES:
            raise AIProviderError(
                "OpenRouter no pudo completar la solicitud.",
                code=HTTP_ERROR_CODES[status_code],
                details={"status_code": status_code},
            )

        if status_code >= 500:
            raise AIProviderError(
                "OpenRouter no pudo completar la solicitud.",
                code="openrouter_server_error",
                details={"status_code": status_code},
            )

        raise AIProviderError(
            "OpenRouter devolvio un error HTTP.",
            code="openrouter_http_error",
            details={"status_code": status_code},
        )

    @staticmethod
    def _is_timeout_error(error):
        reason = getattr(error, "reason", None)
        return isinstance(reason, (socket.timeout, TimeoutError))

    @staticmethod
    def _parse_response_body(response_body):
        try:
            payload = json.loads(response_body.decode("utf-8"))
        except (AttributeError, TypeError, ValueError):
            raise AIInvalidResponseError(
                "OpenRouter no devolvio un JSON valido.",
                code="openrouter_invalid_json",
            )

        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise AIInvalidResponseError(
                "OpenRouter no devolvio contenido utilizable.",
                code="openrouter_empty_content",
            )

        if not isinstance(content, str) or not content.strip():
            raise AIInvalidResponseError(
                "OpenRouter devolvio contenido vacio.",
                code="openrouter_empty_content",
            )

        return content

    def generate_text(self, system_prompt, user_prompt):
        """Genera texto usando el endpoint chat completions de OpenRouter."""
        if not self.is_configured():
            raise AIConfigurationError(
                "No hay API key de IA configurada.",
                code="missing_openrouter_api_key",
            )

        request = self._build_request(system_prompt, user_prompt)

        try:
            with url_request.urlopen(request, timeout=self.timeout) as response:
                response_body = response.read()
        except url_error.HTTPError as error:
            self._raise_http_error(error.code)
        except url_error.URLError as error:
            if self._is_timeout_error(error):
                raise AITimeoutError(
                    "La solicitud a OpenRouter excedio el tiempo limite.",
                    code="openrouter_timeout",
                )

            raise AIProviderError(
                "No se pudo conectar con OpenRouter.",
                code="openrouter_connection_error",
            )
        except (socket.timeout, TimeoutError):
            raise AITimeoutError(
                "La solicitud a OpenRouter excedio el tiempo limite.",
                code="openrouter_timeout",
            )

        return self._parse_response_body(response_body)
