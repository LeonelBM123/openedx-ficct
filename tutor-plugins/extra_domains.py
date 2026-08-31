from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    (
        "caddyfile",
        """
meilisearch.aulavirtual.ficct.uagrm.edu.bo {
    reverse_proxy meilisearch:7700
}

superset.aulavirtual.ficct.uagrm.edu.bo {
    respond "Superset aun no esta instalado en esta plataforma" 200
}
"""
    ),
])
