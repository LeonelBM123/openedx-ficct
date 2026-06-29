# CLAUDE.md — Contexto del Proyecto Open edX FICCT

## Descripción del Proyecto

Plataforma de aprendizaje virtual de la **FICCT-UAGRM** (Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones, Universidad Autónoma Gabriel René Moreno) en Santa Cruz, Bolivia. Basada en **Open edX Ulmo (v21)** desplegada con **Tutor 21**.

---

## Infraestructura

| Componente | Detalle |
|------------|---------|
| Servidor | DigitalOcean, Ubuntu, IP: 167.172.142.82 |
| Acceso | SSH como root |
| Plataforma | Open edX Ulmo (release 21) |
| Gestor | Tutor 21 (Ulmo) |
| LMS Host | 167.172.142.82.nip.io |
| MFE Host | apps.167.172.142.82.nip.io |
| Monorepo | /root/openedx-ficct/ |

---

## Estructura del Monorepo

```
/root/openedx-ficct/
├── mfes/                            ← MFEs forkeados de openedx
│   ├── frontend-app-authn/
│   ├── frontend-app-learner-dashboard/
│   ├── frontend-app-learning/
│   ├── frontend-app-authoring/
│   └── frontend-app-catalog/
├── brand-ficct/                     ← Paquete npm @edx/brand para MFEs
│   ├── logo.svg                     ← Logo FICCT SVG (REEMPLAZAR)
│   ├── logo-white.svg               ← Logo blanco SVG (REEMPLAZAR)
│   ├── logo-trademark.svg           ← Logo trademark SVG (REEMPLAZAR)
│   ├── favicon.ico                  ← Favicon FICCT
│   ├── package.json                 ← name: "@edx/brand"
│   └── paragon/
│       ├── _overrides.scss          ← Colores FICCT
│       ├── _variables.scss
│       ├── _fonts.scss
│       └── images/
│           └── card-imagecap-fallback.png
├── themes/                          ← Comprehensive Theme para páginas Django legacy
│   └── ficct/
│       └── lms/
│           └── static/
│               └── images/
│                   ├── logo.png
│                   ├── logo-white.png
│                   └── favicon.ico
├── tutor-plugins/                   ← Plugins de Tutor (fuente de verdad)
│   ├── brand_ficct.py
│   ├── catalog_mfe.py
│   ├── ficct_theme.py
│   └── ficct_config.py
├── apps-custom/                     ← Django apps custom (futuro)
├── .gitignore
└── README.md
```

---

## Colores FICCT

| Color | Hex |
|-------|-----|
| Azul profundo (primario) | `#1a3a6b` |
| Rojo (secundario) | `#cc0000` |
| Dorado (acento) | `#f5c518` |

---

## Sistema de Plugins de Tutor

### Concepto fundamental

Los plugins de Tutor son archivos Python que inyectan código en archivos que Tutor genera dinámicamente al correr `tutor config save`. **Nunca edites directamente los archivos generados** — siempre usa plugins.

### Archivos generados importantes

```
~/.local/share/tutor/env/build/mfe/Dockerfile           ← Dockerfile del MFE
~/.local/share/tutor/env/apps/openedx/settings/lms/production.py
~/.local/share/tutor/env/apps/mfe/production.env.config.jsx
```

### Patches más usados

| Patch | Aplica a |
|-------|---------|
| `mfe-dockerfile-post-npm-install` | Dockerfile MFE, tras npm install |
| `mfe-dockerfile-pre-npm-build` | Dockerfile MFE, antes del build |
| `openedx-lms-common-settings` | Django settings LMS, prod + dev |
| `openedx-lms-production-settings` | Django settings LMS, solo prod |
| `openedx-lms-development-settings` | Django settings LMS, solo dev |
| `openedx-common-settings` | Django settings LMS + CMS, prod + dev |
| `mfe-lms-production-settings` | env.config.jsx MFEs, solo prod |
| `mfe-lms-common-settings` | env.config.jsx MFEs, prod + dev |
| `openedx-dockerfile-post-python-requirements` | Dockerfile openedx, tras pip install |

### Workflow de plugins

```bash
# 1. Editar plugin en el monorepo
nano /root/openedx-ficct/tutor-plugins/ficct_config.py

# 2. Reinstalar en Tutor
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_config.py

# 3. Regenerar entorno
tutor config save

# 4. Reiniciar servicio afectado
tutor local restart lms
```

---

## Plugins Actuales

### `brand_ficct.py`
Instala el paquete `@edx/brand` desde `LeonelBM123/brand-ficct` en cada MFE durante el build.

```python
from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    (
        "mfe-dockerfile-post-npm-install",
        r"""
RUN npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
"""
    ),
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
```

### `catalog_mfe.py`
Registra el MFE de catalog y configura las URLs por entorno.

```python
from tutormfe.hooks import MFE_APPS
from tutor import hooks

@MFE_APPS.add()
def _add_catalog_mfe(apps: dict) -> dict:
    apps["catalog"] = {
        "repository": "https://github.com/openedx/frontend-app-catalog.git",
        "port": 1998,
        "version": "master",
    }
    return apps

hooks.Filters.ENV_PATCHES.add_items([
    ("openedx-lms-common-settings", """
ENABLE_CATALOG_MICROFRONTEND = True
"""),
    ("openedx-lms-production-settings", """
CATALOG_MICROFRONTEND_URL = "http://{{ MFE_HOST }}/catalog"
"""),
    ("openedx-lms-development-settings", """
CATALOG_MICROFRONTEND_URL = "http://{{ LMS_HOST }}:{{ get_mfe('catalog').port }}/catalog"
"""),
])
```

### `ficct_theme.py` (pendiente de crear)
Configura el Comprehensive Theme para páginas Django legacy.

```python
from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    ("openedx-lms-common-settings", """
ENABLE_COMPREHENSIVE_THEMING = True
COMPREHENSIVE_THEME_DIRS = ["/openedx/themes"]
DEFAULT_SITE_THEME = "ficct"
LOGO_URL = "/static/ficct/images/logo.png"
LOGO_WHITE_URL = "/static/ficct/images/logo-white.png"
FAVICON_PATH = "ficct/images/favicon.ico"
"""),
])
```

### `ficct_config.py` (pendiente de crear)
Configuración general del LMS y MFEs.

```python
from tutor import hooks

hooks.Filters.ENV_PATCHES.add_items([
    ("mfe-lms-production-settings", """
MFE_CONFIG["SUPPORT_EMAIL"] = "soporte@ficct.uagrm.edu.bo"
MFE_CONFIG["LOGO_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo.png"
MFE_CONFIG["LOGO_WHITE_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo-white.png"
MFE_CONFIG["FAVICON_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/favicon.ico"
"""),
])
```

---

## Sistema de Logos e Imágenes

### Dos mundos separados

| Contexto | Archivo | Dónde va | Cuándo aplica |
|----------|---------|----------|---------------|
| MFEs React | `logo.svg` | `brand-ficct/logo.svg` | Headers de MFEs |
| MFEs React | `logo-white.svg` | `brand-ficct/logo-white.svg` | Login, fondos oscuros |
| MFEs React | `logo-trademark.svg` | `brand-ficct/logo-trademark.svg` | Footer |
| MFEs React | `favicon.ico` | `brand-ficct/favicon.ico` | Tab del browser |
| Páginas legacy | `logo.png` | `themes/ficct/lms/static/images/` | LMS Django |
| Páginas legacy | `favicon.ico` | `themes/ficct/lms/static/images/` | Tab en páginas legacy |

### Problema actual
- `logo.svg` en `brand-ficct` es el original de openedx (6 años) — NO el de FICCT
- `logo.png` sí está actualizado con el logo FICCT
- Los MFEs usan SVG, no PNG → por eso el logo no cambia en los MFEs

### Solución pendiente
Reemplazar los archivos SVG en `brand-ficct/` con los logos de FICCT en formato SVG.

---

## Flujos de Trabajo

### Flujo para cambios en estilos/colores (brand)

```bash
# 1. Editar en el monorepo
nano /root/openedx-ficct/brand-ficct/paragon/_overrides.scss

# 2. Commit y push
cd /root/openedx-ficct
git add brand-ficct/
git commit -m "feat: update FICCT brand colors"
git push

# 3. Rebuild MFE (requerido — SCSS se compila en el build)
tutor images build mfe
tutor local restart
```

### Flujo para cambios en plugins

```bash
# 1. Editar plugin
nano /root/openedx-ficct/tutor-plugins/ficct_config.py

# 2. Reinstalar
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_config.py

# 3. Aplicar
tutor config save
tutor local restart lms
```

### Flujo para sincronizar desde PC de escritorio

```bash
cd /root/openedx-ficct
git pull
tutor plugins install /root/openedx-ficct/tutor-plugins/*.py
tutor config save
```

### Flujo para rebuild completo

```bash
tutor images build mfe
tutor images build openedx
tutor local stop
tutor local start -d
```

---

## Comandos de Referencia

```bash
# Estado de servicios
tutor local status

# Logs de un servicio
tutor local logs --tail=50 lms

# Reiniciar un servicio
tutor local restart lms

# Plugins
tutor plugins list
tutor plugins install /root/openedx-ficct/tutor-plugins/nombre.py
tutor plugins enable nombre
tutor plugins disable nombre

# Configuración
tutor config save
tutor config printvalue LMS_HOST
tutor config printvalue MFE_HOST

# Verificar inyección de plugins en archivos generados
grep -r "brand-ficct" ~/.local/share/tutor/env/
grep -r "ficct" ~/.local/share/tutor/env/apps/openedx/settings/

# Activar tema comprehensive
tutor local run lms ./manage.py lms set_theme ficct \
  --sites "$(tutor config printvalue LMS_HOST)"

# Compilar estáticos del tema
tutor local run lms ./manage.py lms compile_sass
tutor local run lms ./manage.py lms collectstatic --noinput
```

---

## Rutas Importantes del Servidor

```bash
# Configuración de Tutor
~/.local/share/tutor/config.yml

# Archivos generados por Tutor
~/.local/share/tutor/env/

# Plugins instalados en Tutor
~/.local/share/tutor-plugins/

# Monorepo del proyecto
/root/openedx-ficct/

# Dockerfile del MFE (para verificar inyecciones)
~/.local/share/tutor/env/plugins/mfe/build/mfe/Dockerfile
```

---

## Tareas Pendientes (por orden de prioridad)

1. **Clonar monorepo en el servidor** — `git clone https://github.com/LeonelBM123/openedx-ficct.git /root/openedx-ficct`
2. **Crear carpetas faltantes** — `themes/`, `tutor-plugins/`, `apps-custom/`
3. **Migrar plugins actuales al monorepo** — copiar + refactorizar en archivos separados
4. **Reinstalar plugins desde el monorepo** — fuente de verdad en Git
5. **Crear comprehensive theme** — carpeta `themes/ficct/` con logos PNG
6. **Reemplazar SVGs en brand-ficct** — con logos reales de FICCT
7. **Rebuild de imagen MFE** — para que tome el nuevo brand
8. **Verificar logos** — en MFEs y páginas legacy

---

## Notas Importantes

- **NUNCA edites directamente** los archivos en `~/.local/share/tutor/env/` — se sobreescriben con `tutor config save`
- **Los plugins son la fuente de verdad** — todo cambio va primero al monorepo, luego se instala en Tutor
- **Rebuild de MFE es costoso** — solo cuando cambia brand-ficct (SCSS o SVGs)
- **`tutor config save` regenera el entorno** — correr siempre después de cambiar plugins
- **Verawood (Tutor 22) sale en junio 2026** — no actualizar hasta que haya parches de estabilización
- **brand-ficct puede ser submodule** — verificar con `git submodule status` si es submodule o carpeta normal

---

## Contexto Académico

- **Institución:** FICCT-UAGRM, Santa Cruz, Bolivia
- **Proyecto:** Plataforma Virtual FICCT (Gestión 2026-1)
- **Instructor:** Ing. Rolando Martínez Canedo (SW1)
- **Equipo:** Leonel (IoT/Brand/MFEs), D'Alessandro (video), Otsubo (3D), Mauro (tours virtuales), Alejandro (smart contracts)