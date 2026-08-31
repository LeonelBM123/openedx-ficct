from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_LANDING_HOST", "www.{{ LMS_HOST }}"),
    ("FICCT_LANDING_DEPLOY_PATH", "/root/landing-deploy"),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Servidor estático liviano para el dist/ de la landing page (Vite/React SPA).
    # Reutiliza la misma imagen caddy que ya usa el Caddy core de Tutor.
    (
        "local-docker-compose-services",
        """
landing:
    image: docker.io/caddy:2.7.4
    restart: unless-stopped
    volumes:
        - {{ FICCT_LANDING_DEPLOY_PATH }}:/srv/landing:ro
    command: ['sh', '-c', 'printf "%s\\n" ":80 {" "    root * /srv/landing" "    encode gzip" "    try_files {path} /index.html" "    file_server" "}" > /etc/caddy/Caddyfile && exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile']
"""
    ),
    # Vhost en el Caddy frontal de Tutor para el subdominio de la landing.
    (
        "caddyfile",
        """
{{ FICCT_LANDING_HOST }}{$default_site_port} {
    import proxy "landing:80"
}
"""
    ),
    # Redirige a la landing (www.) a quien visita la raíz del LMS sin sesión
    # iniciada. Sin esto, Open edX redirige la raíz al catalog MFE en cuanto
    # ENABLE_CATALOG_MICROFRONTEND=True (ver catalog_mfe.py) -- ese redirect
    # nativo ocurre ANTES de que Open edX evalúe cualquier opción de "marketing
    # site" (branding/views.py:index), así que no se puede resolver por
    # settings de Django mientras el catalog MFE siga activo. `redir` se
    # ejecuta antes que `handle`/`reverse_proxy` en Caddy por defecto, así que
    # esto gana con seguridad sin importar el orden textual. Quien ya inició
    # sesión (cookie edxloggedin=true, ver EDXMKTG_LOGGED_IN_COOKIE_NAME) sigue
    # yendo al LMS normal, sin cambios.
    (
        "caddyfile-lms",
        """
@landing_anon_root {
    path /
    not header_regexp Cookie edxloggedin=true
}
redir @landing_anon_root {% if ENABLE_HTTPS %}https{% else %}http{% endif %}://{{ FICCT_LANDING_HOST }}/
"""
    ),
])
