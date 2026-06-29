from tutor import hooks
from tutormfe.hooks import MFE_APPS

@MFE_APPS.add()
def _add_catalog_mfe(apps: dict) -> dict:
    apps["catalog"] = {
        "repository": "https://github.com/openedx/frontend-app-catalog.git",
        "port": 2004,
    }
    return apps

hooks.Filters.ENV_PATCHES.add_items([
    (
        "mfe-dockerfile-post-npm-install",
        """
RUN npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
"""
    ),
    (
        "mfe-dockerfile-pre-npm-build",
        """
RUN scss_file=$(find /openedx/app/src -maxdepth 2 \( -name 'index.scss' -o -name 'App.scss' \) 2>/dev/null | head -1) && if [ -n "$scss_file" ]; then echo "@import '~@edx/brand/paragon/overrides';" >> "$scss_file" && echo "Injected into $scss_file"; fi
"""
    ),
    (
        "openedx-lms-common-settings",
        """
ENABLE_CATALOG_MICROFRONTEND = True
CATALOG_MICROFRONTEND_URL = "http://apps.167.172.142.82.nip.io/catalog"

# Tema FICCT
ENABLE_COMPREHENSIVE_THEMING = True
COMPREHENSIVE_THEME_DIRS = ["/openedx/themes"]
DEFAULT_SITE_THEME = "ficct"
LOGO_URL = "/static/ficct/images/logo.png"
LOGO_WHITE_URL = "/static/ficct/images/logo_white.png"
FAVICON_PATH = "ficct/images/favicon.ico"
"""
    ),
    (
        "mfe-lms-production-settings",
        """
MFE_CONFIG["SUPPORT_EMAIL"] = "soporte@ficct.uagrm.edu.bo"
MFE_CONFIG["TERMS_OF_SERVICE_URL"] = "http://167.172.142.82.nip.io/tos"
MFE_CONFIG["PRIVACY_POLICY_URL"] = "http://167.172.142.82.nip.io/privacy"
MFE_CONFIG["ENABLE_ACCESSIBILITY_PAGE"] = False
MFE_CONFIG["DISCOVERY_API_BASE_URL"] = "http://discovery.167.172.142.82.nip.io"
"""
    ),
])