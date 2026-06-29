from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    (
        "openedx-lms-common-settings",
        """
ENABLE_COMPREHENSIVE_THEMING = True
COMPREHENSIVE_THEME_DIRS = ["/openedx/themes"]
DEFAULT_SITE_THEME = "ficct"
LOGO_URL = "/static/ficct/images/logo.png"
LOGO_WHITE_URL = "/static/ficct/images/logo-white.png"
FAVICON_PATH = "ficct/images/favicon.ico"
"""
    ),
])

hooks.Filters.COMPOSE_MOUNTS.add_items([
    (
        "lms",
        "/root/openedx-ficct/themes",
        "/openedx/themes",
    ),
    (
        "cms",
        "/root/openedx-ficct/themes",
        "/openedx/themes",
    ),
])