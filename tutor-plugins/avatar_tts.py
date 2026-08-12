"""
Servicio de voz del avatar corriendo en el propio servidor, como alternativa a Modal.

Plugin OPCIONAL: mientras no se habilite, la voz sigue saliendo de Modal. Habilitarlo
no cambia nada por si solo -- hay que apuntar AVATAR_TTS_API_URL al vhost nuevo:

    tutor plugins install /root/openedx-ficct/tutor-plugins/avatar_tts.py
    tutor plugins enable avatar_tts
    tutor config save --set AVATAR_TTS_API_URL=http://tts.{{ LMS_HOST }}/synthesize
    tutor local start -d

Volver a Modal es un solo comando (`tutor config save --set AVATAR_TTS_API_URL=<url modal>`),
sin rebuild: por eso conviene medir en produccion antes de decidir. Ver
services/avatar-tts/README.md.

A diferencia de la landing (landing_page.py), aca la imagen no es publica: hay que
construirla en el servidor con `docker build -t ficct-avatar-tts services/avatar-tts`.
"""
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_TTS_HOST", "tts.{{ LMS_HOST }}"),
    ("AVATAR_TTS_DOCKER_IMAGE", "ficct-avatar-tts:latest"),
    # Cuantos cores puede tomar torch. El host tiene que seguir sirviendo uwsgi,
    # Celery, MySQL y Mongo mientras el TTS sintetiza.
    ("AVATAR_TTS_THREADS", "4"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "local-docker-compose-services",
        """
avatar-tts:
    image: {{ AVATAR_TTS_DOCKER_IMAGE }}
    restart: unless-stopped
    environment:
        AVATAR_TTS_THREADS: "{{ AVATAR_TTS_THREADS }}"
        # Solo el MFE llama de verdad a este servicio. No es autenticacion (un curl se
        # lo saltea), pero evita que lo invoquen desde otras paginas.
        AVATAR_TTS_CORS_ORIGINS: "http://{{ MFE_HOST }}{% if ENABLE_HTTPS %},https://{{ MFE_HOST }}{% endif %}"
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
