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

## ⚠️ Al migrar de servidor

Hay **3 enlaces con el host hardcodeado** que no pasan por Tutor y por lo tanto no se
actualizan con `tutor config save`:

| Archivo | Enlace |
|---|---|
| `src/components/Navbar.jsx:46` | `…/catalog/` — botón "Ver Cursos" |
| `src/components/Navbar.jsx:47` | `…/authn/login` — botón "Iniciar Sesión" |
| `src/components/Tools.jsx:9` | `…/learner-dashboard/` — tarjeta "Aula Virtual" |

Hay que editarlos a mano y recompilar, o los botones principales de la portada van a
seguir apuntando al servidor viejo.

## Desarrollo

```bash
docker run --rm -it -p 5173:5173 -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm install && npm run dev -- --host 0.0.0.0"
```
