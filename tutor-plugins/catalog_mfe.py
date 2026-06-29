from tutormfe.hooks import MFE_APPS
from tutor import hooks

# Registra el MFE de catalog en Tutor
@MFE_APPS.add()
def _add_catalog_mfe(apps: dict) -> dict:
    apps["catalog"] = {
        "repository": "https://github.com/openedx/frontend-app-catalog.git",
        "port": 1998,
        "version": "master",
    }
    return apps

hooks.Filters.ENV_PATCHES.add_items([
    # Habilitar catalog MFE en ambos entornos
    (
        "openedx-lms-common-settings",
        """
ENABLE_CATALOG_MICROFRONTEND = True
"""
    ),
    # URL para producción (tutor local) - sin puerto
    (
        "openedx-lms-production-settings",
        """
CATALOG_MICROFRONTEND_URL = "http://{{ MFE_HOST }}/catalog"
"""
    ),
    # URL para desarrollo (tutor dev) - con puerto
    (
        "openedx-lms-development-settings",
        """
CATALOG_MICROFRONTEND_URL = "http://{{ LMS_HOST }}:{{ get_mfe('catalog').port }}/catalog"
"""
    ),
])