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
])
