"""
Backend local (Ollama + gateway propio) para el LLM del asistente avatar, alternativa
a OpenRouter.

Dos contenedores, mismo patron que avatar_tts.py usa para la voz:

- `avatar-llm`: Ollama sin modificar, alcanzable SOLO internamente por el gateway (no
  tiene vhost de Caddy, no lo toca el navegador ni el LMS).
- `avatar-llm-gateway`: servicio propio (`services/avatar-llm-gateway`) que valida un
  token corto emitido por el LMS (`GET /api/ficct/avatar/llm-token/`, ver
  AvatarLlmTokenView en avatar_views.py), arma el prompt con el SYSTEM_PROMPT fijo del
  servidor, y llama a Ollama. El navegador habla directo con este contenedor -- la
  inferencia (10-60s en CPU sin GPU) nunca bloquea un worker de uwsgi del LMS, igual
  que ya pasa con la voz.

`AVATAR_LLM_SECRET`/`AVATAR_LLM_API_URL` (el secreto compartido y la URL publica) se
definen en avatar_asistente.py, no aca -- mismo cruce que ya existe entre avatar_tts.py
y AVATAR_TTS_SECRET/AVATAR_TTS_API_URL.

Activar con:
    docker build -t ficct-avatar-llm-gateway /root/openedx-ficct/services/avatar-llm-gateway
    tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_llm_local.py
    tutor plugins enable avatar_llm_local
    tutor config save --set AVATAR_LLM_SECRET=$(openssl rand -hex 32)
    tutor config save --set AVATAR_LLM_API_URL=http://$(tutor config printvalue LMS_HOST)/avatar-llm/ask
    tutor local start -d
    tutor local do init --limit avatar_llm_local    # baja el modelo (una sola vez)
    tutor config save --set AVATAR_LLM_PROVIDER=local
    tutor local restart lms mfe

Ver docs/06-asistente-avatar.md y services/avatar-llm-gateway/README.md para el
detalle completo.
"""
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_LLM_GATEWAY_DOCKER_IMAGE", "ficct-avatar-llm-gateway:latest"),
    ("AVATAR_LOCAL_LLM_MODEL", "qwen3:4b"),
    # Timeout del gateway esperando a Ollama. Mucho mayor que cualquier timeout del
    # lado del LMS porque esta espera ya no ocurre en un worker de uwsgi.
    ("AVATAR_LOCAL_LLM_TIMEOUT", "60"),
    # Mas estricto que AVATAR_TTS_RATE_PER_MIN (30/min): cada pregunta es mucho mas
    # cara en CPU que una sintesis de voz.
    ("AVATAR_LLM_RATE_PER_MIN", "5"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "local-docker-compose-services",
        """
avatar-llm:
    image: docker.io/ollama/ollama:latest
    restart: unless-stopped
    volumes:
        - ../../data/avatar-llm-ollama:/root/.ollama
    healthcheck:
        test: ["CMD", "ollama", "list"]
        interval: 30s
        timeout: 10s
        start_period: 60s
        retries: 3

avatar-llm-gateway:
    image: {{ AVATAR_LLM_GATEWAY_DOCKER_IMAGE }}
    restart: unless-stopped
    environment:
        OLLAMA_URL: "http://avatar-llm:11434/v1"
        AVATAR_LOCAL_LLM_MODEL: "{{ AVATAR_LOCAL_LLM_MODEL }}"
        AVATAR_LOCAL_LLM_TIMEOUT: "{{ AVATAR_LOCAL_LLM_TIMEOUT }}"
        AVATAR_LLM_RATE_PER_MIN: "{{ AVATAR_LLM_RATE_PER_MIN }}"
        # Secreto compartido con el LMS (ver avatar_asistente.py / avatar_views.py).
        # Sin esto /ask responde 401 a todo: el servicio falla cerrado, no abierto.
        AVATAR_LLM_SECRET: "{{ AVATAR_LLM_SECRET }}"
        # Defensa en profundidad sobre el token, mismo criterio que AVATAR_TTS_CORS_ORIGINS.
        AVATAR_LLM_CORS_ORIGINS: "http://{{ MFE_HOST }}{% if ENABLE_HTTPS %},https://{{ MFE_HOST }}{% endif %}"
    depends_on:
        - avatar-llm
    healthcheck:
        test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if b'true' in urllib.request.urlopen('http://localhost:80/health', timeout=3).read() else 1)"]
        interval: 30s
        timeout: 5s
        start_period: 10s
        retries: 3
"""
    ),
    # Ruta dentro del vhost del LMS en vez de un subdominio propio -- mismo patron que
    # avatar_tts.py usa para /avatar-tts/*.
    (
        "caddyfile-lms",
        """
@avatar_llm {
    path /avatar-llm/*
}
handle @avatar_llm {
    uri strip_prefix /avatar-llm
    reverse_proxy avatar-llm-gateway:80
}
"""
    ),
])

# Descarga el modelo configurado. Idempotente: si la capa ya existe, `ollama pull` no
# vuelve a bajarla, asi que correrlo de nuevo en cada `tutor local do init` no hace
# nada. Verificar en el servidor si Tutor 21 acepta "avatar-llm" como target directo;
# si no, alternativa: disparar el pull vía HTTP desde "lms" contra la API de Ollama
# (POST http://avatar-llm:11434/api/pull).
hooks.Filters.CLI_DO_INIT_TASKS.add_item(
    (
        "avatar-llm",
        """
ollama pull {{ AVATAR_LOCAL_LLM_MODEL }}
"""
    )
)
