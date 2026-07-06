# Modo Desarrollo (tutor dev)

## Qué es

`tutor dev` ejecuta los MFEs con webpack en modo watch. Cualquier cambio en el código fuente recarga automáticamente el navegador sin necesidad de hacer push ni esperar builds de GitHub Actions.

## Cuándo usarlo

- Cuando estás iterando en cambios de UI, componentes React, o estilos
- Para ver el resultado de un cambio antes de commitearlo a producción

## Cuándo NO es suficiente

- Cambios en `tutor-plugins/` → requieren `tutor plugins install` + `tutor config save`
- Cambios en `brand-ficct/` que involucren logos SVG → requieren rebuild
- Cambios en `docker/mfe/env.config.jsx` → requieren rebuild (aunque en dev puedes editar el archivo dentro del contenedor temporalmente)

## URLs del modo dev

| MFE | URL |
|-----|-----|
| learning | http://apps.167.172.142.82.nip.io:2000/learning/ |
| authn | http://apps.167.172.142.82.nip.io:1999/login |
| authoring | http://apps.167.172.142.82.nip.io:2001/authoring |
| learner-dashboard | http://apps.167.172.142.82.nip.io:1996 |
| catalog | http://apps.167.172.142.82.nip.io:1998 |

## Comandos básicos

```bash
# Iniciar todos los MFEs en modo dev
tutor dev start

# Iniciar solo un MFE específico
tutor dev start learning

# Ver logs en vivo
tutor dev logs --tail=50 learning
tutor dev logs -f learning          # -f para seguir el log en tiempo real

# Reiniciar un MFE (después de instalar un paquete npm, por ejemplo)
tutor dev restart learning

# Detener todo
tutor dev stop
```

## MFEs montados actualmente

```bash
tutor mounts list
```

Montados:
- `frontend-app-learning` → `/openedx/app` en el contenedor `learning`
- `frontend-app-authn` → `/openedx/app` en el contenedor `authn`

## Montar un nuevo MFE para desarrollo

Hacer esto **una sola vez** por MFE. El mount persiste entre reinicios.

```bash
# Paso 1: Agregar el mount
tutor mounts add /root/openedx-ficct/mfes/frontend-app-<nombre>

# Paso 2: Instalar dependencias
# (el mount tapa el node_modules de la imagen → hay que reinstalarlo localmente)
tutor dev run <nombre> npm install --legacy-peer-deps

# Paso 3: Instalar brand-ficct
# (el @import ya está en el SCSS de cada MFE, solo falta el paquete npm)
tutor dev run <nombre> npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force

# Paso 4: Iniciar el dev server
tutor dev start <nombre>
```

Ejemplo para authoring:
```bash
tutor mounts add /root/openedx-ficct/mfes/frontend-app-authoring
tutor dev run authoring npm install --legacy-peer-deps
tutor dev run authoring npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
tutor dev start authoring
```

## Por qué hay que reinstalar node_modules

El mount reemplaza **todo** el directorio `/openedx/app` del contenedor con el directorio local. El `node_modules` que venía dentro de la imagen queda tapado. Como la carpeta local no tiene `node_modules` (no hay que commitearlo), hay que instalarlo dentro del contenedor, que lo escribe en la carpeta local montada.

Esta instalación solo hay que hacerla una vez. La próxima vez que se inicie `tutor dev`, el `node_modules` local ya existe y se usa directamente.

## Por qué hay que instalar brand-ficct

El plugin `brand_ficct.py` instala `@edx/brand` durante el build de la imagen Docker. Pero en modo dev con mount, no se ejecuta ese Dockerfile — se usa el código local directamente. Por eso hay que instalarlo manualmente.

El `@import '~@edx/brand/paragon/overrides';` ya está en los archivos SCSS de los 5 MFEs, así que basta con tener el paquete instalado.

## Flujo completo de desarrollo

```
tutor dev start learning
        ↓
Editar: mfes/frontend-app-learning/src/asistente/Avatar.jsx
        ↓  (webpack detecta el cambio)
Navegador recarga en http://apps.167.172.142.82.nip.io:2000/learning/
        ↓  (cuando el cambio está listo)
git add ... && git commit && git push
        ↓  (GitHub Actions ~7 min)
docker pull + tag + tutor local restart
        ↓
Cambio en producción
```

## Instalar un paquete npm nuevo en modo dev

```bash
tutor dev run learning npm install nombre-paquete --legacy-peer-deps
tutor dev restart learning
```

Si el paquete también debe estar en producción, agregarlo al `package.json` del MFE y hacer push para que el build de GitHub Actions lo incluya.

## Errores comunes

### Module not found: Can't resolve 'X'
El `node_modules` local no tiene el paquete. Correr:
```bash
tutor dev run <mfe> npm install --legacy-peer-deps
tutor dev restart <mfe>
```

### Estilos sin brand-ficct (colores default de Open edX)
El paquete `@edx/brand` no está instalado localmente. Correr:
```bash
tutor dev run <mfe> npm install '@edx/brand@git+https://github.com/LeonelBM123/brand-ficct.git' --force
tutor dev restart <mfe>
```
