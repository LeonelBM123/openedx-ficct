# Landing page FICCT

SPA en React + Vite que se sirve en `www.<LMS_HOST>` (hoy
`www.167.172.142.82.nip.io`). Es la portada pública del sitio y el destino al que
caen los MFEs después del logout.

Vivía en el repo aparte `github.com/LeonelBM123/landingpage-main` (historial hasta el
commit `5187c84`); desde entonces forma parte de este monorepo.

## Cómo se despliega

No corre en un contenedor de Node: se compila a estáticos y los sirve un Caddy.

```
landing-page/          →  npm run build  →  dist/  →  /root/landing-deploy
                                                            ↓ bind-mount :ro
                                              servicio `landing` (caddy:2.7.4)
                                                            ↓
                                    vhost www.<LMS_HOST> en el Caddy de Tutor
```

El servicio y el vhost los define el plugin `tutor-plugins/landing_page.py`, con las
variables `FICCT_LANDING_HOST` y `FICCT_LANDING_DEPLOY_PATH`.

## Build

En el servidor **no hay Node instalado**: se compila con un contenedor.

```bash
cd /root/openedx-ficct/landing-page
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm ci --no-audit --no-fund && npm run build"
```

Toma ~1 minuto. Después hay que publicar el resultado:

```bash
rm -rf /root/landing-deploy/* && cp -r dist/. /root/landing-deploy/
```

No hace falta reiniciar nada: el contenedor `landing` monta ese directorio y Caddy
sirve los archivos nuevos en la siguiente request.

`dist/` y `node_modules/` están en el `.gitignore` — no se versionan.

## Enlaces a la plataforma

Los botones que van al LMS ("Iniciar Sesión", "Ver Cursos", "Aula Virtual") **no llevan el
host escrito a mano**: se derivan en runtime del host donde está servida la landing, en
`src/config.js`.

```
landing servida en   www.X   →   LMS en X   ·   MFEs en apps.X
```

Es la misma convención que definen `tutor-plugins/landing_page.py` (`FICCT_LANDING_HOST` =
`www.{{ LMS_HOST }}`) y el default de `tutor-mfe` (`MFE_HOST` = `apps.{{ LMS_HOST }}`).

Consecuencia práctica: **al cambiar de servidor no hay que tocar nada ni recompilar**. Y
como el protocolo también sale de `window.location`, al activar HTTPS los enlaces pasan a
`https://` solos en vez de quedar como *mixed content*.

Si algún día los dominios dejan de seguir esa convención (por ejemplo, la landing en el
apex y el LMS en `campus.…`), se fuerzan al construir:

```bash
docker run --rm -v "$PWD":/app -w /app \
  -e VITE_LMS_BASE_URL=https://campus.ficct.uagrm.edu.bo \
  -e VITE_MFE_BASE_URL=https://apps.ficct.uagrm.edu.bo \
  node:20-alpine sh -c "npm ci && npm run build"
```

⚠️ En `npm run dev` la derivación da `apps.localhost:5173`, que no existe. Para probar los
enlaces en desarrollo hay que usar el override de arriba.

## Desarrollo

```bash
docker run --rm -it -p 5173:5173 -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm install && npm run dev -- --host 0.0.0.0"
```
