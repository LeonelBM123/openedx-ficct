from tutor import hooks

# Fork propio del XBlock `ia-assistant-plugin` (apps-custom/ia-assistant-plugin).
# Mejoras sobre el upstream (Mau8877/ia-assistant-plugin): author_view, cierre/refresco
# del modal de Studio sin recargar, peso configurable, max_score e historial de revisiones.
#
# IAASSISTANT_SOURCE:
#   "upstream" (default) -> no hace nada; queda el paquete de OPENEDX_EXTRA_PIP_REQUIREMENTS.
#   "ficct"              -> reinstala encima el paquete de este monorepo (mismo nombre de
#                           paquete y entry point, por lo que el contenido ya creado sigue valido).
# Rollback: tutor config save --set IAASSISTANT_SOURCE=upstream && tutor images build openedx
#
# El pip install es desde el repo remoto, no desde el disco: hay que hacer `git push` ANTES
# de rebuildear. Cambiar IAASSISTANT_FICCT_REF invalida la capa de Docker:
#   tutor config save --set IAASSISTANT_SOURCE=ficct --set IAASSISTANT_FICCT_REF=<sha>
hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("IAASSISTANT_SOURCE", "upstream"),
    ("IAASSISTANT_FICCT_REF", "main"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "openedx-dockerfile-post-python-requirements",
        """
{% if IAASSISTANT_SOURCE == "ficct" %}
RUN $PIP_COMMAND install --force-reinstall --no-deps 'git+https://github.com/LeonelBM123/openedx-ficct.git@{{ IAASSISTANT_FICCT_REF }}#subdirectory=apps-custom/ia-assistant-plugin'
{% endif %}
"""
    ),
])
