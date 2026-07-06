# Plugins de Tutor

## Concepto

Los plugins de Tutor son archivos Python que inyectan configuración en los archivos que Tutor genera dinámicamente. Son la **fuente de verdad** de toda la configuración del proyecto. Nunca editar directamente los archivos en `~/.local/share/tutor/env/` — se sobreescriben con cada `tutor config save`.

## Plugins del proyecto

| Plugin | Archivo | Responsabilidad |
|--------|---------|----------------|
| brand_ficct | `brand_ficct.py` | Instala @edx/brand en MFEs |
| catalog_mfe | `catalog_mfe.py` | Registra el MFE catalog |
| ficct_theme | `ficct_theme.py` | Comprehensive Theme Django |
| ficct_config | `ficct_config.py` | MFE_CONFIG, logos, Judge0 |

## Workflow para modificar un plugin

```bash
# 1. Editar el plugin en el monorepo
nano /root/openedx-ficct/tutor-plugins/ficct_config.py

# 2. Reinstalar en Tutor
tutor plugins install /root/openedx-ficct/tutor-plugins/ficct_config.py

# 3. Regenerar entorno
tutor config save

# 4. Reiniciar el servicio afectado
tutor local restart lms        # si el cambio afecta settings de Django
tutor local restart            # si el cambio afecta MFE_CONFIG o Dockerfile
```

## Patches más importantes

| Patch | Cuándo se ejecuta |
|-------|------------------|
| `mfe-dockerfile-post-npm-install` | Dockerfile del MFE, después de npm install |
| `mfe-dockerfile-pre-npm-build` | Dockerfile del MFE, antes del webpack build |
| `openedx-lms-common-settings` | Django settings del LMS (prod + dev) |
| `openedx-lms-production-settings` | Django settings del LMS (solo prod) |
| `mfe-lms-common-settings` | MFE_CONFIG via API del LMS (prod + dev) |
| `mfe-lms-production-settings` | MFE_CONFIG via API del LMS (solo prod) |

## Variables de configuración sensibles

Las API keys nunca van en el código. Se guardan en `~/.local/share/tutor/config.yml`:

```bash
tutor config save --set FICCT_JUDGE0_API_KEY=tu_key
tutor config save --set FICCT_OPENROUTER_API_KEY=tu_key
tutor config save --set AZURE_SPEECH_KEY=tu_key
tutor config save --set AZURE_SPEECH_REGION=eastus
tutor config save --set AVATAR_ENABLED=true
tutor config save --set OPENROUTER_API_KEY=tu_key
```

Para agregar una nueva variable, declararla en el plugin correspondiente:

```python
hooks.Filters.CONFIG_DEFAULTS.add_items([
    ("MI_NUEVA_VARIABLE", "valor_por_defecto"),
])
```

Y exponerla al MFE:
```python
hooks.Filters.ENV_PATCHES.add_items([
    ("mfe-lms-common-settings", """
MFE_CONFIG["MI_NUEVA_VARIABLE"] = "{{ MI_NUEVA_VARIABLE }}"
"""),
])
```

## Agregar el MFE_CONFIG a dev mode también

Para que una variable de MFE_CONFIG funcione tanto en `tutor local` como en `tutor dev`, usar el patch `mfe-lms-common-settings` (no el `production`).

## Variables de MFE actualmente configuradas

| Variable | Plugin | Descripción |
|----------|--------|-------------|
| `AVATAR_ENABLED` | avatar_asistente.py | Habilita el avatar en el learning MFE |
| `AVATAR_QA_API_URL` | avatar_asistente.py | URL del backend de preguntas del avatar |
| `AZURE_SPEECH_KEY` | avatar_asistente.py | Clave de Azure Speech Services |
| `AZURE_SPEECH_REGION` | avatar_asistente.py | Región de Azure (ej: eastus) |
| `OPENROUTER_API_KEY` | avatar_asistente.py | Clave de OpenRouter para el LLM |
| `OPENROUTER_MODEL` | avatar_asistente.py | Modelo LLM (default: openai/gpt-4o-mini) |
| `LOGO_URL` | ficct_config.py | URL del logo en MFEs |
| `LOGO_WHITE_URL` | ficct_config.py | URL del logo blanco en MFEs |
| `FAVICON_URL` | ficct_config.py | URL del favicon en MFEs |
| `SUPPORT_EMAIL` | ficct_config.py | Email de soporte |

## Verificar configuración activa

```bash
# Ver toda la MFE_CONFIG que recibe el learning MFE
curl -s "http://167.172.142.82.nip.io/api/mfe_config/v1?mfe=learning" | python3 -m json.tool

# Ver una variable de Tutor
tutor config printvalue AVATAR_ENABLED
tutor config printvalue AZURE_SPEECH_KEY
```

## Reinstalar todos los plugins (después de un git pull)

```bash
cd /root/openedx-ficct
git pull
tutor plugins install tutor-plugins/brand_ficct.py
tutor plugins install tutor-plugins/catalog_mfe.py
tutor plugins install tutor-plugins/ficct_theme.py
tutor plugins install tutor-plugins/ficct_config.py
tutor config save
```
