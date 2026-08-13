# MIGRACIÓN — Open edX FICCT (Tutor 21 / Ulmo)

> Informe de relevamiento del despliegue actual para replicarlo en un servidor nuevo desde cero.
> Generado el **2026-08-12** a partir del estado real del servidor origen (`167.172.142.82`).
>
> **Este archivo NO contiene valores de secretos.** Solo nombres de variables y de dónde se leen.
> Los ítems que no se pueden determinar desde el código están marcados como
> **`PENDIENTE — verificar en servidor origen`**.

---

## 0. Resumen ejecutivo

| Ítem | Valor |
|------|-------|
| Servidor origen | DigitalOcean, Ubuntu 24.04, IP `167.172.142.82` |
| Plataforma | Open edX **Ulmo** (`release/ulmo.3`, `EDX_PLATFORM_REVISION: ulmo`) |
| Gestor | **Tutor 21.0.7** (pip, Python 3.12.3, `/usr/local/lib/python3.12/dist-packages`) |
| Modo de despliegue | `tutor local` (Docker Compose), **no** Kubernetes |
| Docker | 29.1.3 / Docker Compose 2.40.3 |
| TUTOR_ROOT | `/root/.local/share/tutor` |
| Monorepo | `/root/openedx-ficct` → `github.com/LeonelBM123/openedx-ficct` (rama `main`) |
| Datos persistentes | `/root/.local/share/tutor/data` (bind mounts) — **~1.3 GB** |
| Disco usado | 97 GB de 154 GB (63 %) — mayormente imágenes Docker |
| HTTPS | **Deshabilitado** (`ENABLE_HTTPS: false`), todo por HTTP puerto 80 |
| Dominios | `*.167.172.142.82.nip.io` (nip.io = DNS wildcard sobre la IP) |

> ⚠️ **Punto crítico de la migración:** todos los hosts están atados a la IP vía `nip.io`.
> Al cambiar de servidor cambia la IP → cambian **todos** los dominios. Ver §8 y §9.

---

## 0.1 Estado de avance de la migración

> Actualizado el **2026-08-12**. Cada ✅ está verificado contra el estado real, no asumido.

| Fase | Estado |
|---|---|
| **Fase 0** — Rescatar lo no versionado | 🟡 Casi completa — faltan 2 rotaciones de credenciales |
| **Fase 1** — Qué se lleva del origen | ✅ **Resuelta por decisión**: no se migran datos, solo configuración |
| **Fase 2** — Preparar el servidor nuevo | 🟡 Hardware verificado; falta definir red y instalar Tutor |
| **Fases 3-8** | ⬜ Sin empezar (la Fase 5 ya no aplica) |

> **Decisión de alcance (2026-08-12): el servidor nuevo arranca con base de datos limpia.**
> El origen es una instancia de pruebas (7 usuarios reales, 0 certificados, 1 entrega) y el
> contenido SCORM/H5P subido es material de prueba. No hay dumps, ni `tar` de 1.3 GB, ni
> almacenamiento intermedio. Se transfieren **3 API keys**; el resto de la configuración ya
> vive en el monorepo. Efecto lateral útil: desaparecen los problemas de estado atado al host
> viejo (`django_site`, redirect URIs de OAuth2, `SiteTheme`) y de contraseñas de MySQL que
> debían coincidir con el dump.

### Hecho

| Qué | Commit / evidencia |
|---|---|
| `iaassistant.py` versionado (solo existía en `~/.local/share/tutor-plugins/`) | `6130705` |
| `landing_page.py` + 9 líneas de `ficct_config.py` commiteadas | `819d0de` |
| Landing incorporada al monorepo en `landing-page/` (era repo Git anidado con 137 MB) | `af41d47`, y sus 4 componentes pendientes en `landingpage-main@5187c84` |
| Build de la landing documentado y **verificado** (no hay Node en el host, se compila en contenedor) | `0cb34e5`, §7.5 |
| `.gitignore` en la raíz del monorepo (no existía) | `af41d47` |
| Servicio de voz versionado — vivía solo en la PC | `3d929e7`, §7.6 |
| **Keys sacadas del navegador**: el avatar consultaba OpenRouter desde el cliente con la key publicada en `/api/mfe_config/v1` | `8552a14`, `40ba3fc`, §4.4 |
| `e9a6be5` confirmado en el remoto (lo referencia `FICCT_DASHBOARD_API_REF`) | `git ls-remote` |
| Repos de terceros sin pin siguen accesibles | `git ls-remote` sobre los 4 |

Verificado tras el despliegue del endpoint propio: `/api/mfe_config/v1` ya **no** expone
ninguna key, `POST /api/ficct/avatar/ask/` responde **401** a anónimos y **200** a un usuario
autenticado, y el bundle del MFE **no contiene** ninguna referencia a `openrouter.ai`.

### Pendiente y bloqueante

| Qué | Por qué importa |
|---|---|
| 🔴 **Rotar el GitHub PAT** | Verificado el 2026-08-12: **el token embebido en el remote sigue autenticando**, o sea que NO fue rotado. Está en `.git/config` y en `/root/.git-credentials`, y viaja con cualquier copia o snapshot del disco. Rotarlo **antes** de la Fase 1 |
| 🔴 **Rotar `OPENROUTER_API_KEY`** | Estuvo publicada en un endpoint público; darla por quemada. Ahora sí tiene sentido rotarla: ya no se republica. Aprovechar para ponerle límite de gasto, que hoy no tiene (`limit: None`) |
| 🟡 Definir el direccionamiento del servidor nuevo | `10.253.10.77` es una IP privada — condiciona hosts, DNS y HTTPS. Ver Fase 2 |
| 🟡 Confirmar que `modal_api_v3.py` versionado es el desplegado | Ver §7.6 |
| ⚪ Descartar los `package*.json` de los MFEs | Artefactos de `tutor dev`, ver §2.3: `git checkout -- 'mfes/*/package*.json'` |

### Fuera del plan original

El relevamiento destapó que **`OPENROUTER_API_KEY` y `AZURE_SPEECH_KEY` se servían en claro**
a cualquiera en internet vía `GET /api/mfe_config/v1`, sin autenticación y por HTTP. Se
corrigió antes de migrar, para no arrastrar el problema al servidor nuevo: el LLM se consulta
ahora desde el LMS (§4.4) y las variables de Azure se eliminaron porque la voz la genera el
servicio propio en Modal (§7.6).

---

## 1. Versión y configuración base

### 1.1 Versiones

| Componente | Versión | Cómo se verificó |
|------------|---------|------------------|
| Tutor | `21.0.7` | `tutor --version` / `pip list` |
| Open edX | **Ulmo (v21)** — `OPENEDX_COMMON_VERSION = release/ulmo.3` | `tutor config printvalue OPENEDX_COMMON_VERSION` |
| edx-platform revision | `ulmo` | `env/build/openedx/revisions.yml` |
| Python (host) | 3.12.3 | `python3 --version` |
| Imagen openedx | `docker.io/overhangio/openedx:21.0.7` | `docker images` |
| Imagen MFE | `docker.io/overhangio/openedx-mfe:21.0.0` (re-tag de GHCR, ver §4) | `docker images` |

### 1.2 Imágenes de servicios (fijadas por Tutor 21.0.7)

| Servicio | Imagen |
|----------|--------|
| MySQL | `docker.io/mysql:8.4.0` |
| MongoDB | `docker.io/mongo:7.0.28` |
| Meilisearch | `docker.io/getmeili/meilisearch:v1.8.4` |
| Redis | `docker.io/redis:7.4.5` |
| SMTP | `docker.io/devture/exim-relay:4.96-r1-0` |
| Caddy (proxy + landing + mfe) | `docker.io/caddy:2.7.4` |
| Permissions | `docker.io/overhangio/openedx-permissions:21.0.7` |

> **No hay Elasticsearch/OpenSearch.** Tutor 21 usa **Meilisearch** para la búsqueda.

### 1.3 Contenido de `config.yml`

Archivo: `/root/.local/share/tutor/config.yml` (**fuera del repositorio Git**).

#### Valores NO sensibles (se pueden replicar tal cual, ajustando hosts)

```yaml
AVATAR_ENABLED: true
AVATAR_TTS_API_URL: https://leonel-barriosmay--avatar-tts-api-v3-fastapi-app.modal.run/synthesize
CMS_HOST: studio.167.172.142.82.nip.io
CONTACT_EMAIL: leonel.barriosmay@gmail.com
ENABLE_HTTPS: false
FICCT_DASHBOARD_API_REF: e9a6be5         # commit sha del monorepo usado en el pip install
IAASSISTANT_OPENROUTER_BASE_URL: https://openrouter.ai/api/v1
IAASSISTANT_OPENROUTER_FALLBACK_MODELS: ''
IAASSISTANT_OPENROUTER_MODEL: openai/gpt-4o-mini
IAASSISTANT_OPENROUTER_TIMEOUT: 30
LANGUAGE_CODE: es-419
LMS_HOST: 167.172.142.82.nip.io
PLATFORM_NAME: FICCT - Virtual
MOUNTS:
  - /root/openedx-ficct/mfes/frontend-app-learning
  - /root/openedx-ficct/mfes/frontend-app-authn
  - /root/openedx-ficct/mfes/frontend-app-authoring
OPENEDX_EXTRA_PIP_REQUIREMENTS:          # ver §3
  - h5p-xblock
  - git+https://github.com/open-craft/xblock-ai-evaluation
  - git+https://github.com/Mau8877/ia-assistant-plugin.git@main#egg=ia-assistant-plugin
PLUGINS:                                 # ver §2
  - avatar_asistente
  - brand_ficct
  - catalog_mfe
  - ficct_config
  - ficct_dashboard_api
  - ficct_theme
  - iaassistant
  - landing_page
  - mfe
  - notifications_ficct
PLUGIN_INDEXES:
  - https://overhang.io/tutor/main
  - https://overhang.io/tutor/contrib
```

Valores derivados (calculados por Tutor, no están en `config.yml` pero conviene conocerlos):

| Clave | Valor |
|-------|-------|
| `MFE_HOST` | `apps.167.172.142.82.nip.io` |
| `FICCT_LANDING_HOST` | `www.167.172.142.82.nip.io` (default `www.{{ LMS_HOST }}`) |
| `FICCT_LANDING_DEPLOY_PATH` | `/root/landing-deploy` |
| `OPENEDX_MYSQL_DATABASE` / `USERNAME` | `openedx` / `openedx` |
| `MONGODB_DATABASE` / `HOST` | `openedx` / `mongodb` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp` / `8025` (relay interno de Tutor) |
| `ENABLE_WEB_PROXY` / `CADDY_HTTP_PORT` | `true` / `80` |
| `RUN_MYSQL` / `RUN_MONGODB` / `RUN_REDIS` / `RUN_MEILISEARCH` / `RUN_SMTP` | todos `true` (servicios **en el mismo host**, no gestionados) |
| `DOCKER_REGISTRY` | `docker.io/` |
| `DOCKER_IMAGE_MFE` | *(sin override — usa el default `docker.io/overhangio/openedx-mfe:21.0.0`)* |

#### Claves de `config.yml` que son SECRETOS — solo se listan los nombres

Estas **no deben copiarse a ningún archivo versionado**. Hay que transferirlas del servidor
viejo al nuevo por canal seguro (`scp` del `config.yml`, gestor de contraseñas, etc.).

| Variable | Qué es | Consecuencia de regenerarla en vez de copiarla |
|----------|--------|-----------------------------------------------|
| `OPENEDX_SECRET_KEY` | Django `SECRET_KEY` del LMS/CMS | Invalida sesiones y tokens firmados |
| `JWT_RSA_PRIVATE_KEY` | Clave RSA de firma de JWT | Invalida todos los JWT emitidos |
| `MYSQL_ROOT_PASSWORD` | root de MySQL | **Debe coincidir con el dump/volumen restaurado** |
| `OPENEDX_MYSQL_PASSWORD` | usuario `openedx` de MySQL | **Debe coincidir con el dump/volumen restaurado** |
| `MEILISEARCH_MASTER_KEY` | master key de Meilisearch | Rompe el acceso al índice existente |
| `MEILISEARCH_API_KEY` | API key derivada usada por el LMS | Idem |
| `MEILISEARCH_API_KEY_UID` | UID de esa API key | Idem |
| `CMS_OAUTH2_SECRET` | secreto OAuth2 del CMS contra el LMS | Studio no autentica contra el LMS |
| `ID` | identificador único de la instancia Tutor | Cosmético, pero conviene conservarlo |
| `IAASSISTANT_OPENROUTER_API_KEY` | API key OpenRouter para el XBlock `ia-assistant-plugin` | Asistente IA sin LLM |
| `OPENROUTER_API_KEY` | API key OpenRouter del avatar. Solo en settings de Django, la usa `/api/ficct/avatar/ask/` | Chat del avatar sin LLM |
| `FICCT_JUDGE0_API_KEY` | API key RapidAPI Judge0 (XBlock `ai_eval`) | Ejercicios de código sin ejecución |

> ✅ **Corregido.** `OPENROUTER_API_KEY` y `AZURE_SPEECH_KEY` se publicaban en `MFE_CONFIG`,
> que el LMS sirve **sin autenticación** en `GET /api/mfe_config/v1`: eran legibles por
> cualquiera. Ahora el MFE consulta el LLM vía `POST /api/ficct/avatar/ask/` y la key no sale
> del servidor; las variables de Azure se eliminaron (la voz la genera el servicio propio en
> Modal). Ver §4.4. **Ningún secreto puede volver al patch `mfe-lms-*-settings`.**

#### Variable declarada pero NO seteada

| Variable | Declarada en | Estado |
|----------|--------------|--------|
| `FICCT_OPENROUTER_API_KEY` | `ficct_config.py` (`CONFIG_DEFAULTS`) | **Vacía** → `XBLOCK_SETTINGS.ai_eval.GPT4O_API_KEY` queda en `""`. El XBlock de AI Evaluation no tiene LLM configurado. **PENDIENTE — decidir si se setea en el server nuevo.** |

---

## 2. Plugins de Tutor

### 2.1 Plugins instalados vía pip (paquetes PyPI)

`pip install <paquete>` — solo `tutor-mfe` está **habilitado**; el resto está instalado pero **deshabilitado**.

| Paquete PyPI | Versión | Plugin | Estado |
|--------------|---------|--------|--------|
| `tutor-mfe` | 21.0.0 | `mfe` | ✅ **habilitado** |
| `tutor-android` | 21.0.0 | `android` | instalado, deshabilitado |
| `tutor-cairn` | 21.0.0 | `cairn` | instalado, deshabilitado |
| `tutor-credentials` | 21.0.3 | `credentials` | instalado, deshabilitado |
| `tutor-deck` | 21.0.0 | `deck` | instalado, deshabilitado |
| `tutor-discovery` | 21.0.1 | `discovery` | instalado, deshabilitado |
| `tutor-forum` | 21.0.0 | `forum` | instalado, deshabilitado |
| `tutor-indigo` | 21.1.3 | `indigo` | instalado, deshabilitado (se usa tema propio `ficct`) |
| `tutor-jupyter` | 21.0.0 | `jupyter` | instalado, deshabilitado |
| `tutor-livedeps` | 21.0.0 | `livedeps` | instalado, deshabilitado |
| `tutor-minio` | 21.0.0 | `minio` | instalado, deshabilitado |
| `tutor-notes` | 21.0.0 | `notes` | instalado, deshabilitado |
| `tutor-xqueue` | 21.0.0 | `xqueue` | instalado, deshabilitado |

> Para replicar el entorno **basta con `tutor-mfe==21.0.0`**. Los demás son opcionales
> (quedaron de pruebas). Instalarlos no cambia nada mientras estén deshabilitados.

### 2.2 Plugins custom (archivos `.py` locales)

Ubicación **fuente de verdad**: `/root/openedx-ficct/tutor-plugins/`
Ubicación **instalada**: `/root/.local/share/tutor-plugins/` (copiados con `tutor plugins install <ruta>`)

| Plugin | Archivo en el repo | Patches / hooks que registra |
|--------|--------------------|------------------------------|
| `brand_ficct` | `tutor-plugins/brand_ficct.py` | `ENV_PATCHES`: `mfe-dockerfile-post-npm-install` (instala `@edx/brand` desde `github.com/LeonelBM123/brand-ficct`), `mfe-dockerfile-pre-npm-build` (inyecta `@import '~@edx/brand/paragon/overrides'` en el SCSS raíz de cada MFE) |
| `catalog_mfe` | `tutor-plugins/catalog_mfe.py` | `tutormfe.hooks.MFE_APPS` (registra el MFE `catalog`, repo `openedx/frontend-app-catalog`, puerto 1998, versión `master`); `ENV_PATCHES`: `openedx-lms-common-settings` (`ENABLE_CATALOG_MICROFRONTEND = True`), `openedx-lms-production-settings` (`CATALOG_MICROFRONTEND_URL`), `openedx-lms-development-settings` (idem con puerto) |
| `ficct_theme` | `tutor-plugins/ficct_theme.py` | `ENV_PATCHES`: `openedx-lms-common-settings` → `ENABLE_COMPREHENSIVE_THEMING`, `COMPREHENSIVE_THEME_DIRS=["/openedx/themes"]`, `DEFAULT_SITE_THEME="ficct"`, `LOGO_URL`, `LOGO_WHITE_URL`, `FAVICON_PATH` |
| `ficct_config` | `tutor-plugins/ficct_config.py` | `CONFIG_DEFAULTS`: `FICCT_JUDGE0_API_KEY`, `FICCT_OPENROUTER_API_KEY`. `ENV_PATCHES`: `mfe-lms-production-settings` (logos, `SUPPORT_EMAIL`, TOS/privacy, `DISCOVERY_API_BASE_URL`, idioma, `LOGOUT_URL` → landing), `openedx-lms-common-settings` (`XBLOCK_SETTINGS.ai_eval` con Judge0 + `LOGIN_REDIRECT_WHITELIST.append(FICCT_LANDING_HOST)`) |
| `notifications_ficct` | `tutor-plugins/notifications_ficct.py` | `CLI_DO_INIT_TASKS` (`lms`): crea el waffle flag `notifications.enable_notifications` si no existe |
| `ficct_dashboard_api` | `tutor-plugins/ficct_dashboard_api.py` | `CONFIG_DEFAULTS`: `FICCT_DASHBOARD_API_REF` (default `main`). `ENV_PATCHES`: `openedx-dockerfile-post-python-requirements` → `pip install git+https://github.com/LeonelBM123/openedx-ficct.git@<REF>#subdirectory=apps-custom/ficct-dashboard-api` |
| `avatar_asistente` | `tutor-plugins/avatar_asistente.py` | `CONFIG_DEFAULTS`: `AVATAR_ENABLED`, `AVATAR_TTS_API_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `AVATAR_OPENROUTER_THROTTLE_RATE`. `ENV_PATCHES`: `mfe-lms-common-settings` → publica solo `AVATAR_ENABLED` y `AVATAR_TTS_API_URL` (no secretos); `openedx-lms-common-settings` → dict `FICCT_AVATAR` con la key de OpenRouter, que consume `/api/ficct/avatar/ask/` |
| `landing_page` | `tutor-plugins/landing_page.py` ⚠️ **untracked en Git** | `CONFIG_DEFAULTS`: `FICCT_LANDING_HOST`, `FICCT_LANDING_DEPLOY_PATH`. `ENV_PATCHES`: `local-docker-compose-services` (agrega el servicio `landing` con `caddy:2.7.4` sirviendo `/root/landing-deploy`), `caddyfile` (vhost `www.<LMS_HOST>` → `landing:80`) |
| `iaassistant` | ❌ **NO existe en el repo** — solo en `/root/.local/share/tutor-plugins/iaassistant.py` | `CONFIG_DEFAULTS`: `IAASSISTANT_OPENROUTER_API_KEY`, `_MODEL`, `_BASE_URL`, `_TIMEOUT`, `_FALLBACK_MODELS`. `ENV_PATCHES`: `openedx-common-settings` → define `OPENROUTER_API_KEY/MODEL/BASE_URL/TIMEOUT/FALLBACK_MODELS` en Django (LMS+CMS) para el XBlock `ia-assistant-plugin` |

### 2.3 ⚠️ Riesgos detectados de estado no versionado

Esto es lo más importante de todo el informe para no perder trabajo en la migración:

| Riesgo | Detalle | Estado / Acción |
|--------|---------|-----------------|
| `ficct_config.py` modificado sin commitear | +9 líneas locales (`LOGOUT_URL` hacia la landing + `LOGIN_REDIRECT_WHITELIST`) | ✅ **Commiteado** en la rama `chore/pendientes-migracion`. Falta mergear a `main` + push |
| `landing_page.py` sin commitear | `git status` lo reportaba como `??` | ✅ **Commiteado** en la misma rama. Falta mergear a `main` + push |
| `iaassistant.py` no está en el repo | Solo vive en `/root/.local/share/tutor-plugins/`. Un `git clone` en el server nuevo **no lo trae**. | ✅ **Copiado a `tutor-plugins/iaassistant.py` y commiteado**. Falta mergear a `main` + push |
| `landing-page/` sin commitear | Era un **repositorio Git anidado** (`landing-page/landingpage-main/.git`, remote propio) con 137 MB de `node_modules`, más 4 archivos modificados sin commitear en ESE repo | ✅ **Resuelto en dos pasos**: (1) los 4 componentes se commitearon y pushearon a `landingpage-main` (`5187c84`); (2) el fuente se incorporó al monorepo en `landing-page/` como directorio común y se eliminó el `.git` anidado. Ver §7.5 |
| `mfes/*/package.json` + `package-lock.json` modificados | **No son cambios deliberados: son artefactos del workflow de `tutor dev`.** El paso documentado en CLAUDE.md `tutor dev run <mfe> npm install '@edx/brand@git+…' --force` reescribe el `package.json` del directorio montado (`@edx/brand` → `github:LeonelBM123/brand-ficct`) y regenera el lock. El único cambio adicional es un reordenamiento de línea de `microsoft-cognitiveservices-speech-sdk` en `learning` (la dependencia **ya estaba** declarada) | ❌ **No commitear.** El Dockerfile instala `@edx/brand` en un paso aparte con `--force`, así que estos cambios no aportan nada al build de producción, y un lock de ~2900 líneas de diferencia puede alterar dependencias transitivas y romper el build de Actions. Descartar con `git checkout -- 'mfes/*/package*.json'` (reaparecerán la próxima vez que se use `tutor dev`) |
| Token de GitHub embebido en el remote | El `origin` del monorepo tiene un PAT `ghp_…` en la URL, y hay un `/root/.git-credentials` | ⚠️ **Pendiente — rotar el token** y usar SSH keys o `gh auth` en el server nuevo. No copiar `.git-credentials` |

### 2.4 Código de `iaassistant.py`

> Ya está versionado en `tutor-plugins/iaassistant.py`. Se deja transcripto acá porque el
> informe se generó cuando el archivo solo existía en `~/.local/share/tutor-plugins/`.

```python
from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("IAASSISTANT_OPENROUTER_API_KEY", ""),
    ("IAASSISTANT_OPENROUTER_MODEL", "openrouter/auto"),
    ("IAASSISTANT_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    ("IAASSISTANT_OPENROUTER_TIMEOUT", 30),
    ("IAASSISTANT_OPENROUTER_FALLBACK_MODELS", ""),
])

hooks.Filters.ENV_PATCHES.add_item((
    "openedx-common-settings",
    """
# IA Assistant XBlock - OpenRouter settings
OPENROUTER_API_KEY = "{{ IAASSISTANT_OPENROUTER_API_KEY }}"
OPENROUTER_MODEL = "{{ IAASSISTANT_OPENROUTER_MODEL }}"
OPENROUTER_BASE_URL = "{{ IAASSISTANT_OPENROUTER_BASE_URL }}"
OPENROUTER_TIMEOUT = {{ IAASSISTANT_OPENROUTER_TIMEOUT }}
OPENROUTER_FALLBACK_MODELS = "{{ IAASSISTANT_OPENROUTER_FALLBACK_MODELS }}"
"""
))
```

---

## 3. Paquetes Python extra en la imagen `openedx`

Verificado en el Dockerfile generado: `/root/.local/share/tutor/env/build/openedx/Dockerfile`.

### 3.1 Desde `OPENEDX_EXTRA_PIP_REQUIREMENTS` (config.yml)

| Paquete | Origen | Versión / ref | ¿Fork propio? |
|---------|--------|---------------|---------------|
| `h5p-xblock` | PyPI | **sin pin** (instala la última) | No |
| `xblock-ai-evaluation` | Git: `https://github.com/open-craft/xblock-ai-evaluation` | **sin pin** — rama default de OpenCraft | No (upstream OpenCraft) |
| `ia-assistant-plugin` | Git: `https://github.com/Mau8877/ia-assistant-plugin.git@main` | rama `main`, **sin pin de commit** | Sí — repo de terceros del equipo (`Mau8877`). **PENDIENTE — confirmar que el repo siga público y accesible** |

### 3.2 Desde el plugin `ficct_dashboard_api` (patch `openedx-dockerfile-post-python-requirements`)

| Paquete | Origen | Ref |
|---------|--------|-----|
| `ficct-dashboard-api` (v0.1.0) | Git: `https://github.com/LeonelBM123/openedx-ficct.git#subdirectory=apps-custom/ficct-dashboard-api` | `@e9a6be5` (valor actual de `FICCT_DASHBOARD_API_REF`) — **fork propio, es código del propio monorepo** |

> ⚠️ **El `pip install` es desde GitHub, no desde disco.** Cualquier cambio en
> `apps-custom/` requiere `git push` + `tutor config save --set FICCT_DASHBOARD_API_REF=<sha>`
> antes de `tutor images build openedx`.

Endpoints que aporta el paquete:

| Endpoint | Servicio | Auth |
|----------|----------|------|
| `GET /api/ficct/popular-courses/?limit=N` | LMS | pública |
| `POST /api/ficct/request-course-creator/` | CMS (Studio) | JWT |

Se registra como *plugin app* de Open edX vía entry points `lms.djangoapp` y `cms.djangoapp`
(no toca `INSTALLED_APPS` ni `urls.py` del core).

### 3.3 Instalados por Tutor core (no configurables, informativo)

`setuptools==69.1.1`, `pip==24.0`, `wheel==0.43.0`, `django-redis==5.4.0`, `uwsgi==2.0.24`,
`openedx-scorm-xblock>=19.0.0,<20.0.0`.

### 3.4 Habilitación manual en Studio (no automatizable por Tutor)

**PENDIENTE — verificar en servidor origen y replicar:** el XBlock de AI Evaluation requiere
agregar en *Studio → Settings → Advanced Settings → Advanced Module List*:
`["coding_ai_eval", "shortanswer_ai_eval"]` (más los módulos de `h5p` e `ia-assistant`
que estén en uso). Esto vive **en la base de datos de cada curso**, así que si se restaura
el dump de MySQL/MongoDB viene incluido.

---

## 4. MFEs (Micro Frontends)

### 4.1 Imagen única con 12 MFEs

Todos los MFEs se compilan en **una sola imagen** (`docker/mfe/Dockerfile`, multi-stage) que
sirve los `dist/` estáticos con Caddy. La imagen se construye en **GitHub Actions** y se publica
en **GHCR**, luego se re-etiqueta en el servidor con el nombre que espera Tutor:

```bash
docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
docker tag  ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
tutor local restart
```

> ⚠️ **No se usa `DOCKER_IMAGE_MFE`.** El truco es el `docker tag`. Si en el server nuevo se
> olvida el re-tag, Tutor bajará la imagen **oficial** de Docker Hub y se perderán el branding
> FICCT, el avatar y el MFE catalog. Alternativa más limpia para el server nuevo:
> `tutor config save --set DOCKER_IMAGE_MFE=ghcr.io/leonelbm123/openedx-mfe:21.0.0`.

### 4.2 Inventario de MFEs

Base upstream: `release/ulmo.3` de cada repo `openedx/frontend-app-*`.
Traducciones: `atlas pull` desde `openedx/openedx-translations@release/ulmo.3`.
Todos reciben `@edx/brand` desde `github.com/LeonelBM123/brand-ficct` (rama `master`) + `env.config.jsx` compartido.

| MFE | Puerto | Código fuente | Custom |
|-----|--------|---------------|--------|
| `learning` | 2000 | **`mfes/frontend-app-learning`** (build-context local) | ✅ Fork propio + módulo avatar 3D |
| `authn` | 1999 | **`mfes/frontend-app-authn`** (build-context local) | ✅ Fork propio |
| `authoring` | 2001 | **`mfes/frontend-app-authoring`** (build-context local) | ✅ Fork propio |
| `catalog` | 1998 | **`mfes/frontend-app-catalog`** (build-context local) | ✅ Fork propio + registrado a mano vía `catalog_mfe.py` (rama upstream `master`, no `ulmo.3`) |
| `learner-dashboard` | 1996 | **`mfes/frontend-app-learner-dashboard`** (build-context local) | ✅ Fork propio (barra de progreso, cursos populares) |
| `admin-console` | 2025 | upstream `release/ulmo.3` | solo brand |
| `account` | 1997 | upstream `release/ulmo.3` | solo brand |
| `communications` | 1984 | upstream `release/ulmo.3` | solo brand |
| `discussions` | 2002 | upstream `release/ulmo.3` | solo brand |
| `gradebook` | 1994 | upstream `release/ulmo.3` | solo brand |
| `ora-grading` | 1993 | upstream `release/ulmo.3` | solo brand |
| `profile` | 1995 | upstream `release/ulmo.3` | solo brand |

Los 5 MFEs custom **no son submódulos**: son directorios dentro del monorepo (`git clone` del
monorepo los trae). El único submódulo Git es `brand-ficct`
(`.gitmodules` → `https://github.com/LeonelBM123/brand-ficct.git`).

### 4.3 Dockerfile propio: `docker/mfe/Dockerfile`

Es una **copia adaptada** del Dockerfile que genera `tutor-mfe`
(`env/plugins/mfe/build/mfe/Dockerfile`), commiteada en el repo para que GitHub Actions pueda
buildear sin tener Tutor instalado. Diferencias respecto del generado:

- Usa `ARG BRAND_FICCT_REF=master` para invalidar caché cuando cambia el brand (el generado no).
- `npm install --legacy-peer-deps` en `learning` (conflictos de peer deps con Three.js / Azure Speech SDK).
- No lleva el `git config url.insteadOf` del plugin (innecesario en Actions).

> ⚠️ **Este Dockerfile se desincroniza si se actualiza `tutor-mfe`.** Si en el server nuevo
> se instala otra versión de `tutor-mfe`, hay que regenerar `docker/mfe/Dockerfile` a partir de
> `env/plugins/mfe/build/mfe/Dockerfile` y re-aplicar las 3 diferencias.

### 4.4 Variables de entorno de los MFEs

**Build-time (en el Dockerfile / Actions):**

| Variable | Valor |
|----------|-------|
| `APP_ID` | nombre del MFE (`learning`, `authn`, …) |
| `PUBLIC_PATH` | `/<app_id>/` |
| `MFE_CONFIG_API_URL` | `/api/mfe_config/v1` |
| `NODE_ENV` | `production` (etapas `*-prod`) |
| `NPM_REGISTRY` (ARG) | `https://registry.npmjs.org/` |
| `BRAND_FICCT_REF` (ARG) | sha resuelto de `brand-ficct@master` (cache-buster) |
| `ENABLE_NEW_RELIC` (ARG) | `false` |
| `CPPFLAGS` | `-DPNG_ARM_NEON_OPT=0` |
| `PACT_SKIP_BINARY_INSTALL` | `true` |

**Runtime (vía `MFE_CONFIG` → `GET /api/mfe_config/v1` → `getConfig()` en React):**

De `ficct_config.py` (`mfe-lms-production-settings`): `LOGO_URL`, `LOGO_WHITE_URL`,
`FAVICON_URL`, `SUPPORT_EMAIL`, `TERMS_OF_SERVICE_URL`, `PRIVACY_POLICY_URL`,
`ENABLE_ACCESSIBILITY_PAGE`, `DISCOVERY_API_BASE_URL`, `LANGUAGE_PREFERENCE_COOKIE_NAME`,
`DEFAULT_COURSE_LANGUAGE`, `SITE_LANGUAGE`, `LOGOUT_URL`.

De `avatar_asistente.py` (`mfe-lms-common-settings`): `AVATAR_ENABLED` y
`AVATAR_TTS_API_URL` (URL pública del servicio de voz en Modal). **Nada más: ningún
secreto.**

Consumidas en el código del avatar (`mfes/frontend-app-learning/src/asistente/`):
`getConfig().AVATAR_ENABLED` y `.AVATAR_TTS_API_URL`.

> El LLM ya no se consulta desde el navegador: `AvatarTour.jsx` hace
> `POST {LMS_BASE_URL}/api/ficct/avatar/ask/` con `getAuthenticatedHttpClient()`, y el LMS
> pone la key. Cambiar la key **no requiere rebuild del MFE**, solo `tutor config save` +
> `tutor local restart lms`.

### 4.5 GitHub Actions: `.github/workflows/build-mfe.yml`

| Aspecto | Detalle |
|---------|---------|
| Trigger | `push` a `main` que toque `mfes/**`, `docker/mfe/**`, `brand-ficct**`, el propio workflow; + `workflow_dispatch` |
| Registry | **GHCR** — `ghcr.io/leonelbm123/openedx-mfe` |
| Tags | `21.0.0` y `latest` |
| Auth | `secrets.GITHUB_TOKEN` automático (no hay secretos manuales que migrar) |
| Pasos | checkout → login GHCR → `sed` que reemplaza `npm clean-install` → `npm install --legacy-peer-deps` en **todos** los MFEs → resuelve sha de `brand-ficct` → `docker/build-push-action@v5` con `context: docker/mfe` |
| `build-contexts` | `learning-src`, `authn-src`, `authoring-src`, `catalog-src`, `learner-dashboard-src` → sobrescriben el `git clone` de upstream |
| Caché | `type=gha, mode=max` |
| Duración | ~7 min con caché, 15–20 min sin caché |

> El workflow **solo** construye la imagen `mfe`. Los cambios de backend (`apps-custom/`,
> XBlocks, tema `ficct`) requieren `tutor images build openedx` **en el servidor** (~20 min).

---

## 5. Variables de entorno — inventario completo

### 5.1 Configuración general de la plataforma

| Variable | Fuente | Valor actual |
|----------|--------|--------------|
| `LMS_HOST` | config.yml | `167.172.142.82.nip.io` |
| `CMS_HOST` | config.yml | `studio.167.172.142.82.nip.io` |
| `MFE_HOST` | default `tutor-mfe` | `apps.<LMS_HOST>` |
| `FICCT_LANDING_HOST` | `landing_page.py` | `www.<LMS_HOST>` |
| `FICCT_LANDING_DEPLOY_PATH` | `landing_page.py` | `/root/landing-deploy` |
| `PLATFORM_NAME` | config.yml | `FICCT - Virtual` |
| `LANGUAGE_CODE` | config.yml | `es-419` |
| `CONTACT_EMAIL` | config.yml | `leonel.barriosmay@gmail.com` |
| `ENABLE_HTTPS` | config.yml | `false` |
| `ENABLE_WEB_PROXY` / `CADDY_HTTP_PORT` | defaults | `true` / `80` |
| `MOUNTS` | config.yml | 3 MFEs (learning, authn, authoring) |
| `PLUGINS` / `PLUGIN_INDEXES` | config.yml | ver §1.3 |
| `FICCT_DASHBOARD_API_REF` | config.yml | `e9a6be5` |
| `AVATAR_ENABLED` | config.yml | `true` |
| `AVATAR_TTS_API_URL` | config.yml | endpoint Modal (público) |
| `IAASSISTANT_OPENROUTER_MODEL` | config.yml | `openai/gpt-4o-mini` |
| `IAASSISTANT_OPENROUTER_BASE_URL` | config.yml | `https://openrouter.ai/api/v1` |
| `IAASSISTANT_OPENROUTER_TIMEOUT` | config.yml | `30` |
| `IAASSISTANT_OPENROUTER_FALLBACK_MODELS` | config.yml | *(vacío)* |
| `OPENROUTER_MODEL` | default de `avatar_asistente.py` | `openai/gpt-4o-mini` |
| `OPENEDX_MYSQL_DATABASE` / `_USERNAME` | defaults | `openedx` / `openedx` |
| `MONGODB_DATABASE` / `MONGODB_HOST` | defaults | `openedx` / `mongodb` |
| `OPENEDX_COMMON_VERSION` | default | `release/ulmo.3` |
| `SERVICE_VARIANT`, `DJANGO_SETTINGS_MODULE`, `UWSGI_WORKERS` | docker-compose generado | por contenedor (`lms`/`cms`, `*.envs.tutor.production`, `2`) |
| `OPENEDX_USER_ID` | contenedor `permissions` | `1000` |
| `default_site_port` | contenedor `caddy` | `:80` |

### 5.2 Integraciones de terceros

| Servicio | Variables | Notas |
|----------|-----------|-------|
| **SMTP** | `SMTP_HOST=smtp`, `SMTP_PORT=8025`, `EMAIL_HOST_USER=""`, `EMAIL_USE_TLS=false`, `RUN_SMTP=true` | Usa el relay interno `devture/exim-relay` **sin autenticación**. Entrega directa desde la IP del servidor. **PENDIENTE — verificar en servidor origen si el correo realmente llega** (IP nueva = reputación nueva; conviene migrar a un SMTP externo tipo SES/SendGrid) |
| **OpenRouter** (avatar) | `OPENROUTER_API_KEY` 🔑, `OPENROUTER_MODEL`, `AVATAR_OPENROUTER_THROTTLE_RATE` | Solo en Django settings (`FICCT_AVATAR`). La consume `/api/ficct/avatar/ask/`, que exige usuario autenticado y limita a 20 req/min |
| **OpenRouter** (XBlock ia-assistant, backend) | `IAASSISTANT_OPENROUTER_API_KEY` 🔑 + `_MODEL`, `_BASE_URL`, `_TIMEOUT`, `_FALLBACK_MODELS` | Solo en Django settings, no expuesta |
| **RapidAPI Judge0** (XBlock ai_eval) | `FICCT_JUDGE0_API_KEY` 🔑, `JUDGE0_API_URL`, `JUDGE0_API_HOST` (hardcodeados en `ficct_config.py`) | Tier gratuito: 100 submissions/día |
| **OpenRouter GPT4O** (XBlock ai_eval) | `FICCT_OPENROUTER_API_KEY` | **sin setear** |
| **API TTS propia (Modal)** | `AVATAR_TTS_API_URL` | Servicio externo en Modal.com (GPU T4, escala a cero a los 5 min). ✅ **Código ya versionado** en `services/avatar-tts/` — antes vivía solo en la PC. Incluye una variante para correrlo como contenedor propio en el servidor; cambiar de una a otra es un `tutor config save --set AVATAR_TTS_API_URL=…` sin rebuild. Ver `services/avatar-tts/README.md` |
| **S3 / almacenamiento objeto** | `AWS_ACCESS_KEY_ID=""` (vacío) | **No se usa S3 ni MinIO.** Los media están en disco local |
| **Pagos / e-commerce** | — | **No hay.** `tutor-credentials` y `discovery` están instalados pero deshabilitados |

### 5.3 Secretos y credenciales (solo nombres)

**En `/root/.local/share/tutor/config.yml`** (el archivo completo es sensible):

```
OPENEDX_SECRET_KEY
JWT_RSA_PRIVATE_KEY
MYSQL_ROOT_PASSWORD
OPENEDX_MYSQL_PASSWORD
MEILISEARCH_MASTER_KEY
MEILISEARCH_API_KEY
MEILISEARCH_API_KEY_UID
CMS_OAUTH2_SECRET
ID
OPENROUTER_API_KEY
IAASSISTANT_OPENROUTER_API_KEY
FICCT_JUDGE0_API_KEY
```

**Fuera de `config.yml`:**

| Secreto | Dónde vive | Acción en migración |
|---------|-----------|---------------------|
| GitHub PAT (`ghp_…`) | URL del remote `origin` de `/root/openedx-ficct` + `/root/.git-credentials` | **Rotar.** No copiar. Usar deploy key SSH o `gh auth login` |
| `secrets.GITHUB_TOKEN` | GitHub Actions | Automático, no requiere migración |

**Estos valores NO están reproducidos en este informe por diseño.**

⚠️ **Con la decisión de instalar limpio (§0.1), solo 3 de esta lista hay que transferir:**
`OPENROUTER_API_KEY`, `IAASSISTANT_OPENROUTER_API_KEY` y `FICCT_JUDGE0_API_KEY` — son claves
de servicios de terceros, no las genera Tutor. Se setean con `tutor config save --set`.

El resto (`OPENEDX_SECRET_KEY`, `JWT_RSA_PRIVATE_KEY`, contraseñas de MySQL, claves de
Meilisearch, `CMS_OAUTH2_SECRET`, `ID`) **Tutor los genera solos** en el `config save` inicial:
solo servían para dar continuidad a sesiones, tokens y datos que no se migran. La columna
"consecuencia de regenerarla" de la tabla de arriba aplica únicamente a una migración **con**
restauración de datos.

---

## 6. Overrides de Docker Compose

**No existe ningún archivo `docker-compose.override.yml` manual.** Los únicos archivos compose
son los generados por Tutor en `env/local/` y `env/dev/`, que se regeneran con `tutor config save`
y **no deben editarse a mano**.

La única modificación al stack viene de un **plugin**, no de un override:

| Origen | Servicio | Qué hace |
|--------|----------|----------|
| `landing_page.py` → patch `local-docker-compose-services` | **`landing`** (nuevo) | `docker.io/caddy:2.7.4`, `restart: unless-stopped`, bind-mount `/root/landing-deploy:/srv/landing:ro`, genera un Caddyfile inline con SPA fallback (`try_files {path} /index.html`) + gzip, escucha en `:80` |
| `landing_page.py` → patch `caddyfile` | **`caddy`** (modifica) | Agrega el vhost `www.<LMS_HOST>{$default_site_port}` → `reverse_proxy landing:80` |

Servicios totales en ejecución (12): `caddy`, `lms`, `cms`, `lms-worker`, `cms-worker`, `mfe`,
`landing`, `mysql`, `mongodb`, `redis`, `meilisearch`, `smtp` (+ `permissions` one-shot).

---

## 7. Datos y estado persistente

### 7.1 Ubicación

**Todo es bind-mount** bajo `/root/.local/share/tutor/data/` — **no hay volúmenes nombrados de Docker**.
Esto simplifica la migración enormemente: se copia el directorio con la plataforma detenida.

| Dato | Ruta en el host | Montado en | Tamaño |
|------|-----------------|-----------|--------|
| MySQL | `~/.local/share/tutor/data/mysql` | `mysql:/var/lib/mysql` | **315 MB** |
| MongoDB | `~/.local/share/tutor/data/mongodb` | `mongodb:/data/db` | **518 MB** |
| Meilisearch | `~/.local/share/tutor/data/meilisearch` | `meilisearch:/meili_data` | **11 MB** |
| Redis | `~/.local/share/tutor/data/redis` | `redis:/openedx/redis/data` | **2.6 MB** (caché/colas — descartable) |
| Media subidos (público) | `~/.local/share/tutor/data/openedx-media` | `lms`,`cms`:`/openedx/media` | **304 MB** |
| Media privados | `~/.local/share/tutor/data/openedx-media-private` | `/openedx/media-private` | 4 KB (vacío) |
| Datos LMS (logs, uploads, grades) | `~/.local/share/tutor/data/lms` | `lms:/openedx/data` | **74 MB** |
| Datos CMS | `~/.local/share/tutor/data/cms` | `cms:/openedx/data` | **39 MB** |
| **TOTAL** | `~/.local/share/tutor/data` | | **~1.3 GB** |
| Landing compilada | `/root/landing-deploy` | `landing:/srv/landing:ro` | **3.2 MB** |

> ⚠️ **Nada de esto se migra.** Por decisión de alcance (§0.1) el servidor nuevo arranca
> vacío; los tamaños de abajo describen el estado del origen, no una carga de trabajo de
> transferencia.

### 7.2 Tamaño lógico de las bases

| Base | Motor | Tamaño |
|------|-------|--------|
| `openedx` | MySQL 8.4 | **29.6 MB** de datos+índices |
| `mysql` (sistema) | MySQL 8.4 | 10.2 MB |
| `openedx` | MongoDB 7.0 (WiredTiger) | **17.3 MB** en disco |

> El grueso de los 833 MB de MySQL+Mongo en disco son binlogs, journals y preasignación, no
> datos: el contenido real son ~47 MB entre las dos bases.

### 7.3 Estáticos

Los estáticos del LMS/CMS (`/openedx/staticfiles/`) y los `dist/` de los MFEs viven **dentro de
las imágenes Docker**, no en volúmenes. Se regeneran al buildear — no hay que migrarlos.
El tema `ficct` se copia al contexto de build:
`/root/openedx-ficct/themes/ficct/.` → `~/.local/share/tutor/env/build/openedx/themes/ficct/`
(imágenes actuales en el build: `logo.png`, `logo-white.png`, `favicon.ico`; **`banner.jpg` está
en el repo pero no se copió al build actual** — verificar si hace falta).

### 7.4 Estado en base de datos que no está en el código

**PENDIENTE — verificar en servidor origen** (se resuelve solo si se restauran los dumps):

- Registro del tema en `/admin/theming/sitetheme/` (`ficct` ↔ site `167.172.142.82.nip.io`).
- **Registro del `Site` de Django** (`django_site`): apunta al dominio viejo → **hay que actualizarlo** tras cambiar de host.
- Waffle flag `notifications.enable_notifications` (lo re-crea `tutor local do init`).
- `Advanced Module List` de cada curso (XBlocks habilitados).
- Aplicaciones OAuth2 del LMS (`/admin/oauth2_provider/application/`) — incluyen las URLs de los MFEs.
- Usuarios, cursos, inscripciones, calificaciones, certificados.

### 7.5 Landing page — build y despliegue

El fuente vive en **`landing-page/`** dentro del monorepo (antes era un repo anidado;
el historial previo quedó en `github.com/LeonelBM123/landingpage-main` hasta `5187c84`).

`dist/` y `node_modules/` **no se versionan**, y en el servidor **no hay Node instalado**.
La compilación se hace con un contenedor — **verificado, funciona en ~1 min**:

```bash
cd /root/openedx-ficct/landing-page
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm ci --no-audit --no-fund && npm run build"
rm -rf /root/landing-deploy/* && cp -r dist/. /root/landing-deploy/
```

No hace falta reiniciar el contenedor `landing`: monta `/root/landing-deploy` y Caddy
sirve los archivos nuevos en la siguiente request.

Verificado que el `dist/` desplegado hoy en `/root/landing-deploy` **corresponde al
fuente actual** (ambos contienen los enlaces a `catalog`, `authn` y `learner-dashboard`).
Ver §8.3 para los 3 enlaces con el host hardcodeado que hay que editar al migrar.

### 7.6 Servicio de voz del avatar (TTS + visemas)

Genera el audio que habla el avatar y los **visemas** del lip sync: Kokoro sintetiza la voz
y MMS_FA (torchaudio) hace *forced alignment* del audio real contra el texto. Lo consume
`ttsService.js` del MFE `learning` vía `AVATAR_TTS_API_URL`.

**Hoy corre en Modal.com** (app `avatar-tts-api-v3`, GPU T4, `scaledown_window=300`), o sea
**fuera de este servidor**. Eso lo hace indiferente a la migración: el LMS nuevo apunta a la
misma URL y sigue funcionando.

✅ **Código versionado** en `services/avatar-tts/` (commit `3d929e7`). Antes vivía solo en la
PC del desarrollador: si esa máquina se perdía, la voz no se podía reconstruir.

| Archivo | Para qué |
|---|---|
| `modal/modal_api_v3.py` | La versión desplegada hoy. `modal deploy modal_api_v3.py` |
| `app.py` + `Dockerfile` + `requirements.txt` | La misma app para correrla como contenedor propio |
| `README.md` | Cómo medir la latencia y cómo desplegar en cualquiera de las dos formas |
| `tutor-plugins/avatar_tts.py` | Plugin **opcional, sin instalar** — agrega el servicio al compose + vhost `tts.<LMS_HOST>` |

**PENDIENTE — confirmar que `modal/modal_api_v3.py` es exactamente lo desplegado.** Se
versionó a partir del código que pasó el desarrollador; no se pudo verificar contra Modal.
Si en Modal hay algo más nuevo, el repo guarda la versión vieja, que es peor que no guardar
nada porque da falsa seguridad.

#### Decisión abierta: seguir en Modal o correrlo en el servidor

Con 16 GB y 8 cores el servidor nuevo **sí puede** correrlo (necesita ~2-3 GB residentes).
En el viejo era inviable: con 2 GB libres el OOM killer se llevaba puesto el LMS.

| | Modal (actual) | Contenedor propio |
|---|---|---|
| Hardware | GPU T4 | CPU |
| En reposo | escala a cero a los 5 min | siempre caliente |
| Tras inactividad | **cold start** (carga modelos + GPU) | ya cargado |
| Costo | por segundo de GPU | ninguno |
| Migración | no depende del servidor | se va con el servidor |
| Acceso | público, `allow_origins=["*"]`, sin auth | detrás del Caddy propio, CORS acotado |

Modal gana en caliente; el contenedor propio gana en frío. Cuál domina depende del uso real.

**Cambiar de una a otra es un solo comando, sin rebuild** — por eso la decisión es de bajo
riesgo y reversible:

```bash
tutor config save --set AVATAR_TTS_API_URL=<la otra url> && tutor local restart lms
```

**La medición se hace en el servidor nuevo** (el viejo tiene otro CPU y no alcanza la RAM):
`docker build` + un `curl` cronometrado, según `services/avatar-tts/README.md`. Menos de
~5 s → conviene self-hostear; más de ~15 s → quedarse en Modal.

⚠️ En cualquiera de las dos variantes el endpoint **no tiene autenticación**: cualquiera que
lea `AVATAR_TTS_API_URL` de `/api/mfe_config/v1` puede mandarle texto y consumir cómputo. La
solución de fondo es proxearlo por el LMS, igual que se hizo con OpenRouter en §4.4.

---

## 8. Dominios y certificados

### 8.1 Dominios actuales (todos vía `nip.io` sobre `167.172.142.82`)

| Host | Destino | Definido en |
|------|---------|-------------|
| `167.172.142.82.nip.io` | `lms:8000` | `LMS_HOST` |
| `studio.167.172.142.82.nip.io` | `cms:8000` | `CMS_HOST` |
| `apps.167.172.142.82.nip.io` | `mfe:8002` (+ `redir / → LMS`) | `MFE_HOST` (tutor-mfe) |
| `www.167.172.142.82.nip.io` | `landing:80` | `FICCT_LANDING_HOST` (`landing_page.py`) |
| `meilisearch.167.172.142.82.nip.io` | `meilisearch:7700` | default de Tutor |

### 8.2 Certificados

**No hay certificados.** `ENABLE_HTTPS: false` → Caddy escucha **solo en el puerto 80**, sin
Let's Encrypt ni certificados propios. Todas las URLs internas (`LMS_ROOT_URL`, `CMS_ROOT_URL`,
`MFE_CONFIG`, `CATALOG_MICROFRONTEND_URL`, `LOGOUT_URL`) están escritas como `http://`.

### 8.3 Implicancias para el servidor nuevo

1. **Con `nip.io`:** basta cambiar `LMS_HOST`/`CMS_HOST` a la IP nueva y regenerar. Cero DNS.
2. **Con dominio real** (recomendado, p. ej. `virtual.ficct.uagrm.edu.bo`):
   - Crear registros DNS `A` para el apex + `studio.`, `apps.`, `www.` (o un wildcard `*`).
   - `tutor config save --set ENABLE_HTTPS=true` → Caddy pide certificados a Let's Encrypt
     automáticamente y abre el puerto 443 (hay que abrirlo en el firewall).
   - **Hay que revisar los `http://` hardcodeados** en `ficct_config.py` (`LOGO_URL`,
     `LOGOUT_URL`, `DISCOVERY_API_BASE_URL`, TOS/privacy) y `catalog_mfe.py`
     (`CATALOG_MICROFRONTEND_URL`) → pasarlos a `https://`, si no habrá mixed content.

⚠️ **El host también está hardcodeado en el fuente de la landing page**, que no pasa por
Tutor y por lo tanto **no se actualiza con `tutor config save`**. Hay 3 enlaces con
`http://apps.167.172.142.82.nip.io` embebido, y hay que editarlos a mano y **recompilar**
la landing al cambiar de servidor:

| Archivo (`landing-page/`) | Enlace |
|---|---|
| `src/components/Navbar.jsx:46` | `…/catalog/` — botón "Ver Cursos" |
| `src/components/Navbar.jsx:47` | `…/authn/login` — botón "Iniciar Sesión" |
| `src/components/Tools.jsx:9` | `…/learner-dashboard/` — tarjeta "Aula Virtual" |

Si no se tocan, los botones principales de la landing seguirán apuntando al servidor viejo.
   - Actualizar el `Site` de Django y las redirect URIs de las apps OAuth2 en el admin.

---

## 9. Checklist de migración

Leyenda: 🤖 automatizable · 🖐️ manual · ⚠️ punto de fallo típico

### Fase 0 — Antes de tocar el servidor nuevo (en el viejo)

- [x] ✅ **Rescatado y pusheado a `main` del monorepo** (`e9a6be5..ea73237`): `landing_page.py`,
      `iaassistant.py`, las 9 líneas nuevas de `ficct_config.py`, este informe y
      `docs/prompt-documento-requerimientos.md`.
- [x] ✅ **Los 4 componentes de la landing** commiteados y pusheados a `landingpage-main`
      (`ce7802f..5187c84`), y el fuente incorporado al monorepo en `landing-page/` (ver §7.5).
- [x] ✅ **Verificado que `e9a6be5` está en el remoto** — `git ls-remote origin main` lo devolvía
      como tip de `main` antes del merge, así que el `pip install` de `ficct-dashboard-api`
      pineado a ese sha resuelve correctamente.
- [x] ✅ **Verificados los repos de terceros sin pin** — `Mau8877/ia-assistant-plugin` y
      `open-craft/xblock-ai-evaluation` responden a `git ls-remote` (siguen públicos).
- [ ] 🖐️ Descartar los `package.json`/`package-lock.json` de los MFEs (artefactos de `tutor dev`,
      ver §2.3): `git checkout -- 'mfes/*/package*.json'`.
- [ ] 🖐️ Anotar el estado de `Advanced Module List`, `SiteTheme` y apps OAuth2 desde el admin
      (respaldo por si algo del dump falla).
- [ ] 🖐️ ⚠️ **Rotar el GitHub PAT** embebido en el remote y en `/root/.git-credentials`.
- [ ] 🖐️ ⚠️ **Rotar `OPENROUTER_API_KEY`** — estuvo publicada en `/api/mfe_config/v1`, así que
      hay que darla por quemada. Recién tiene sentido rotarla **después** de desplegar el
      endpoint `/api/ficct/avatar/ask/` (ver §4.4); antes, la nueva se volvería a publicar.
      Aprovechar para ponerle **límite de gasto** en OpenRouter: hoy no tiene (`limit: None`).

### Fase 1 — Qué se lleva del servidor origen

> ✅ **Decisión tomada (2026-08-12): NO se migran datos.** El servidor origen es una
> instancia de pruebas — 7 usuarios reales, 0 certificados, 1 entrega — y los paquetes
> SCORM/H5P subidos son material de prueba. El servidor nuevo arranca con base de datos
> limpia. **No hay Fase 5 de restauración.**

Esto elimina los dumps, el `tar` de 1.3 GB y el almacenamiento intermedio. Lo único que
viaja es configuración, y casi toda ya está en Git.

| Qué | Cómo viaja |
|---|---|
| Plugins de Tutor, tema, MFEs, landing, `ficct-dashboard-api`, servicio de voz | `git clone` del monorepo |
| Hosts, idioma, `PLATFORM_NAME`, lista de plugins, `OPENEDX_EXTRA_PIP_REQUIREMENTS` | Se re-declaran con `tutor config save --set` (Fase 3) |
| **3 API keys de terceros** | Único traspaso manual — ver abajo |

- [ ] 🖐️ 🔐 Copiar **solo estas tres** por canal seguro (no por chat ni email plano):
      `IAASSISTANT_OPENROUTER_API_KEY`, `FICCT_JUDGE0_API_KEY` y, si no se rota antes,
      `OPENROUTER_API_KEY`.
- [ ] ⚪ No hace falta copiar `config.yml` entero. Los demás secretos de §5.3
      (`OPENEDX_SECRET_KEY`, `JWT_RSA_PRIVATE_KEY`, contraseñas de MySQL, claves de
      Meilisearch, `CMS_OAUTH2_SECRET`, `ID`) **los regenera Tutor solo**: solo servían para
      dar continuidad a sesiones y datos que no se migran.
- [ ] 🖐️ Anotar la URL de `AVATAR_TTS_API_URL` (el servicio en Modal sigue vivo y no depende
      de este servidor).
- [ ] 🖐️ El servidor viejo puede quedar encendido hasta validar el nuevo: al no restaurar
      nada, los dos pueden convivir sin conflicto.

### Fase 2 — Preparar el servidor nuevo

**Servidor destino:** `edx@10.253.10.77`

| Recurso | Servidor nuevo | Servidor viejo | Veredicto |
|---|---|---|---|
| CPU | 8 vCPU Xeon Gold 6240 @ 2.60 GHz | 4 vCPU | holgado |
| RAM | 16 GB | 7 GB (2 libres) | holgado — habilita el TTS propio, ver §7.6 |
| Disco | 500 GB | 154 GB (98 usados) | holgado |
| SO | Ubuntu 24.04.4 | Ubuntu 24.04 | igual |
| Docker | 29.7.2 | 29.1.3 | OK |
| Python | 3.12.3 | 3.12.3 | igual |

- [x] ✅ Hardware y SO verificados: cumplen y sobran.
- [ ] 🖐️ ⚠️ **Confirmar el direccionamiento de red.** `10.253.10.77` es una IP **privada**
      (RFC 1918). Tal como está, la plataforma solo sería alcanzable desde la LAN de la
      universidad, y además:
      - `10.253.10.77.nip.io` resuelve, pero solo funciona desde dentro de esa red.
      - Let's Encrypt **no puede** validar una IP privada: sin IP pública o DNS real no hay
        HTTPS automático.
      Hay que definir si va a haber IP pública, NAT/port-forwarding o un reverse proxy de la
      UAGRM por delante, porque de eso dependen `LMS_HOST`, `CMS_HOST` y todo §8.
- [ ] 🖐️ Verificar la versión de Docker Compose: el dato relevado dice `5.4.0`, pero Compose
      va por la serie 2.x. Confirmar con `docker compose version` (el viejo tiene 2.40.3).
- [ ] 🤖 `pip install "tutor[full]==21.0.7"` — fijar la versión exacta, igual que en el viejo.
- [ ] 🖐️ Firewall (`ufw`): se puede dejar inactivo mientras se trabaja solo en LAN; definir
      reglas (22, 80, 443) **antes** de exponerlo.
- [ ] 🖐️ Autenticación Git: deploy key SSH o `gh auth login`. **No** copiar `.git-credentials`
      ni reutilizar el PAT viejo.
- [ ] 🖐️ Rotar la contraseña del usuario `edx` o pasar a autenticación solo por clave SSH.

### Fase 3 — Código y configuración

- [ ] 🤖 `git clone --recurse-submodules https://github.com/LeonelBM123/openedx-ficct.git /root/openedx-ficct`
      (⚠️ el `--recurse-submodules` es necesario para `brand-ficct`).
- [ ] 🖐️ Colocar `config.yml` en `~/.local/share/tutor/config.yml` (crear el directorio primero).
- [ ] 🤖 ⚠️ Ajustar hosts a la IP/dominio nuevo:
      ```bash
      tutor config save --set LMS_HOST=<nuevo> --set CMS_HOST=studio.<nuevo>
      ```
      (`MFE_HOST` y `FICCT_LANDING_HOST` se derivan solos de `LMS_HOST`).
- [ ] 🤖 Instalar los 9 plugins custom (`avatar_tts` queda afuera a propósito: es opcional,
      ver §7.6):
      ```bash
      for p in avatar_asistente brand_ficct catalog_mfe ficct_config \
               ficct_dashboard_api ficct_theme iaassistant landing_page notifications_ficct; do
        tutor plugins install /root/openedx-ficct/tutor-plugins/$p.py
      done
      ```
- [ ] 🤖 `tutor plugins enable mfe avatar_asistente brand_ficct catalog_mfe ficct_config ficct_dashboard_api ficct_theme iaassistant landing_page notifications_ficct`
- [ ] 🤖 Copiar el tema al contexto de build:
      `cp -r /root/openedx-ficct/themes/ficct/. ~/.local/share/tutor/env/build/openedx/themes/ficct/`
- [ ] 🤖 `tutor config save`
- [ ] 🤖 Recrear los `MOUNTS` (solo si se va a usar `tutor dev`):
      `tutor mounts add /root/openedx-ficct/mfes/frontend-app-{learning,authn,authoring}`

### Fase 4 — Imágenes

- [ ] 🤖 **MFE** — bajar la imagen ya construida por Actions (rápido, ~2 min):
      ```bash
      docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
      docker tag  ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
      ```
      ⚠️ **Mejor alternativa:** `tutor config save --set DOCKER_IMAGE_MFE=ghcr.io/leonelbm123/openedx-mfe:21.0.0`
      y olvidarse del re-tag para siempre.
- [ ] 🤖 **openedx** — hay que buildearla (~20 min): `tutor images build openedx`.
      Incluye los 3 paquetes de `OPENEDX_EXTRA_PIP_REQUIREMENTS`, `ficct-dashboard-api@e9a6be5`
      y el tema `ficct`.
      ⚠️ Alternativa mucho más rápida: `docker save`/`docker load` de la imagen del server viejo
      (5 GB por la red) — evita depender de que los repos Git de terceros sigan disponibles.
      Actualizar `FICCT_DASHBOARD_API_REF` al último commit del monorepo antes de buildear.
- [ ] ⚪ **Opcional — servicio de voz propio.** Medir si conviene traerlo desde Modal
      (§7.6): `docker build -t ficct-avatar-tts services/avatar-tts` + el `curl` cronometrado
      de `services/avatar-tts/README.md`. Es el momento natural para hacerlo, porque el
      servidor todavía no tiene carga real encima.
- [ ] 🖐️ ⚠️ Verificar que `github.com/Mau8877/ia-assistant-plugin` y
      `github.com/open-craft/xblock-ai-evaluation` sigan accesibles (ambos sin pin de versión:
      un build nuevo puede traer código distinto al del server viejo).

### Fase 5 — (no aplica)

Reemplazada por la inicialización limpia de la Fase 6. No hay dumps que restaurar ni
`data/` que descomprimir: `tutor local do init` crea el esquema desde cero.

### Fase 6 — Arranque e inicialización

- [ ] 🤖 `tutor local start -d`
- [ ] 🤖 `tutor local do init` (migraciones + waffle flag de notificaciones).
- [ ] 🤖 `tutor local do init --limit notifications_ficct` si el flag no quedó creado.
- [ ] 🖐️ **Crear el superusuario** (la base arranca vacía):
      `tutor local do createuser --staff --superuser <admin> <email>`
- [ ] 🖐️ **Registrar el tema** en `/admin/theming/sitetheme/`: site = `<LMS_HOST>`,
      theme dir = `ficct`. Sin esto Open edX no aplica el tema (ver §7.3).
- [ ] 🖐️ Verificar que el `Site` de `/admin/sites/site/` tenga el dominio nuevo.
- [ ] 🖐️ Habilitar los XBlocks en cada curso nuevo: *Studio → Advanced Settings → Advanced
      Module List* → `["coding_ai_eval", "shortanswer_ai_eval"]` (+ scorm / h5p según se usen).
- [ ] 🤖 Reindexar Meilisearch: `tutor local do reindex-courses` (⚠️ necesario si se descartó
      `data/meilisearch` o si cambió la master key).

### Fase 7 — Post-migración manual (lo que ningún script resuelve)

- [ ] 🖐️ ⚠️ **DNS**: apuntar los registros `A` a la IP nueva (o dejar que `nip.io` lo resuelva solo).
- [ ] ⚪ `Site` de Django, apps OAuth2 y `SiteTheme`: **al instalar limpio no arrastran el host
      viejo**, se crean con los valores nuevos. Igual conviene verificarlos (Fase 6).
- [ ] 🖐️ Si se pasa a HTTPS: cambiar los `http://` hardcodeados en `ficct_config.py` y
      `catalog_mfe.py`, `tutor config save`, rebuild del MFE.
- [ ] 🖐️ **PENDIENTE — verificar en servidor origen**: si el correo saliente funciona con el
      relay exim interno. Con IP nueva la reputación es cero; muy probablemente haya que
      configurar un SMTP externo (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` 🔑,
      `SMTP_USE_TLS`, `RUN_SMTP=false`).
- [ ] 🖐️ Verificar servicios externos que no viven en este servidor:
      **API TTS en Modal** (`AVATAR_TTS_API_URL`), OpenRouter, Azure Speech, RapidAPI Judge0.
- [ ] 🖐️ Rotar los secretos que estuvieron expuestos y actualizarlos con `tutor config save --set`.

### Fase 8 — Verificación funcional

```bash
tutor local status                                   # 12 contenedores arriba
curl -I http://<LMS_HOST>/                           # 200
curl -I http://studio.<LMS_HOST>/                    # 200
curl -I http://apps.<LMS_HOST>/learning/             # 200
curl -I http://www.<LMS_HOST>/                       # 200 (landing)
curl -I http://<LMS_HOST>/static/ficct/images/logo.png   # 200 → tema OK
curl -s http://<LMS_HOST>/api/mfe_config/v1 | grep -o 'AVATAR_ENABLED'   # avatar publicado
curl -s "http://<LMS_HOST>/api/ficct/popular-courses/?limit=3"           # API propia OK
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ | head -3"
```

> La plataforma arranca vacía, así que la verificación funcional empieza por **crear un curso
> de prueba en Studio** e inscribir un usuario. Sirve de paso como validación end-to-end.

- [ ] 🖐️ Crear un curso en Studio, publicarlo y subir un archivo (valida media y permisos).
- [ ] 🖐️ Inscribirse con un usuario de prueba y verlo en el catálogo.
- [ ] 🖐️ Entrar al curso y ver el avatar 3D; hacerle una pregunta (valida
      `/api/ficct/avatar/ask/` + la voz de Modal).
- [ ] 🖐️ Probar un XBlock `coding_ai_eval` (valida Judge0).
- [ ] 🖐️ Campana de notificaciones visible (requiere inscripción activa).
- [ ] 🖐️ Logout → debe caer en la landing (`www.<LMS_HOST>`).

### Qué se puede automatizar y qué no — resumen

| 🤖 Automatizable (script único) | 🖐️ Requiere intervención manual |
|---|---|
| Instalar Docker + Tutor + plugins pip | Transferir las 3 API keys de terceros |
| Clonar el monorepo e instalar los 9 plugins | Rotar el PAT de GitHub y las API keys expuestas |
| `tutor config save` con los hosts nuevos | Configurar DNS |
| Pull/re-tag de la imagen MFE | Actualizar `Site` de Django y apps OAuth2 |
| Build de la imagen `openedx` | Verificar el envío de correo |
| `tutor local start` + `do init` + reindex | Registrar el tema en el admin y crear el superusuario |
| | Decidir dominio real vs `nip.io`, y HTTPS |
| Smoke tests con `curl` | Pruebas funcionales de usuario |

---

## Anexo A — Rutas clave del servidor origen

```
/root/.local/share/tutor/config.yml          ← configuración + secretos (NO versionado)
/root/.local/share/tutor/data/               ← datos persistentes (~1.3 GB)
/root/.local/share/tutor/env/                ← generado por Tutor (NO editar a mano)
/root/.local/share/tutor-plugins/            ← plugins instalados (incluye iaassistant.py)
/root/openedx-ficct/                         ← monorepo (fuente de verdad)
/root/openedx-ficct/tutor-plugins/           ← plugins custom
/root/openedx-ficct/docker/mfe/Dockerfile    ← Dockerfile de MFEs para GitHub Actions
/root/openedx-ficct/themes/ficct/            ← comprehensive theme (Django legacy)
/root/openedx-ficct/brand-ficct/             ← submódulo Git: paquete npm @edx/brand
/root/openedx-ficct/apps-custom/ficct-dashboard-api/  ← app Django propia (APIs /api/ficct/)
/root/openedx-ficct/services/avatar-tts/     ← servicio de voz (Modal + variante contenedor)
/root/landing-deploy/                        ← dist/ compilado de la landing (3.2 MB)
/root/openedx-ficct/landing-page/            ← fuente Vite/React de la landing
/root/backup-tutor/                          ← backup viejo de config.yml (2026-06-30)
```

## Anexo B — Repositorios externos de los que depende el despliegue

| Repo | Uso | Ref |
|------|-----|-----|
| `github.com/LeonelBM123/openedx-ficct` | monorepo + `pip install` de `ficct-dashboard-api` | `main` / `e9a6be5` |
| `github.com/LeonelBM123/brand-ficct` | paquete npm `@edx/brand` (submódulo + `npm install` en el build) | `master` |
| `github.com/LeonelBM123/landingpage-main` | historial previo de la landing (ya migrada al monorepo) | archivado en `5187c84` |
| `github.com/Mau8877/ia-assistant-plugin` | XBlock asistente IA | `main` (sin pin) |
| `github.com/open-craft/xblock-ai-evaluation` | XBlock AI evaluation / Judge0 | default (sin pin) |
| `github.com/openedx/frontend-app-*` | base de los 12 MFEs | `release/ulmo.3` (`catalog`: `master`) |
| `github.com/openedx/openedx-translations` | traducciones vía `atlas` | `release/ulmo.3` |
| `ghcr.io/leonelbm123/openedx-mfe` | imagen MFE construida | `21.0.0`, `latest` |
| PyPI `h5p-xblock` | XBlock H5P | sin pin |
