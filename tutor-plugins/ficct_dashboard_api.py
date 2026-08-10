from tutor import hooks

# Ref de git (rama o commit sha) del paquete `apps-custom/ficct-dashboard-api`.
# Al ser parte del comando pip, cambiar este valor invalida la capa de Docker y
# fuerza la reinstalacion del paquete en el siguiente `tutor images build openedx`:
#   tutor config save --set FICCT_DASHBOARD_API_REF=<sha>
hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_DASHBOARD_API_REF", "main"),
])

hooks.Filters.ENV_PATCHES.add_items([
    # APIs propias de FICCT en el LMS (/api/ficct/...). Es una plugin app de Open edX
    # (entry point lms.djangoapp), asi que se auto-registra: no toca INSTALLED_APPS ni urls.py.
    (
        "openedx-dockerfile-post-python-requirements",
        """
RUN $PIP_COMMAND install 'git+https://github.com/LeonelBM123/openedx-ficct.git@{{ FICCT_DASHBOARD_API_REF }}#subdirectory=apps-custom/ficct-dashboard-api'
"""
    ),
])
