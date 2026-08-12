# Prompt: generar el PDF de requerimientos para el encargado de servidores

> Este archivo **no es el documento**: es el prompt para que Claude lo genere.
> Uso: abrí Claude Code en el monorepo y pedile "seguí las instrucciones de
> `docs/prompt-documento-requerimientos.md`".
> Si cambia el dominio, el hardware o el encargado, actualizá el Bloque 2 y volvé a correrlo.

---

## Bloque 1 — Objetivo

Redactá una **nota técnica formal** dirigida al encargado de servidores de la UAGRM, solicitando los
recursos necesarios para alojar la plataforma virtual de la FICCT en la infraestructura de la
universidad.

Requisitos de forma:

- Español, tono institucional, dirigido a una persona (no un informe interno).
- **Máximo una página impresa (A4).** Esta restricción manda sobre cualquier otra: si algo no entra,
  se recorta.
- Entrega final en **PDF** (ver Bloque 4).
- Cada punto debe ser accionable para alguien que **no conoce Open edX**: un valor concreto a
  proveer o una decisión de sí/no. Nada de jerga sin explicar.

---

## Bloque 2 — Datos confirmados (no modificar, no inventar)

Estos valores fueron medidos en el servidor actual. Usalos tal cual; si necesitás un dato que no
está acá, dejá un placeholder `<<...>>` en vez de suponerlo.

| Dato | Valor |
|------|-------|
| Plataforma | Open edX Ulmo (v21), gestionada con Tutor 21.0.7 |
| Servidor actual | DigitalOcean, Ubuntu 24.04 LTS, 4 vCPU / 8 GB RAM / 154 GB de disco, IP `167.172.142.82` |
| Presión de memoria hoy | 3.3 GB de swap en uso con solo 8 GB de RAM → **justifica pedir 16 GB** |
| Disco usado | 83 GB de 154 GB (imágenes Docker 79 GB + build cache 41 GB) |
| Datos de la plataforma | ~1.3 GB (MongoDB 520 MB, MySQL 314 MB, archivos de cursos 304 MB) — crece con el material que suban los docentes |
| Contenedores en ejecución | 12: `lms`, `cms`, `lms-worker`, `cms-worker`, `mfe`, `caddy`, `landing`, `mysql`, `mongodb`, `redis`, `meilisearch`, `smtp` |
| Landing page | Sitio **estático** (build de Vite) servido por un contenedor Caddy que levanta el plugin `tutor-plugins/landing_page.py`; su vhost vive en el Caddy que ya trae Tutor |

---

## Bloque 3 — Contenido exacto del documento

### a) Encabezado

Dos o tres líneas: qué es la plataforma (entorno virtual de aprendizaje de la FICCT basado en Open
edX, hoy operativo en un servidor externo contratado) y qué se solicita (un servidor virtual y su
configuración de red y correo para migrarla a la universidad).

Incluir destinatario, remitente y fecha como placeholders (ver Bloque 5).

### b) Tabla "Lo que se solicita" — exactamente 5 filas

**1. Servidor virtual**
Ubuntu Server 24.04 LTS, arquitectura **x86_64 / amd64** (las imágenes de Open edX no están
disponibles para ARM), **8 vCPU / 16 GB RAM / 250 GB SSD**, IP pública estática y un usuario con
`sudo`. Mínimo aceptable: 4 vCPU / 16 GB RAM / 200 GB. Justificá el pedido de RAM en una línea, con
el dato del swap del Bloque 2.

**2. Subdominio y registros DNS**
Propuesta: `virtual.ficct.uagrm.edu.bo`. Se solicita un registro `A` al subdominio base **y un
registro `A` comodín `*.virtual.ficct.uagrm.edu.bo` apuntando a la misma IP**. Explicá por qué: la
plataforma no usa un solo nombre, sino cinco, y el comodín los resuelve de una sola vez. Listalos:

| Nombre | Para qué |
|--------|----------|
| `virtual.ficct.uagrm.edu.bo` | Portal del estudiante |
| `studio.virtual…` | Entorno de creación de cursos para docentes |
| `apps.virtual…` | Módulos de la interfaz |
| `preview.virtual…` | Vista previa de cursos antes de publicarlos |
| `www.virtual…` | Página institucional (landing) |

**3. Puertos 80 y 443 abiertos desde Internet, directo al servidor**
Sin esto no se emite el certificado de seguridad (HTTPS) ni el sitio es accesible. Agregá dos
preguntas para el encargado: ¿existe un proxy o WAF institucional delante del servidor? ¿está
filtrado el tráfico de salida? (en ese caso habría que habilitar la salida hacia Docker Hub, GitHub
y PyPI para las actualizaciones). El puerto 22 (SSH) restringido a las IPs del equipo.

**4. Correo saliente institucional**
Fila breve que remite a la sección desarrollada (punto **d**).

**5. Acceso SSH con clave pública**
Se adjunta la clave pública del equipo. Consultar si el acceso es directo, por VPN o vía bastión.

### c) Párrafo "Lo que instala y administra el equipo de la FICCT"

Un párrafo corto, para que quede claro qué **no** hay que pedirles: Docker y Docker Compose,
Python 3, Tutor y los contenedores de la plataforma. Las bases de datos y el servidor web corren
**dentro de Docker**: no hace falta instalar Apache, Nginx, MySQL ni PHP en el sistema operativo.
La página institucional (landing) **no requiere hosting ni servidor web aparte** — la sirve el mismo
entorno; lo único que necesita es el nombre `www.` del punto 2.

### d) Sección "Correo saliente" — la única desarrollada

Explicá en 4–5 líneas por qué este punto no se puede resolver del lado del equipo de la FICCT:

- La plataforma envía correos de activación de cuenta, recuperación de contraseña y notificaciones.
  Sin correo, un estudiante no puede completar su registro.
- El entorno incluye su propio servidor de correo, pero los mensajes saldrían desde una IP nueva
  firmando como `@uagrm.edu.bo`: al no estar esa IP autorizada en el registro SPF del dominio, los
  mensajes caen en spam o son rechazados por los proveedores.

Y pedí concretamente:

- Host y puerto del relay de correo institucional (587, 465 o 25).
- Usuario y contraseña, **o** autorización de la IP del servidor para enviar sin credenciales.
- Una dirección remitente aprobada (por ejemplo `no-reply@ficct.uagrm.edu.bo`), contemplada en los
  registros SPF/DKIM del dominio.
- Alternativa, si no existe relay institucional: habilitar la salida al puerto 587 hacia un
  proveedor externo de correo.

### e) Nota al pie — 2 o 3 líneas, no una sección

Respaldo: idealmente un snapshot diario del servidor. Si existe monitoreo institucional
(Zabbix, Nagios, Prometheus), incorporar la máquina. Y un contacto técnico para incidencias.

---

## Bloque 4 — Cómo producir el PDF

**Importante:** en el servidor de desarrollo **no hay instalado** `pandoc`, `wkhtmltopdf`,
`weasyprint`, LibreOffice ni Chrome (verificado). No asumas que alguno está disponible.

1. Escribí primero un HTML autocontenido en `docs/requerimientos-servidor-uagrm.html`, con CSS de
   impresión embebido y **sin ninguna dependencia externa** (nada de CDN, fuentes remotas ni
   imágenes enlazadas):

   ```css
   @page { size: A4; margin: 18mm; }
   body { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.4; }
   table { width: 100%; border-collapse: collapse; }
   th, td { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
   ```

2. Intentá convertirlo a PDF con lo que haya, en este orden:

   ```bash
   weasyprint docs/requerimientos-servidor-uagrm.html docs/requerimientos-servidor-uagrm.pdf
   pandoc docs/requerimientos-servidor-uagrm.html -o docs/requerimientos-servidor-uagrm.pdf
   chromium --headless --disable-gpu --print-to-pdf=docs/requerimientos-servidor-uagrm.pdf docs/requerimientos-servidor-uagrm.html
   ```

3. Si ninguno existe, instalá el más liviano: `pip install weasyprint` (o
   `apt-get install -y weasyprint`). Si la instalación falla por red o permisos, **no insistas**:
   entregá el HTML y decile al usuario que lo abra en el navegador y use *Imprimir → Guardar como
   PDF*. Funciona igual desde la PC Windows, donde también está el monorepo.

4. Verificá que el PDF final tenga **una sola página**. Si se pasa, recortá en este orden: primero
   la nota al pie, después condensá la redacción de la tabla. **No** bajes la tipografía de 9.5 pt
   ni achiques los márgenes por debajo de 15 mm.

---

## Bloque 5 — Restricciones y placeholders

- **Ningún dato sensible en el documento**: ni contraseñas, ni claves de API, ni claves privadas.
- Marcá con `<<...>>` todo lo que el usuario debe completar antes de enviar:
  - `<<Nombre y cargo del encargado de servidores>>`
  - `<<Nombre del solicitante, cargo, correo y teléfono>>`
  - `<<Fecha>>`
  - `<<Dominio definitivo, si difiere de virtual.ficct.uagrm.edu.bo>>`
  - `<<Clave pública SSH del equipo>>`
- Al terminar, listale al usuario los placeholders que quedaron pendientes de completar.
