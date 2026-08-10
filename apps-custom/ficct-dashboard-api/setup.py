"""
Paquete de APIs propias de FICCT para el LMS de Open edX.

Se instala en la imagen `openedx` via el plugin de Tutor `ficct_dashboard_api.py`
y se registra solo gracias al entry point `lms.djangoapp` (plugin app framework
de Open edX) — no hace falta tocar INSTALLED_APPS ni urls.py del core.
"""
from setuptools import find_packages, setup

setup(
    name='ficct-dashboard-api',
    version='0.1.0',
    description='APIs propias de FICCT para el dashboard del estudiante',
    author='FICCT-UAGRM',
    packages=find_packages(exclude=['tests']),
    include_package_data=True,
    zip_safe=False,
    python_requires='>=3.11',
    entry_points={
        'lms.djangoapp': [
            'ficct_dashboard_api = ficct_dashboard_api.apps:FicctDashboardApiConfig',
        ],
        'cms.djangoapp': [
            'ficct_dashboard_api = ficct_dashboard_api.apps:FicctDashboardApiConfig',
        ],
    },
)
