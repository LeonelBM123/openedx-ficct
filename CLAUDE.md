# CLAUDE.md — Contexto del Proyecto Open edX FICCT

## Descripción del Proyecto

Plataforma de aprendizaje virtual de la **FICCT-UAGRM** (Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones, Universidad Autónoma Gabriel René Moreno) en Santa Cruz, Bolivia. Basada en **Open edX Ulmo (v21)** desplegada con **Tutor 21**.

---

## Regla fundamental de desarrollo

**Todo el desarrollo y despliegue se hace a través de Tutor. Nunca mediante `npm start` standalone.**

- Las variables de entorno de los MFEs llegan siempre vía **Tutor config** (`tutor config save --set KEY=valor`) → plugin Python → `MFE_CONFIG` → runtime API del LMS → `getConfig()` en el MFE.
- Los archivos `.env` y `.env.development` de los MFEs **no se usan** en este proyecto. No proponer editar `.env.*` para configurar variables — siempre usar el plugin de Tutor correspondiente.
- Para aplicar cambios de configuración: `tutor config save` → `tutor local restart lms` (o `tutor dev restart lms`).
- Los secretos (API keys, claves de servicios externos) van en `~/.local/share/tutor/config.yml` vía `tutor config save --set KEY=valor`, nunca en archivos del repositorio.

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
| Monorepo servidor | /root/openedx-ficct/ |
| Monorepo PC | C:\Users\PC\openedx-ficct\ |

### Dominios y vhosts (Caddy)

| Subdominio | Destino | Definido en |
|------------|---------|-------------|
| `<LMS_HOST>` (raíz) | `lms:8000`. Anónimos son redirigidos a `www.<LMS_HOST>` (landing); con sesión iniciada (`edxloggedin=true`) va al LMS normal | `landing_page.py` (redirect) + Tutor core (LMS) |
| `studio.<LMS_HOST>` | `cms:8000` | Tutor core (CMS_HOST) |
| `apps.<LMS_HOST>` | `mfe:8002` | `mfe` (plugin oficial de Tutor) |
| `www.<LMS_HOST>` | `landing:80` (sitio estático) | `landing_page.py` (`FICCT_LANDING_HOST`) |
| `meilisearch.<LMS_HOST>` | `meilisearch:7700` | **Tutor/Indigo, nativo** — no redeclarar en un plugin propio (ver Gotchas de Caddy) |
| `superset.<LMS_HOST>` | Placeholder ("aún no instalado") | `extra_domains.py` |

---

## Estructura del Monorepo

```
openedx-ficct/
├── mfes/                            ← MFEs forkeados de openedx
│   ├── frontend-app-authn/
│   ├── frontend-app-learner-dashboard/
│   ├── frontend-app-learning/
│   ├── frontend-app-authoring/
│   └── frontend-app-catalog/
├── brand-ficct/                     ← Paquete npm @edx/brand para MFEs
│   ├── logo.svg                     ← Logo FICCT SVG (pendiente reemplazar)
│   ├── logo-white.svg               ← Logo blanco SVG (pendiente reemplazar)
│   ├── logo-trademark.svg           ← Logo trademark SVG (pendiente reemplazar)
│   ├── favicon.ico                  ← Favicon FICCT ✅
│   ├── package.json                 ← name: "@edx/brand"
│   └── paragon/
│       ├── _overrides.scss          ← Colores FICCT + banner catalog
│       ├── _variables.scss
│       ├── _fonts.scss
│       └── images/
│           └── card-imagecap-fallback.png
├── themes/                          ← Comprehensive Theme para páginas Django legacy
│   └── ficct/
│       └── lms/                     ← OBLIGATORIO — sin esta carpeta Open edX no reconoce el tema
│           └── static/
│               └── images/
│                   ├── logo.png     ✅
│                   ├── logo-white.png ✅
│                   ├── favicon.ico  ✅
│                   └── banner.jpg   ✅
├── tutor-plugins/                   ← Plugins de Tutor (fuente de verdad)
│   ├── brand_ficct.py               ← Instala brand npm en MFEs
│   ├── catalog_mfe.py               ← Registra MFE catalog
│   ├── ficct_theme.py               ← Comprehensive Theme Django legacy
│   ├── ficct_config.py              ← MFE_CONFIG + Judge0 + logos
│   ├── landing_page.py              ← Contenedor + vhost www. de la landing, redirect raíz→landing
│   └── extra_domains.py             ← Vhost Caddy extra (superset)
├── apps-custom/                     ← Django apps custom instaladas en la imagen openedx
│   └── ficct-dashboard-api/         ← Plugin app LMS: /api/ficct/popular-courses/
├── docs/                            ← Guías y documentación
├── CLAUDE.md
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

### Separación de responsabilidades

| Plugin | Responsabilidad |
|--------|----------------|
| `brand_ficct.py` | Solo instala el paquete npm @edx/brand en el Dockerfile del MFE |
| `catalog_mfe.py` | Solo registra el MFE catalog y configura sus URLs por entorno |
| `ficct_theme.py` | Solo configura el Comprehensive Theme para páginas Django legacy |
| `ficct_config.py` | MFE_CONFIG (logos, email, URLs) + Judge0 XBlock |
| `notifications_ficct.py` | Activa el waffle flag `notifications.enable_notifications` (campana de notificaciones en todos los headers) |
| `ficct_dashboard_api.py` | Instala el paquete `apps-custom/ficct-dashboard-api` en la imagen openedx (APIs propias bajo `/api/ficct/`) |
| `avatar_tts.py` | Contenedor propio de voz del avatar (`services/avatar-tts`, imagen que se construye a mano en cada servidor) + ruta `/avatar-tts/*` dentro del vhost del LMS en Caddy (no un subdominio propio, para no consumir otro DNS). El token que autentica ese contenedor lo emite `/api/ficct/avatar/tts-token/`, definido junto al resto de settings del avatar en `avatar_asistente.py` |
| `landing_page.py` | Contenedor `landing` (caddy sirviendo estáticos del build Vite/React de `landing-page/`) + vhost `www.{{ LMS_HOST }}` para él + redirect en el vhost del LMS: anónimos que visitan la raíz van a la landing, con sesión iniciada van al LMS normal (ver Dominios y vhosts arriba) |
| `extra_domains.py` | Agrega al Caddyfile global (patch `caddyfile`) el vhost `superset.{{ LMS_HOST base }}` (placeholder — responde un mensaje fijo hasta que se instale Superset). **No** declara `meilisearch` — ese vhost ya lo genera nativamente Tutor/Indigo (ver Gotchas de Caddy) |

### Patches más usados

| Patch | Aplica a |
|-------|---------|
| `mfe-dockerfile-post-npm-install` | Dockerfile MFE, tras npm install |
| `mfe-dockerfile-pre-npm-build` | Dockerfile MFE, antes del build |
| `openedx-lms-common-settings` | Django settings LMS, prod + dev |
| `openedx-lms-production-settings` | Django settings LMS, solo prod |
| `openedx-lms-development-settings` | Django settings LMS, solo dev |
| `openedx-common-settings` | Django settings LMS + CMS, prod + dev |
| `mfe-lms-production-settings` | MFE_CONFIG via LMS API, solo prod |
| `mfe-lms-common-settings` | MFE_CONFIG via LMS API, prod + dev |
| `openedx-dockerfile-post-python-requirements` | Dockerfile openedx, tras pip install |

### Workflow de plugins

```bash
# 1. Editar plugin en el monorepo
nano /root/openedx-ficct/tutor-plugins/ficct_config.py

# 2. Reinstalar en Tutor
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_config.py

# 3. Regenerar entorno
tutor config save

# 4. Reiniciar el servicio que corresponda al patch tocado (ver tabla abajo)
tutor local restart lms
```

⚠️ **El restart correcto depende del patch, no siempre es `lms`:**

| Patch tocado | Restart |
|--------------|---------|
| `openedx-*`, `mfe-lms-*` (settings Django/MFE_CONFIG) | `tutor local restart lms` (+ `cms` si el patch también aplica ahí) |
| `caddyfile`, `caddyfile-lms`, `caddyfile-mfe-proxy` (Caddy) | `tutor local restart caddy` |
| `local-docker-compose-services` que agrega un contenedor nuevo | `tutor local start -d` |

### ⚠️ Gotchas de Caddy

- **No redeclarar un vhost que Tutor ya genera nativamente.** El release Indigo ya define su propio vhost para `meilisearch.<LMS_HOST>`. Si un plugin propio lo vuelve a declarar (como hacía `extra_domains.py` hasta que se corrigió), Caddy falla al arrancar con `ambiguous site definition` y el contenedor queda en loop de reinicio — **tumba el sitio completo**, no solo el subdominio duplicado. Antes de agregar un vhost nuevo, revisar si ya existe en el Caddyfile generado (`~/.local/share/tutor/env/apps/caddy/Caddyfile`).
- **Validar el Caddyfile generado antes de reiniciar Caddy**, sin tocar el contenedor que ya está corriendo:
  ```bash
  docker exec tutor_local-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  ```
  Si responde `Valid configuration`, el `tutor local restart caddy` es seguro. Si falla, se corrige el plugin ANTES de reiniciar — así se evita el corte de servicio que causó justamente el problema anterior.

---

## Código Completo de los Plugins

### `brand_ficct.py`

```python
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
```

### `catalog_mfe.py`

```python
from tutormfe.hooks import MFE_APPS
from tutor import hooks

# Registra el MFE de catalog en Tutor
@MFE_APPS.add()
def _add_catalog_mfe(apps: dict) -> dict:
    apps["catalog"] = {
        "repository": "https://github.com/openedx/frontend-app-catalog.git",
        "port": 1998,
        "version": "master",
    }
    return apps

hooks.Filters.ENV_PATCHES.add_items([
    # Habilitar catalog MFE en ambos entornos
    (
        "openedx-lms-common-settings",
        """
ENABLE_CATALOG_MICROFRONTEND = True
"""
    ),
    # URL para producción (tutor local) - sin puerto
    (
        "openedx-lms-production-settings",
        """
CATALOG_MICROFRONTEND_URL = "http://{{ MFE_HOST }}/catalog"
"""
    ),
    # URL para desarrollo (tutor dev) - con puerto
    (
        "openedx-lms-development-settings",
        """
CATALOG_MICROFRONTEND_URL = "http://{{ LMS_HOST }}:{{ get_mfe('catalog').port }}/catalog"
"""
    ),
])
```

### `ficct_theme.py`

```python
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
```

### `ficct_config.py`

```python
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_JUDGE0_API_KEY", ""),
    ("FICCT_OPENROUTER_API_KEY", ""),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Configuración de logos y MFE para producción
    (
        "mfe-lms-production-settings",
        """
MFE_CONFIG["LOGO_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo.png"
MFE_CONFIG["LOGO_WHITE_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/logo-white.png"
MFE_CONFIG["FAVICON_URL"] = "http://{{ LMS_HOST }}/static/ficct/images/favicon.ico"
MFE_CONFIG["SUPPORT_EMAIL"] = "soporte@ficct.uagrm.edu.bo"
MFE_CONFIG["TERMS_OF_SERVICE_URL"] = "http://{{ LMS_HOST }}/tos"
MFE_CONFIG["PRIVACY_POLICY_URL"] = "http://{{ LMS_HOST }}/privacy"
MFE_CONFIG["ENABLE_ACCESSIBILITY_PAGE"] = False
MFE_CONFIG["DISCOVERY_API_BASE_URL"] = "http://discovery.{{ LMS_HOST }}"
"""
    ),
    # Configuración del XBlock de AI Evaluation (Judge0)
    (
        "openedx-lms-common-settings",
        """
XBLOCK_SETTINGS = {
    "ai_eval": {
        "JUDGE0_API_URL": "https://judge0-ce.p.rapidapi.com",
        "JUDGE0_API_KEY": "{{ FICCT_JUDGE0_API_KEY }}",
        "JUDGE0_API_HOST": "judge0-ce.p.rapidapi.com",
        "GPT4O_API_KEY": "{{ FICCT_OPENROUTER_API_KEY }}",
    }
}
"""
    ),
])
```

### `landing_page.py`

Sirve el sitio estático de la landing (build Vite/React del directorio `landing-page/` del monorepo, desplegado a mano en `FICCT_LANDING_DEPLOY_PATH` del servidor) en su propio contenedor Caddy, montado en `www.{{ LMS_HOST }}`. Además, redirige la raíz del LMS a esa landing para visitantes anónimos — sin esto, Open edX redirige la raíz al catalog MFE en cuanto `ENABLE_CATALOG_MICROFRONTEND=True` (`catalog_mfe.py`), y ese redirect nativo (`lms/djangoapps/branding/views.py:index`) ocurre ANTES de que Open edX evalúe cualquier opción de "marketing site", así que no se puede resolver por settings de Django mientras el catalog MFE siga activo.

```python
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_LANDING_HOST", "www.{{ LMS_HOST }}"),
    ("FICCT_LANDING_DEPLOY_PATH", "/root/landing-deploy"),
])

hooks.Filters.ENV_PATCHES.add_items([
    # Servidor estático liviano para el dist/ de la landing page (Vite/React SPA).
    (
        "local-docker-compose-services",
        """
landing:
    image: docker.io/caddy:2.7.4
    restart: unless-stopped
    volumes:
        - {{ FICCT_LANDING_DEPLOY_PATH }}:/srv/landing:ro
    command: ['sh', '-c', 'printf "%s\\n" ":80 {" "    root * /srv/landing" "    encode gzip" "    try_files {path} /index.html" "    file_server" "}" > /etc/caddy/Caddyfile && exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile']
"""
    ),
    # Vhost en el Caddy frontal de Tutor para el subdominio de la landing.
    (
        "caddyfile",
        """
{{ FICCT_LANDING_HOST }}{$default_site_port} {
    import proxy "landing:80"
}
"""
    ),
    # Redirige la raíz del LMS a la landing para quien no tiene sesión iniciada.
    # `redir` se ejecuta antes que `handle`/`reverse_proxy` en Caddy por
    # defecto, así que gana con seguridad sin importar el orden textual.
    (
        "caddyfile-lms",
        """
@landing_anon_root {
    path /
    not header_regexp Cookie edxloggedin=true
}
redir @landing_anon_root {% if ENABLE_HTTPS %}https{% else %}http{% endif %}://{{ FICCT_LANDING_HOST }}/
"""
    ),
])
```

⚠️ **La landing no es solo `index.html` + `assets/`** — es un mini-sitio con varias páginas propias (`malla_curricular.html`, `plan_informatica.js`, `noticias.json`, etc.), con rutas relativas al dominio actual. Por eso el redirect de la raíz apunta a `www.` en vez de servir la landing "transparente" en el mismo dominio: hacerlo transparente exigiría listar cada ruta propia de la landing en el Caddyfile, y esa lista quedaría desactualizada cada vez que la landing agregue una página nueva.

⚠️ **`edxloggedin`** es la cookie que Open edX expone específicamente para que sitios de marketing externos sepan si el visitante está logueado (`settings.EDXMKTG_LOGGED_IN_COOKIE_NAME`, valor `"true"` cuando hay sesión). Se usa aquí en vez de la cookie de sesión real porque su dominio (`SHARED_COOKIE_DOMAIN`) es legible desde Caddy sin tocar Django.

### `extra_domains.py`

Agrega vhosts al Caddyfile global (patch `caddyfile`) para subdominios que no pasan por el LMS ni por un MFE, y que **no** genera ya otro plugin o el propio Tutor. Hoy solo agrega `superset`.

```python
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
```

⚠️ El bloque de `superset` es un placeholder: cuando se instale Superset de verdad, hay que reemplazar el `respond` por un `reverse_proxy` al contenedor correspondiente.

⚠️ **No agregar aquí un vhost `meilisearch.<LMS_HOST>`** — ver "Gotchas de Caddy" más arriba. Este plugin tumbó el sitio completo una vez por esto (ambos vhosts coexistieron sin error en el repo, pero Caddy se negó a arrancar la primera vez que se reinició tras el `tutor config save` que incluía el duplicado).

### `notifications_ficct.py`

Activa la campana de notificaciones (`@edx/frontend-plugin-notifications`, ya embebida por defecto en `@edx/frontend-component-header` ≥ 8.2.1) en los headers de `learning`, `learner-dashboard`, `authoring` y `catalog`. El frontend no necesita ningún flag de `MFE_CONFIG` — solo lee la respuesta de `GET /api/notifications/count/`, que depende 100% del waffle flag de Django `notifications.enable_notifications` (`CourseWaffleFlag`, default `False`).

Se activa vía `CLI_DO_INIT_TASKS` (mismo patrón que usa el plugin oficial `tutor-contrib-forum` para su propio waffle flag) en vez de Django Admin manual, para que quede versionado y se re-aplique solo en cada `tutor local do init`.

```python
from tutor import hooks

hooks.Filters.CLI_DO_INIT_TASKS.add_item(
    (
        "lms",
        """
(./manage.py lms waffle_flag --list | grep notifications.enable_notifications) || ./manage.py lms waffle_flag --create --everyone notifications.enable_notifications
"""
    )
)
```

⚠️ **`--limit` filtra por el contexto del plugin, no por el nombre de la tupla.** Para volver a correr esta tarea manualmente hay que usar el nombre del plugin, no `lms`:
```bash
tutor local do init --limit notifications_ficct
```

⚠️ La campana solo se muestra a un usuario autenticado si tiene **al menos una inscripción activa a un curso** (`get_show_notifications_tray()` en `notifications/utils.py` recorre los `CourseEnrollment` activos del usuario) — comportamiento nativo de Open edX, no configurable vía Tutor.

**Push notifications:** el flag hermano `notifications.enable_push_notifications` es solo para la app móvil nativa (FCM/APNs vía `django-push-notifications`); no aplica a MFEs web y no tiene efecto en este monorepo (no hay app móvil FICCT).

### `ficct_dashboard_api.py`

Instala el paquete `apps-custom/ficct-dashboard-api` en la imagen `openedx` vía el patch `openedx-dockerfile-post-python-requirements`. El paquete es una **plugin app de Open edX** (entry point `lms.djangoapp`): se auto-registra en `INSTALLED_APPS` y monta sus URLs bajo `/api/ficct/` sin tocar `lms/urls.py` del core. Mismo patrón que usa `edx-completion`.

```python
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("FICCT_DASHBOARD_API_REF", "main"),
])

hooks.Filters.ENV_PATCHES.add_items([
    (
        "openedx-dockerfile-post-python-requirements",
        """
RUN $PIP_COMMAND install 'git+https://github.com/LeonelBM123/openedx-ficct.git@{{ FICCT_DASHBOARD_API_REF }}#subdirectory=apps-custom/ficct-dashboard-api'
"""
    ),
])
```

⚠️ **El pip install es desde el repo remoto, no desde el disco.** Hay que hacer `git push` ANTES de rebuildear, y como el ref forma parte del comando, cambiarlo es lo que invalida la capa de Docker:

```bash
tutor config save --set FICCT_DASHBOARD_API_REF=<commit-sha>   # fuerza reinstalación del paquete
tutor images build openedx                                     # ~20 min
tutor local stop && tutor local start -d
```

---

## APIs propias de FICCT (`apps-custom/ficct-dashboard-api`)

| Endpoint | Servicio | Auth | Devuelve |
|----------|----------|------|----------|
| `GET /api/ficct/popular-courses/?limit=8` | LMS | Pública | Cursos visibles ordenados por inscritos activos (desc) |
| `POST /api/ficct/request-course-creator/` | **Studio (CMS)** | JWT | `{"course_creator_status": "pending"}` |

El paquete declara los dos entry points (`lms.djangoapp` y `cms.djangoapp`) con un módulo de URLs por servicio (`urls.py` y `cms_urls.py`), porque las vistas del LMS importan `CourseEnrollment`/`CourseOverview` y las del CMS importan `course_creators`, que **solo está instalado en Studio**.

⚠️ **Por qué existe `request-course-creator`:** la vista nativa `/request_course_creator` del CMS es una vista Django legacy (`@require_POST @login_required`). Al no ser DRF no acepta el JWT y depende de la cookie de sesión de `studio.<host>`, que un alumno que nunca entró a Studio no tiene: responde 302 al flujo SSO y el XHR del MFE muere con error de CORS. El endpoint propio hace lo mismo como `APIView`, de modo que las clases de autenticación por defecto del CMS (JWT + sesión) resuelven la llamada entre dominios. El GET de estado sigue usando `/api/contentstore/v1/home`, que sí es DRF y funciona.


Cada curso trae `course_id`, `title`, `org`, `number`, `short_description`, `image_url`, `about_url`, `enrollment_count`, `start`. Las URLs son **relativas al LMS** (igual que `learner_home/init`), el MFE las resuelve con `baseAppUrl()`.

- El conteo sale de `CourseEnrollment.objects.filter(is_active=True)` agrupado por curso — el mismo dato que usa el Instructor Dashboard, que Open edX no expone por REST en ningún lado.
- Se excluyen cursos con `catalog_visibility='none'`, `invitation_only`, `visible_to_staff_only` y cursos ya terminados. Los cursos con 0 inscritos van al final en vez de omitirse.
- La respuesta se cachea 10 min (`django.core.cache`). No depende del usuario: el filtrado de "cursos en los que ya estoy inscrito" lo hace el MFE.

---

## Progreso del alumno en el learner dashboard

`/api/learner_home/init` **no trae ningún porcentaje de avance** (solo `gradeData.isPassing` y `courseRun.progressUrl`, que es un link). La barra de progreso de cada tarjeta consume `/api/course_home/progress/{course_id}/` — el BFF del MFE learning — y usa `completion_summary`:

```
porcentaje = complete_count / (complete_count + incomplete_count)
```

Es una petición por tarjeta visible (la lista está paginada), con `staleTime` de 5 min. No se renderiza cuando el usuario está en modo "Ver como" (el endpoint devolvería el progreso del staff, no el del alumno observado), ni para entitlements sin sesión asignada.

⚠️ El plugin `completion_aggregator` de OpenCraft (el que expone `/api/completion/v1/course/.../` con el % ya agregado) **no está instalado** en esta plataforma. Si algún día se instala, conviene migrar a él: es 1 request para todos los cursos en vez de N.

---

## Sistema de Logos e Imágenes

### Dos mundos separados

| Contexto | Archivo | Dónde va | Plugin responsable |
|----------|---------|----------|--------------------|
| MFEs React | `logo.png` | `themes/ficct/lms/static/images/` | `ficct_config.py` via MFE_CONFIG |
| MFEs React | `logo-white.png` | `themes/ficct/lms/static/images/` | `ficct_config.py` via MFE_CONFIG |
| MFEs React | `favicon.ico` | `themes/ficct/lms/static/images/` | `ficct_config.py` via MFE_CONFIG |
| Páginas legacy | `logo.png` | `themes/ficct/lms/static/images/` | `ficct_theme.py` via LOGO_URL |
| Páginas legacy | `favicon.ico` | `themes/ficct/lms/static/images/` | `ficct_theme.py` via FAVICON_PATH |

### Flujo completo de imágenes

```
themes/ficct/lms/static/images/ (monorepo)
        ↓ Copy-Item (Windows) / cp -r (Linux)
env/build/openedx/themes/ficct/
        ↓ tutor images build openedx (~20 min)
/openedx/staticfiles/ficct/images/ (dentro de la imagen Docker)
        ↓ tutor local start
http://LMS_HOST/static/ficct/images/logo.png
        ↓ ficct_theme.py + ficct_config.py
Logo visible en MFEs y páginas legacy
```

### Comando de sincronización al build de Tutor

**Windows (PC):**
```powershell
Copy-Item -Recurse "C:\Users\PC\openedx-ficct\themes\ficct\*" `
  "C:\Users\PC\AppData\Local\tutor\tutor\env\build\openedx\themes\ficct\"
```

**Linux (servidor):**
```bash
cp -r /root/openedx-ficct/themes/ficct/. \
  /root/.local/share/tutor/env/build/openedx/themes/ficct/
```

### ⚠️ Errores críticos a evitar

- La carpeta `lms/` dentro del tema es **OBLIGATORIA** — sin ella Open edX no reconoce el tema
- El `Copy-Item` debe usar `\*` (Windows) o `/.` (Linux) para copiar el CONTENIDO, no la carpeta — evita duplicación `ficct/ficct/`
- **NUNCA** usar `tutor local run lms ./manage.py lms collectstatic` para actualizar estáticos — el collectstatic debe correr durante el build de la imagen
- El tema debe estar registrado en `/admin/theming/sitetheme/` para que Open edX lo reconozca

---

## Variables de Entorno Sensibles

Las API keys se setean en el servidor directamente, nunca en el código:

```bash
tutor config save \
  --set FICCT_JUDGE0_API_KEY=tu_key_aqui \
  --set FICCT_OPENROUTER_API_KEY=tu_key_aqui \
  --set AVATAR_TTS_SECRET=$(openssl rand -hex 32)
```

`AVATAR_TTS_SECRET` no es una key de un servicio externo: es un secreto compartido que
generamos nosotros, usado para firmar los tokens que autentican al contenedor de voz del
avatar (ver `avatar_tts.py`). Debe tener el mismo valor en el LMS y en el contenedor
`avatar-tts` — Tutor lo propaga solo, pero si se rota hay que regenerarlo con el mismo
comando y reiniciar ambos.

Quedan guardadas en `~/.local/share/tutor/config.yml` — fuera del repo Git.

---

## XBlock de AI Evaluation (Judge0)

Instalado en Open edX para ejercicios de código con feedback de IA.

```bash
# Instalación (ya realizada)
tutor config save --append OPENEDX_EXTRA_PIP_REQUIREMENTS="git+https://github.com/open-craft/xblock-ai-evaluation"
tutor images build openedx
```

**Habilitar en Studio:**
```
Settings → Advanced Settings → Advanced Module List
→ agregar: ["coding_ai_eval", "shortanswer_ai_eval"]
```

**API utilizada:** RapidAPI Judge0 CE (tier gratuito — 100 submissions/día)
**LLM:** OpenRouter via GPT4O_API_KEY (compatible con formato OpenAI)

---

## Flujos de Trabajo

### Cambios en los MFEs (avatar, código React)

Los MFEs se construyen automáticamente via **GitHub Actions** en el repo `LeonelBM123/openedx-ficct`. El workflow `.github/workflows/build-mfe.yml` se activa en cada push a `main` que toque `mfes/**` y construye **una sola imagen** con los 5 MFEs del monorepo (learning, authn, authoring, catalog, learner-dashboard) pasados como `build-contexts`.

⚠️ El workflow **solo construye la imagen `mfe`**. Los cambios de backend (`apps-custom/`, XBlocks, temas) viven en la imagen `openedx` y requieren `tutor images build openedx` en el servidor.

```bash
# 1. Editar código en mfes/frontend-app-learning/src/
# 2. Commit y push (dispara GitHub Actions automáticamente)
git add mfes/frontend-app-learning/... && git commit -m "feat: ..." && git push

# 3. Esperar ~7 min a que termine el build en GitHub Actions
#    https://github.com/LeonelBM123/openedx-ficct/actions

# 4. Aplicar la nueva imagen en el servidor
docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
docker tag ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
tutor local restart
```

**Verificar que el código llegó:**
```bash
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ 2>/dev/null | head -3"
```

**Notas del pipeline:**
- El workflow aplica `npm install --legacy-peer-deps` a todos los MFEs (en vez de `npm ci`) para evitar conflictos de peer deps con Three.js/Azure SDK
- Los 5 MFEs del monorepo se pasan como `build-contexts` al build de Docker, sobreescribiendo el git clone de upstream con el código local
- Los plugins de slot (AvatarTour, etc.) se registran en `docker/mfe/env.config.jsx` — UN solo archivo compartido con bloques `if (process.env.APP_ID == 'learning')` por MFE. No se usa un env.config.jsx por MFE
- Los assets 3D (GLB/FBX) deben estar en `mfes/frontend-app-learning/public/` y se copian al `dist/` vía el `CopyPlugin` en `webpack.prod.config.js`
- Las rutas de assets usan `process.env.PUBLIC_PATH` (= `/learning/` en prod) para que Caddy las resuelva correctamente
- El repo es público → GitHub Actions gratuito e ilimitado

### Cambios en estilos/colores (brand-ficct)

```bash
# 1. Editar _overrides.scss en el monorepo
# 2. Commit y push
git add brand-ficct/ && git commit -m "feat: update styles" && git push
# 3. Rebuild MFE (requerido)
tutor images build mfe
tutor local restart
```

### Cambios en logos/imágenes

```bash
# 1. Reemplazar archivos en themes/ficct/lms/static/images/
# 2. Sincronizar al build de Tutor (ver comando arriba)
# 3. Rebuild openedx
tutor images build openedx
tutor local stop && tutor local start -d
```

### Cambios en plugins

```bash
# 1. Editar plugin en tutor-plugins/
# 2. Reinstalar
tutor plugins install /root/openedx-ficct/tutor-plugins/nombre.py
tutor config save
tutor local restart lms
```

### Modo desarrollo (tutor dev)

`tutor dev` permite editar código y ver cambios en vivo sin hacer push ni rebuild. El MFE corre con webpack watch en el puerto asignado.

**MFEs montados actualmente:**
- `frontend-app-learning` → `http://apps.167.172.142.82.nip.io:2000/learning/`
- `frontend-app-authn` → montado, puerto 1999

**Ver logs del dev server de un MFE:**
```bash
tutor dev logs --tail=50 learning
tutor dev logs --tail=50 authn
```

**Montar un nuevo MFE para desarrollo (hacerlo una sola vez):**
```bash
# 1. Agregar el mount
tutor mounts add /root/openedx-ficct/mfes/frontend-app-<nombre>

# 2. Instalar dependencias en el contenedor (el mount tapa el node_modules de la imagen)
tutor dev run <nombre> npm install --legacy-peer-deps

# 3. Instalar brand-ficct (el @import ya está en el SCSS, solo falta el paquete)
tutor dev run <nombre> npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force

# 4. Iniciar el dev server
tutor dev start <nombre>
```

**Registrar plugins de slot en otro MFE (sin artilugios de git):**
Editar `docker/mfe/env.config.jsx` y agregar el bloque correspondiente:
```jsx
if (process.env.APP_ID == 'authn') {
  // importar y registrar plugins aquí
  addPlugins(config, 'nombre-del-slot', [...]);
}
```
Commit normal (sin `git add -f`). El archivo se aplica a todos los MFEs en el build.

**Flujo completo de desarrollo:**
```
tutor dev start          ← inicia todos los MFEs en modo watch
# editar archivos en mfes/frontend-app-<nombre>/src/
# webpack recarga automáticamente
# cuando estás conforme:
git push                 ← dispara GitHub Actions → imagen de producción
```

### Sincronizar PC → Servidor

```bash
# PC: push
git add . && git commit -m "..." && git push

# Servidor: pull e instalar
cd /root/openedx-ficct
git pull
tutor plugins install /root/openedx-ficct/tutor-plugins/brand_ficct.py
tutor plugins install /root/openedx-ficct/tutor-plugins/catalog_mfe.py
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_theme.py
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_config.py
tutor plugins install /root/openedx-ficct/tutor-plugins/notifications_ficct.py
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_dashboard_api.py
tutor plugins install /root/openedx-ficct/tutor-plugins/extra_domains.py
tutor config save
tutor local do init --limit notifications_ficct
```

---

## Comandos de Referencia

```bash
# Estado
tutor local status
tutor plugins list

# Logs
tutor local logs --tail=50 lms
tutor local logs --tail=50 mfe

# Plugins
tutor plugins install /root/openedx-ficct/tutor-plugins/nombre.py
tutor plugins enable nombre
tutor plugins disable nombre

# Configuración
tutor config save
tutor config printvalue LMS_HOST
tutor config printvalue MFE_HOST
tutor config save --set FICCT_JUDGE0_API_KEY=valor

# Rebuild
tutor images build mfe        ← cambios en brand-ficct (SCSS, SVGs)
tutor images build openedx    ← cambios en themes/ (logos PNG)

# Restart
tutor local restart lms
tutor local stop && tutor local start -d

# Verificar logos
curl -I http://167.172.142.82.nip.io/static/ficct/images/logo.png

# Verificar tema en DB
docker exec tutor_local-lms-1 python manage.py lms shell \
  -c "from openedx.core.djangoapps.theming.helpers import get_themes; print(get_themes())"

# Verificar MFE_CONFIG
grep -r "LOGO_URL" /root/.local/share/tutor/env/apps/openedx/settings/lms/production.py
```

---

## Rutas Importantes

```bash
# Servidor
~/.local/share/tutor/config.yml                              ← config de Tutor (con API keys)
~/.local/share/tutor/env/                                    ← archivos generados por Tutor
~/.local/share/tutor-plugins/                                ← plugins instalados en Tutor
~/.local/share/tutor/env/plugins/mfe/build/mfe/Dockerfile   ← Dockerfile del MFE generado
~/.local/share/tutor/env/build/openedx/themes/ficct/        ← tema en el build de Tutor
/root/openedx-ficct/                                         ← monorepo

# PC Windows
C:\Users\PC\AppData\Local\tutor\tutor\config.yml
C:\Users\PC\AppData\Local\tutor\tutor\env\
C:\Users\PC\AppData\Local\tutor-plugins\tutor-plugins\
C:\Users\PC\AppData\Local\tutor\tutor\env\build\openedx\themes\ficct\
C:\Users\PC\openedx-ficct\
```

---

## Notas Importantes

- **NUNCA edites** los archivos en `~/.local/share/tutor/env/` — se sobreescriben con `tutor config save`
- **Los plugins son la fuente de verdad** — todo cambio va primero al monorepo
- **Rebuild de MFE** — solo cuando cambia brand-ficct (SCSS o SVGs)
- **Rebuild de openedx** — solo cuando cambian logos en themes/ficct/
- **Verawood (Tutor 22)** — salió en junio 2026, no actualizar hasta estabilización
- **`COMPOSE_MOUNTS` con 3 valores** — NO funciona en Tutor 21, no agregar a los plugins
- **Tema en DB** — debe estar registrado en `/admin/theming/sitetheme/` una sola vez
- **brand-ficct usa SCSS** — pendiente migrar a Design Tokens en futura release

