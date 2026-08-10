"""
Configuracion de la app como plugin app de Open edX.

El framework de plugin apps (entry points `lms.djangoapp` / `cms.djangoapp`) monta
las URLs del modulo declarado en `url_config` bajo el prefijo indicado, sin necesidad
de editar `urls.py` ni `INSTALLED_APPS` del core. Mismo patron que usa `edx-completion`.

Cada servicio expone su propio modulo de URLs: las vistas del LMS importan
CourseEnrollment/CourseOverview y las del CMS importan course_creators, que solo
esta instalado en Studio.
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
            'cms.djangoapp': {
                PluginURLs.NAMESPACE: 'ficct_dashboard_api',
                PluginURLs.REGEX: r'^api/ficct/',
                PluginURLs.RELATIVE_PATH: 'cms_urls',
            },
        },
    }
