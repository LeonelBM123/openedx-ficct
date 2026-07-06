# Brand FICCT — Estilos y Personalización

## Qué es brand-ficct

Es el paquete npm `@edx/brand` personalizado para la FICCT-UAGRM. Open edX espera un paquete llamado `@edx/brand` que provee variables de color, fuentes y logos. Este paquete reemplaza el brand genérico de Open edX con la identidad visual de la FICCT.

Repositorio: https://github.com/LeonelBM123/brand-ficct

## Colores FICCT

| Color | Hex | Uso |
|-------|-----|-----|
| Azul profundo | `#1a3a6b` | Primario, navegación, botones |
| Rojo | `#cc0000` | Secundario, alertas |
| Dorado | `#f5c518` | Acento, highlights |

## Estructura del paquete

```
brand-ficct/
├── package.json              ← name: "@edx/brand"
├── logo.svg                  ← Logo FICCT (pendiente actualizar)
├── logo-white.svg            ← Logo blanco (pendiente actualizar)
├── logo-trademark.svg
├── favicon.ico               ✅
└── paragon/
    ├── _overrides.scss       ← ARCHIVO PRINCIPAL — colores y overrides
    ├── _variables.scss       ← Variables Paragon sobreescritas
    ├── _fonts.scss           ← Fuentes
    └── images/
        └── card-imagecap-fallback.png
```

## Cómo se aplica en los MFEs

Cada MFE tiene en su archivo SCSS principal (index.scss o App.scss):

```scss
@import '~@edx/brand/paragon/overrides';
```

El paquete se instala en el contenedor durante el build vía el plugin `brand_ficct.py`.

## Modificar estilos

```bash
# 1. Editar el archivo de overrides
nano /root/openedx-ficct/brand-ficct/paragon/_overrides.scss

# 2. Commit y push → dispara GitHub Actions automáticamente
git add brand-ficct/ && git commit -m "feat: ajustar colores FICCT" && git push

# 3. Esperar ~7 min el build
# 4. Aplicar en producción
docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
docker tag ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
tutor local restart
```

## Ver cambios de estilos en modo dev

Después de editar `brand-ficct/paragon/_overrides.scss`:

```bash
# El paquete está instalado localmente en node_modules/@edx/brand/
# Webpack detecta el cambio en el scss importado y recarga automáticamente
# No hace falta reinstalar el paquete — ya apunta a los archivos locales
```

> **Nota:** esto solo funciona si el `@edx/brand` instalado apunta al repo de GitHub. Si el paquete fue instalado desde la URL de git, los cambios locales en `brand-ficct/` NO se reflejan en vivo en dev mode — hay que hacer push al repo de brand-ficct y reinstalar el paquete en el contenedor.

## Dos mundos: MFEs React vs Páginas Legacy

Los estilos de brand-ficct aplican **solo a los MFEs React**. Las páginas Django legacy (login viejo, admin, etc.) usan el Comprehensive Theme en `themes/ficct/`.

| Contexto | Estilos |
|----------|---------|
| MFEs React | brand-ficct (`_overrides.scss`) |
| Páginas legacy | `themes/ficct/lms/static/` |

## Actualizar logos en MFEs

Los logos en los MFEs llegan vía `MFE_CONFIG`, no desde brand-ficct:

```python
# En ficct_config.py
MFE_CONFIG["LOGO_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo.png"
MFE_CONFIG["LOGO_WHITE_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo-white.png"
```

Para cambiar los logos:
1. Reemplazar archivos en `themes/ficct/lms/static/images/`
2. Copiar al build de Tutor: `cp -r /root/openedx-ficct/themes/ficct/. ~/.local/share/tutor/env/build/openedx/themes/ficct/`
3. `tutor images build openedx` (~20 min)
4. `tutor local stop && tutor local start -d`
