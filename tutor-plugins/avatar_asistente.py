from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_ENABLED", "false"),
    ("AVATAR_TTS_API_URL", ""),
    ("OPENROUTER_API_KEY", ""),
    ("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
    ("AVATAR_OPENROUTER_THROTTLE_RATE", "20/min"),
    # Secreto compartido con el contenedor de TTS (ver avatar_tts.py). El LMS lo usa
    # para firmar tokens cortos que el navegador cambia por audio directo con ese
    # contenedor, sin que el LMS proxee el audio (ver avatar_views.py).
    ("AVATAR_TTS_SECRET", ""),
    ("AVATAR_TTS_TOKEN_THROTTLE_RATE", "60/min"),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Lo unico que se publica al navegador. MFE_CONFIG se sirve sin autenticacion en
    # GET /api/mfe_config/v1, asi que aca no puede ir ningun secreto: la key de
    # OpenRouter vivia aca y era legible por cualquiera.
    (
        "mfe-lms-common-settings",
        """
MFE_CONFIG["AVATAR_ENABLED"] = "{{ AVATAR_ENABLED }}"
MFE_CONFIG["AVATAR_TTS_API_URL"] = "{{ AVATAR_TTS_API_URL }}"
"""
    ),
    # Config del proxy del LLM (POST /api/ficct/avatar/ask/, en el paquete
    # apps-custom/ficct-dashboard-api). La key nunca sale del servidor.
    #
    # El dict tiene nombre propio a proposito: iaassistant.py define un setting de
    # Django de nivel superior llamado OPENROUTER_API_KEY (con el valor de
    # IAASSISTANT_OPENROUTER_API_KEY), asi que reusar ese nombre haria que uno pisara
    # al otro en silencio segun el orden de los patches.
    (
        "openedx-lms-common-settings",
        """
FICCT_AVATAR = {
    "OPENROUTER_API_KEY": "{{ OPENROUTER_API_KEY }}",
    "OPENROUTER_MODEL": "{{ OPENROUTER_MODEL }}",
    "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
    "THROTTLE_RATE": "{{ AVATAR_OPENROUTER_THROTTLE_RATE }}",
    "TTS_SECRET": "{{ AVATAR_TTS_SECRET }}",
    "TTS_TOKEN_THROTTLE_RATE": "{{ AVATAR_TTS_TOKEN_THROTTLE_RATE }}",
}
"""
    ),
])
