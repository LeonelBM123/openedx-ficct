from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    # Instala el paquete @edx/brand desde el repo de FICCT
    (
        "mfe-dockerfile-post-npm-install",
        r"""
RUN npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
"""
    ),
    # Inyecta el @import del brand en el SCSS principal de cada MFE
    (
        "mfe-dockerfile-pre-npm-build",
        r"""
RUN scss_file=$(find /openedx/app/src -maxdepth 2 \( -name 'index.scss' -o -name 'App.scss' \) 2>/dev/null | head -1) && \
    if [ -n "$scss_file" ]; then \
        echo "@import '~@edx/brand/paragon/overrides';" >> "$scss_file" && \
        echo "Injected brand into $scss_file"; \
    fi
"""
    ),
])