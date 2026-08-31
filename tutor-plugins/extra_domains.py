from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    # El vhost de meilisearch ya lo define nativamente el propio Tutor/Indigo
    # (aparece por separado en el Caddyfile generado). Declararlo aquí también
    # produce "ambiguous site definition" y Caddy no arranca -- por eso este
    # plugin solo debe agregar el de superset, que no lo provee nadie más.
    (
        "caddyfile",
        """
superset.aulavirtual.ficct.uagrm.edu.bo {
    respond "Superset aun no esta instalado en esta plataforma" 200
}
"""
    ),
])
