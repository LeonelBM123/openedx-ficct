"""
Servicio de voz del avatar (TTS + visemas), corriendo como contenedor propio.

    tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_tts.py
    tutor plugins enable avatar_tts
    docker build -t ficct-avatar-tts services/avatar-tts
    tutor config save --set AVATAR_TTS_SECRET=$(openssl rand -hex 32)
    tutor config save --set AVATAR_TTS_API_URL=http://tts.{{ LMS_HOST }}/synthesize
    tutor local start -d

`AVATAR_TTS_SECRET` es el secreto compartido con el LMS: `avatar_asistente.py` lo
inyecta en `FICCT_AVATAR["TTS_SECRET"]`, que `avatar_views.py` usa para firmar los
tokens que este contenedor valida. Sin el mismo valor en los dos lados, todas las
peticiones a `/synthesize` responden 401.

A diferencia de la landing (landing_page.py), la imagen no es publica: hay que
construirla en el servidor con `docker build -t ficct-avatar-tts services/avatar-tts`.
Ver services/avatar-tts/README.md para el benchmark de `AVATAR_TTS_THREADS` y el
detalle completo de la autenticacion por token.
"""
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_TTS_HOST", "tts.{{ LMS_HOST }}"),
    ("AVATAR_TTS_DOCKER_IMAGE", "ficct-avatar-tts:latest"),
    # Tope de paralelismo de PyTorch mientras sintetiza (no una reserva de CPUs: en
    # reposo el contenedor no usa nada). El host tiene que seguir sirviendo uwsgi,
    # Celery, MySQL y Mongo durante una sintesis; medir con el benchmark del README
    # antes de subirlo.
    ("AVATAR_TTS_THREADS", "4"),
    # Peticiones de sintesis por usuario por minuto (el token dura 5 min y podria
    # reusarse sin limite en esa ventana).
    ("AVATAR_TTS_RATE_PER_MIN", "30"),
    # Tope de entradas en la cache de disco (~600 KB cada una).
    ("AVATAR_TTS_CACHE_MAX_ENTRIES", "500"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "local-docker-compose-services",
        """
avatar-tts:
    image: {{ AVATAR_TTS_DOCKER_IMAGE }}
    restart: unless-stopped
    volumes:
        - ../../data/avatar-tts-cache:/cache
    environment:
        AVATAR_TTS_THREADS: "{{ AVATAR_TTS_THREADS }}"
        AVATAR_TTS_RATE_PER_MIN: "{{ AVATAR_TTS_RATE_PER_MIN }}"
        AVATAR_TTS_CACHE_MAX_ENTRIES: "{{ AVATAR_TTS_CACHE_MAX_ENTRIES }}"
        # Secreto compartido con el LMS (ver avatar_asistente.py / avatar_views.py).
        # Sin esto /synthesize responde 503: el servicio falla cerrado, no abierto.
        AVATAR_TTS_SECRET: "{{ AVATAR_TTS_SECRET }}"
        # Defensa en profundidad sobre el token: no es autenticacion (un curl con el
        # token correcto lo saltea igual), pero corta peticiones directas desde otras
        # paginas.
        AVATAR_TTS_CORS_ORIGINS: "http://{{ MFE_HOST }}{% if ENABLE_HTTPS %},https://{{ MFE_HOST }}{% endif %}"
    healthcheck:
        test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if b'true' in urllib.request.urlopen('http://localhost:80/health', timeout=3).read() else 1)"]
        interval: 30s
        timeout: 5s
        start_period: 90s
        retries: 3
"""
    ),
    (
        "caddyfile",
        """
{{ AVATAR_TTS_HOST }}{$default_site_port} {
    import proxy "avatar-tts:80"
}
"""
    ),
])
