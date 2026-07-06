# Referencia Rápida de Comandos

## Producción (tutor local)

```bash
# Estado
tutor local status

# Reiniciar todo
tutor local restart

# Reiniciar solo el LMS (cambios de config Django)
tutor local restart lms

# Logs
tutor local logs --tail=50 lms
tutor local logs --tail=50 mfe

# Detener y arrancar
tutor local stop && tutor local start -d
```

## Desarrollo (tutor dev)

```bash
# Iniciar todos los MFEs en modo dev
tutor dev start

# Iniciar un MFE específico
tutor dev start learning

# Ver logs
tutor dev logs --tail=50 learning
tutor dev logs -f authn

# Reiniciar un MFE
tutor dev restart learning

# Ejecutar un comando dentro de un contenedor dev
tutor dev run learning npm install nombre-paquete

# Ver mounts configurados
tutor mounts list

# Agregar un mount nuevo
tutor mounts add /root/openedx-ficct/mfes/frontend-app-<nombre>
```

## Aplicar nueva imagen de producción (después de GitHub Actions)

```bash
docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
docker tag ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
tutor local restart
```

## Plugins

```bash
# Instalar / actualizar un plugin
tutor plugins install /root/openedx-ficct/tutor-plugins/nombre.py

# Ver plugins activos
tutor plugins list

# Después de instalar, regenerar entorno
tutor config save
```

## Configuración

```bash
# Ver el valor de una variable
tutor config printvalue AVATAR_ENABLED
tutor config printvalue AZURE_SPEECH_KEY

# Setear una variable (secretos, API keys)
tutor config save --set AZURE_SPEECH_KEY=tu_clave
tutor config save --set OPENROUTER_API_KEY=tu_clave
tutor config save --set AVATAR_ENABLED=true

# Ver toda la MFE_CONFIG que llega al learning MFE
curl -s "http://167.172.142.82.nip.io/api/mfe_config/v1?mfe=learning" | python3 -m json.tool
```

## Rebuild de imágenes (cambios que requieren rebuild completo)

```bash
# Cambios en brand-ficct — se hace automáticamente via GitHub Actions al hacer push
# Pero si necesitas rebuild manual:
tutor images build mfe
tutor local restart

# Cambios en logos/temas Django legacy
cp -r /root/openedx-ficct/themes/ficct/. ~/.local/share/tutor/env/build/openedx/themes/ficct/
tutor images build openedx
tutor local stop && tutor local start -d
```

## Sincronizar PC → Servidor

```bash
# PC:
git add . && git commit -m "..." && git push

# Servidor (después del pull):
cd /root/openedx-ficct && git pull
tutor plugins install tutor-plugins/brand_ficct.py
tutor plugins install tutor-plugins/catalog_mfe.py
tutor plugins install tutor-plugins/ficct_theme.py
tutor plugins install tutor-plugins/ficct_config.py
tutor config save
```

## Verificaciones útiles

```bash
# Avatar activo en el bundle
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ 2>/dev/null | head -3"

# Logo accesible
curl -I http://167.172.142.82.nip.io/static/ficct/images/logo.png

# Tema activo en DB
docker exec tutor_local-lms-1 python manage.py lms shell \
  -c "from openedx.core.djangoapps.theming.helpers import get_themes; print(get_themes())"

# Asset 3D accesible
curl -I http://apps.167.172.142.82.nip.io/learning/avatar.glb

# Estado del build en GitHub Actions
# https://github.com/LeonelBM123/openedx-ficct/actions
```

## Setup de un nuevo MFE en modo dev (resumen)

```bash
tutor mounts add /root/openedx-ficct/mfes/frontend-app-<nombre>
tutor dev run <nombre> npm install --legacy-peer-deps
tutor dev run <nombre> npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
tutor dev start <nombre>
```
