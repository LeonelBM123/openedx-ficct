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
    docker exec tutor_local-avatar-llm-1 ollama pull qwen3:4b   # baja el modelo (una sola vez)
    tutor config save --set AVATAR_LLM_PROVIDER=local
    tutor local restart lms mfe

Ver docs/06-asistente-avatar.md y services/avatar-llm-gateway/README.md para el
detalle completo.
"""
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_LLM_GATEWAY_DOCKER_IMAGE", "ficct-avatar-llm-gateway:latest"),
    # Se probo primero qwen3:4b: es un modelo "thinking" que gasta la mayoria de su
    # presupuesto de tokens en razonamiento oculto antes de responder, y en esta
    # version de Ollama no se pudo desactivar ese modo -- con preguntas simples a
    # veces devolvia la respuesta vacia. gemma3:4b no tiene ese modo: responde directo
    # en 5-16s medidos en este servidor.
    ("AVATAR_LOCAL_LLM_MODEL", "gemma3:4b"),
    # Timeout del gateway esperando a Ollama. Mayor que el de OpenRouter (30s) porque
    # esta espera ya no ocurre en un worker de uwsgi, pero no hace falta ser extremo:
    # gemma3:4b responde en 5-16s en este servidor.
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

# NOTA: se intento automatizar la descarga del modelo con CLI_DO_INIT_TASKS (mismo
# patron que notifications_ficct.py), pero Tutor 21 solo corre esos jobs contra un
# servicio "<nombre>-job" explicito en docker-compose.jobs.yml (falla con "no such
# service: avatar-llm-job" si no existe). Definir ese servicio job implicaria manejar
# el arranque del servidor de Ollama solo para el pull, sin ganar nada frente a
# correrlo una vez a mano tras el primer `tutor local start -d`:
#
#     docker exec tutor_local-avatar-llm-1 ollama pull {{ AVATAR_LOCAL_LLM_MODEL }}
#
# Es idempotente (si la capa ya existe, no vuelve a bajarla) y persiste en el volumen
# ../../data/avatar-llm-ollama, asi que sobrevive a restarts/recreaciones del
# contenedor. Solo hace falta repetirlo si se cambia AVATAR_LOCAL_LLM_MODEL a un tag
# nuevo.
