# Build con GitHub Actions

## Cómo funciona

Cada `git push` a `main` que toque archivos relevantes dispara automáticamente el workflow `.github/workflows/build-mfe.yml`, que construye una imagen Docker con todos los MFEs compilados y la publica en GitHub Container Registry (GHCR).

## Qué dispara el build

El workflow se activa cuando se modifica cualquiera de estas rutas:

```
mfes/**                          ← código de cualquier MFE
docker/mfe/**                    ← Dockerfile, env.config.jsx
brand-ficct/**                   ← estilos/logos del brand
.github/workflows/build-mfe.yml ← el propio workflow
```

También se puede disparar manualmente desde la pestaña **Actions** en GitHub.

## Qué hace el workflow

```
1. Checkout del repositorio
2. Login en GHCR con el token automático de GitHub
3. Patch del Dockerfile:
   - Reemplaza npm clean-install → npm install --legacy-peer-deps en todos los MFEs
     (necesario por conflictos de peer deps de Three.js / Azure Speech SDK)
4. Build de la imagen Docker usando docker/mfe/Dockerfile
   - Los 5 MFEs locales se pasan como build-contexts, sobreescribiendo el git clone de upstream:
     learning-src   = mfes/frontend-app-learning
     authn-src      = mfes/frontend-app-authn
     authoring-src  = mfes/frontend-app-authoring
     catalog-src    = mfes/frontend-app-catalog
     learner-dashboard-src = mfes/frontend-app-learner-dashboard
5. Push de la imagen a GHCR:
   ghcr.io/leonelbm123/openedx-mfe:21.0.0
   ghcr.io/leonelbm123/openedx-mfe:latest
```

## Duración

~7 minutos con caché de GitHub Actions activa. Sin caché (primer build o cambio de Dockerfile): ~15-20 minutos.

## Ver el estado del build

https://github.com/LeonelBM123/openedx-ficct/actions

## Aplicar la nueva imagen en producción

Después de que el build termine exitosamente:

```bash
# En el servidor
docker pull ghcr.io/leonelbm123/openedx-mfe:21.0.0
docker tag ghcr.io/leonelbm123/openedx-mfe:21.0.0 overhangio/openedx-mfe:21.0.0
tutor local restart
```

## Verificar que el código llegó

```bash
# Verificar que el bundle tiene el código del avatar
docker exec tutor_local-mfe-1 sh -c "grep -rl 'AvatarTour' /openedx/dist/learning/ 2>/dev/null | head -3"

# Ver el MFE config activo
curl -s "http://167.172.142.82.nip.io/api/mfe_config/v1?mfe=learning" | python3 -m json.tool
```

## Cómo funciona el Dockerfile multi-MFE

El archivo `docker/mfe/Dockerfile` tiene stages separados por MFE:

```
base
├── admin-console-git → admin-console-src → admin-console-common → admin-console-dev/prod
├── authn-git         → authn-src         → authn-common         → authn-dev/prod
├── authoring-git     → authoring-src     → authoring-common     → authoring-dev/prod
├── learning-git      → learning-src      → learning-common      → learning-dev/prod
└── ...
production (Caddy) ← copia los dist/ de todos los *-prod
```

Los `build-contexts` del workflow sobreescriben el stage `*-src` de cada MFE: en lugar de usar el git clone de upstream, Docker usa el código local del monorepo.

## Registro de plugins de slot (env.config.jsx compartido)

El archivo `docker/mfe/env.config.jsx` registra plugins para todos los MFEs en un solo lugar usando `process.env.APP_ID`:

```jsx
if (process.env.APP_ID == 'learning') {
  // AvatarTour registrado aquí
  addPlugins(config, 'org.openedx.frontend.layout.header_learning.v1', [...]);
}
if (process.env.APP_ID == 'authn') {
  // plugins de authn aquí
}
```

**Para agregar un plugin a un MFE:** editar `docker/mfe/env.config.jsx` en el bloque correspondiente y hacer commit normal. No se necesita `git add -f` ni ningún artilugio.

## El repo es público → GitHub Actions gratuito e ilimitado

No hay límite de minutos de build mientras el repo sea público.
