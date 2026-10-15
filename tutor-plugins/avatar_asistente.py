from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_ENABLED", "false"),
    ("AVATAR_TTS_API_URL", ""),
    # "openrouter" (default, produccion) o "local". En "local" el LLM corre fuera del
    # LMS (ver avatar_llm_local.py): el MFE pide un token aca y habla directo con el
    # gateway, igual que ya hace con la voz -- así una inferencia de 10-60s en CPU no
    # bloquea uno de los 2 workers de uwsgi del LMS.
    ("AVATAR_LLM_PROVIDER", "openrouter"),
    ("OPENROUTER_API_KEY", ""),
    ("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
    ("AVATAR_OPENROUTER_THROTTLE_RATE", "20/min"),
    # URL publica del gateway del LLM local (contenedor propio, ver avatar_llm_local.py).
    # No es secreta -- analoga a AVATAR_TTS_API_URL.
    ("AVATAR_LLM_API_URL", ""),
    # Secreto compartido con avatar-llm-gateway. El LMS lo usa para firmar tokens
    # cortos que el navegador cambia por una respuesta directa de ese contenedor, sin
    # que el LMS proxee la inferencia (ver avatar_views.py, AvatarLlmTokenView).
    ("AVATAR_LLM_SECRET", ""),
    ("AVATAR_LLM_TOKEN_THROTTLE_RATE", "60/min"),
    # Secreto compartido con el contenedor de TTS (ver avatar_tts.py). El LMS lo usa
    # para firmar tokens cortos que el navegador cambia por audio directo con ese
    # contenedor, sin que el LMS proxee el audio (ver avatar_views.py).
    ("AVATAR_TTS_SECRET", ""),
    ("AVATAR_TTS_TOKEN_THROTTLE_RATE", "60/min"),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Carga del modelo 3D del avatar (public/*.glb y animacion.fbx del MFE learning).
    # Antes se servian sin Cache-Control ni compresion: solo con ETag, asi que el
    # navegador revalidaba o volvia a bajar ~6 MB. Los nombres no llevan hash, por eso
    # las rutas del MFE agregan ?v=N (ASSET_VERSION en AvatarSwitcher.jsx): al
    # reemplazar un modelo se sube ese numero y "immutable" es seguro. Este patch va
    # en el Caddy del contenedor mfe, no en el frontal: `tutor local restart mfe`.
    (
        "mfe-caddyfile",
        """
@avatar_assets path *.glb *.fbx
header @avatar_assets Cache-Control "public, max-age=31536000, immutable"
# Caddy no conoce .fbx y lo sirve sin Content-Type, asi que `encode` no lo comprime
# (2.9 MB -> 1.4 MB con gzip). Los .glb ya vienen comprimidos (meshopt + WebP): no
# se tocan.
@avatar_fbx path *.fbx
header @avatar_fbx Content-Type application/octet-stream
encode zstd gzip {
    match {
        header Content-Type application/octet-stream*
    }
}
"""
    ),
    # Lo unico que se publica al navegador. MFE_CONFIG se sirve sin autenticacion en
    # GET /api/mfe_config/v1, asi que aca no puede ir ningun secreto: la key de
    # OpenRouter vivia aca y era legible por cualquiera. AVATAR_LLM_PROVIDER/API_URL
    # no son secretos -- solo le dicen al MFE a que endpoint pegarle (mismo criterio
    # que AVATAR_TTS_API_URL).
    (
        "mfe-lms-common-settings",
        """
MFE_CONFIG["AVATAR_ENABLED"] = "{{ AVATAR_ENABLED }}"
MFE_CONFIG["AVATAR_TTS_API_URL"] = "{{ AVATAR_TTS_API_URL }}"
MFE_CONFIG["AVATAR_LLM_PROVIDER"] = "{{ AVATAR_LLM_PROVIDER }}"
MFE_CONFIG["AVATAR_LLM_API_URL"] = "{{ AVATAR_LLM_API_URL }}"
"""
    ),
    # Config del proxy de OpenRouter (POST /api/ficct/avatar/ask/) y del secreto que
    # firma los tokens del gateway del LLM local (GET /api/ficct/avatar/llm-token/),
    # ambos en apps-custom/ficct-dashboard-api. Ningun secreto sale del servidor.
    #
    # El dict tiene nombre propio a proposito: iaassistant.py define un setting de
    # Django de nivel superior llamado OPENROUTER_API_KEY (con el valor de
    # IAASSISTANT_OPENROUTER_API_KEY), asi que reusar ese nombre haria que uno pisara
    # al otro en silencio segun el orden de los patches.
    (
        "openedx-lms-common-settings",
        """
FICCT_AVATAR = {
    "LLM_PROVIDER": "{{ AVATAR_LLM_PROVIDER }}",
    "OPENROUTER_API_KEY": "{{ OPENROUTER_API_KEY }}",
    "OPENROUTER_MODEL": "{{ OPENROUTER_MODEL }}",
    "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
    "LLM_SECRET": "{{ AVATAR_LLM_SECRET }}",
    "LLM_TOKEN_THROTTLE_RATE": "{{ AVATAR_LLM_TOKEN_THROTTLE_RATE }}",
    "THROTTLE_RATE": "{{ AVATAR_OPENROUTER_THROTTLE_RATE }}",
    "TTS_SECRET": "{{ AVATAR_TTS_SECRET }}",
    "TTS_TOKEN_THROTTLE_RATE": "{{ AVATAR_TTS_TOKEN_THROTTLE_RATE }}",
}

# El avatar lee el texto de la unidad que el alumno tiene abierta desde la Course
# Blocks API (?student_view_data=html,video). Sin este flag el bloque HTML responde
# solo {"enabled": false}. html_block.py lee settings.FEATURES; el top-level es el
# nombre documentado del toggle.
ENABLE_HTML_XBLOCK_STUDENT_VIEW_DATA = True
FEATURES["ENABLE_HTML_XBLOCK_STUDENT_VIEW_DATA"] = True
"""
    ),
])
