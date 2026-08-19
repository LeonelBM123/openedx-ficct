from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_JUDGE0_API_KEY", ""),
    ("FICCT_OPENROUTER_API_KEY", ""),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Configuración de logos y MFE para producción
    (
        "mfe-lms-production-settings",
        """
MFE_CONFIG["LOGO_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo.png"
MFE_CONFIG["LOGO_WHITE_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo-white.png"
MFE_CONFIG["FAVICON_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/favicon.ico"
# Imagen de fondo del hero del catalog MFE. La sirve el contenedor `landing` (caddy) desde
# /root/landing-deploy/assets/, asi que cambiar la foto no requiere reconstruir ningun MFE:
# basta reemplazar el archivo, o apuntar esta variable a otro nombre y `tutor config save`.
MFE_CONFIG["HOMEPAGE_BANNER_IMAGE_URL"] = "http://{{ FICCT_LANDING_HOST }}/assets/facultad.jpg"
MFE_CONFIG["SUPPORT_EMAIL"] = "soporte@ficct.uagrm.edu.bo"
MFE_CONFIG["TERMS_OF_SERVICE_URL"] = "http://{{ LMS_HOST }}/tos"
MFE_CONFIG["PRIVACY_POLICY_URL"] = "http://{{ LMS_HOST }}/privacy"
MFE_CONFIG["ENABLE_ACCESSIBILITY_PAGE"] = False
MFE_CONFIG["DISCOVERY_API_BASE_URL"] = "http://discovery.{{ LMS_HOST }}"
MFE_CONFIG["LANGUAGE_PREFERENCE_COOKIE_NAME"] = "openedx-language-preference"
MFE_CONFIG["DEFAULT_COURSE_LANGUAGE"] = "es-419"
MFE_CONFIG["SITE_LANGUAGE"] = "es-419"
# El botón "Cerrar sesión" de los MFEs usa este valor tal cual (getConfig().LOGOUT_URL),
# sin agregar redirect_url propio. Lo horneamos aquí para que el logout termine en la
# landing page en vez de caer al destino por defecto de Django ("/", que a su vez
# redirige al catalog MFE por ENABLE_CATALOG_MICROFRONTEND=True en catalog_mfe.py).
MFE_CONFIG["LOGOUT_URL"] = "http://{{ LMS_HOST }}/logout?redirect_url=http%3A%2F%2F{{ FICCT_LANDING_HOST }}%2F"
"""
    ),
    # Configuración del XBlock de AI Evaluation (Judge0)
    (
        "openedx-lms-common-settings",
        """
XBLOCK_SETTINGS = {
    "ai_eval": {
        "JUDGE0_API_URL": "https://judge0-ce.p.rapidapi.com",
        "JUDGE0_API_KEY": "{{ FICCT_JUDGE0_API_KEY }}",
        "JUDGE0_API_HOST": "judge0-ce.p.rapidapi.com",
        "GPT4O_API_KEY": "{{ FICCT_OPENROUTER_API_KEY }}",
    }
}

# Permite que Django acepte la landing page como destino seguro de redirect
# tras logout (ver MFE_CONFIG["LOGOUT_URL"] arriba).
LOGIN_REDIRECT_WHITELIST.append("{{ FICCT_LANDING_HOST }}")
"""
    ),
    # Fuerza español como idioma por defecto en los MFEs para visitantes que
    # todavía no tienen preferencia guardada (frontend-platform solo mira la
    # cookie o el idioma del navegador, no SITE_LANGUAGE). Si el visitante ya
    # tiene la cookie seteada, Caddy no la toca: no limita ni fuerza nada
    # para quien ya eligió otro idioma.
    (
        "caddyfile-mfe-proxy",
        """
@no_lang_cookie {
    not header_regexp Cookie openedx-language-preference
}
header @no_lang_cookie Set-Cookie "openedx-language-preference=es-419; Path=/; Max-Age=31536000"
"""
    ),
])