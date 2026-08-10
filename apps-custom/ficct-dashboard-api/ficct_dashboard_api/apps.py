"""
Configuracion de la app como plugin app de Open edX.

El framework de plugin apps (entry point `lms.djangoapp`) monta las URLs de
`urls.py` bajo el prefijo declarado en `url_config`, sin necesidad de editar
`lms/urls.py` ni `INSTALLED_APPS` del core. Mismo patron que usa `edx-completion`.
"""
from django.apps import AppConfig
from edx_django_utils.plugins.constants import PluginURLs


class FicctDashboardApiConfig(AppConfig):
    """AppConfig de las APIs propias de FICCT."""

    name = 'ficct_dashboard_api'
    verbose_name = 'FICCT Dashboard API'

    plugin_app = {
        PluginURLs.CONFIG: {
            'lms.djangoapp': {
                PluginURLs.NAMESPACE: 'ficct_dashboard_api',
                PluginURLs.REGEX: r'^api/ficct/',
                PluginURLs.RELATIVE_PATH: 'urls',
            },
        },
    }
