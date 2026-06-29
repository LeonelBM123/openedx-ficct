from tutormfe.hooks import MFE_APPS, MFE_ATTRS_TYPE

@MFE_APPS.add()
def _add_catalog_mfe(apps: dict) -> dict:
    apps["catalog"] = {
        "repository": "https://github.com/openedx/frontend-app-catalog.git",
        "port": 2004,
    }
    return apps
