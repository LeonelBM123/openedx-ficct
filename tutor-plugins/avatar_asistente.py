from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("AVATAR_ENABLED", "false"),
    ("AVATAR_QA_API_URL", ""),
    ("AZURE_SPEECH_KEY", ""),
    ("AZURE_SPEECH_REGION", ""),
    ("OPENROUTER_API_KEY", ""),
    ("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "mfe-lms-common-settings",
        """
MFE_CONFIG["AVATAR_ENABLED"] = "{{ AVATAR_ENABLED }}"
MFE_CONFIG["AVATAR_QA_API_URL"] = "{{ AVATAR_QA_API_URL }}"
MFE_CONFIG["AZURE_SPEECH_KEY"] = "{{ AZURE_SPEECH_KEY }}"
MFE_CONFIG["AZURE_SPEECH_REGION"] = "{{ AZURE_SPEECH_REGION }}"
MFE_CONFIG["OPENROUTER_API_KEY"] = "{{ OPENROUTER_API_KEY }}"
MFE_CONFIG["OPENROUTER_MODEL"] = "{{ OPENROUTER_MODEL }}"
"""
    ),
])
