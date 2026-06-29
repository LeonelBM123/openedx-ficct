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
MFE_CONFIG["SUPPORT_EMAIL"] = "soporte@ficct.uagrm.edu.bo"
MFE_CONFIG["TERMS_OF_SERVICE_URL"] = "http://{{ LMS_HOST }}/tos"
MFE_CONFIG["PRIVACY_POLICY_URL"] = "http://{{ LMS_HOST }}/privacy"
MFE_CONFIG["ENABLE_ACCESSIBILITY_PAGE"] = False
MFE_CONFIG["DISCOVERY_API_BASE_URL"] = "http://discovery.{{ LMS_HOST }}"
MFE_CONFIG["LANGUAGE_PREFERENCE_COOKIE_NAME"] = "openedx-language-preference"
MFE_CONFIG["DEFAULT_COURSE_LANGUAGE"] = "es-419"
MFE_CONFIG["SITE_LANGUAGE"] = "es-419"
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
"""
    ),
])