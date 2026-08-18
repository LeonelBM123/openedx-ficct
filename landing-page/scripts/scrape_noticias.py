#!/usr/bin/env python3
"""
Genera noticias.json para la sección de noticias de la landing.

Por qué existe: www.uagrm.edu.bo no expone ninguna API. Se probaron /api/noticias,
/rss, /feed, /rss.xml y /sitemap.xml — todos 404 — y el HTML no hace ninguna llamada
AJAX: el sitio es Bootstrap + jQuery renderizado en servidor. La única vía es parsear
el HTML. Su robots.txt permite todo explícitamente ("Disallow:" vacío).

Tampoco sirve pedirlo desde el navegador: uagrm.edu.bo no manda
Access-Control-Allow-Origin, así que un fetch() desde la landing lo bloquea CORS.
Por eso la descarga ocurre acá, en el servidor, y la landing consume un JSON estático
servido desde su mismo origen.

Modo de uso:
    scrape_noticias.py --seed          # primera vez: baja las 10 páginas (~109 noticias)
    scrape_noticias.py                 # semanal: baja solo la página 1 y hace merge

El archivo se acumula: las noticias viejas no se borran aunque salgan de la portada
de la UAGRM. Se recorta a MAX_NOTICIAS descartando las más antiguas.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import date
from html import unescape

BASE = "https://www.uagrm.edu.bo/facultades/ficct/noticias"
USER_AGENT = "FICCT-landing/1.0 (+https://www.uagrm.edu.bo/facultades/ficct)"
MAX_NOTICIAS = 30
MAX_PAGINAS = 12          # el archivo son 10; el margen cubre que crezca
TIMEOUT = 30

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


def log(msg):
    print(f"[noticias] {msg}", file=sys.stderr)


def descargar(pagina):
    """Descarga una página con curl. Se usa curl y no urllib porque es el cliente
    HTTP disponible de forma consistente en el servidor y en los contenedores."""
    url = BASE if pagina == 1 else f"{BASE}?page={pagina}"
    try:
        res = subprocess.run(
            ["curl", "-sSL", "--max-time", str(TIMEOUT), "-A", USER_AGENT, url],
            capture_output=True, timeout=TIMEOUT + 10,
        )
    except subprocess.TimeoutExpired:
        log(f"timeout en {url}")
        return None
    if res.returncode != 0:
        log(f"curl falló ({res.returncode}) en {url}: {res.stderr.decode()[:200]}")
        return None
    return res.stdout.decode("utf8", "ignore")


def parsear(raw):
    """Extrae las noticias de una página. Cada una es un .card con imagen,
    categoría, título+enlace y fecha."""
    noticias = []
    for bloque in re.split(r'<div class="card mb-4 shadow-sm">', raw)[1:]:
        img = re.search(r'<img[^>]*src="([^"]+)"', bloque)
        cat = re.search(r'card-title text-uppercase"[^>]*>([^<]+)<', bloque)
        lnk = re.search(r'stretched-link"\s+href="([^"]+)">\s*(.*?)\s*</a>', bloque, re.S)
        fec = re.search(r'<small class="text-muted">\s*(.*?)\s*</small>', bloque, re.S)
        if not (lnk and fec):
            continue
        titulo = unescape(re.sub(r"\s+", " ", lnk.group(2))).strip()
        if not titulo:
            continue
        noticias.append({
            "titulo": titulo,
            "categoria": unescape(cat.group(1)).strip() if cat else "Institucional",
            "fecha": unescape(fec.group(1)).strip(),
            # normalizamos a https: el paginador de la UAGRM emite http en los enlaces
            "enlace": lnk.group(1).replace("http://", "https://"),
            "imagen": img.group(1) if img else "",
        })
    return noticias


def a_fecha(noticia):
    """'11 de Agosto de 2026' -> date(2026, 8, 11). None si no parsea."""
    m = re.match(r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", noticia.get("fecha", ""), re.I)
    if not m:
        return None
    mes = MESES.get(m.group(2).lower())
    if not mes:
        return None
    try:
        return date(int(m.group(3)), mes, int(m.group(1)))
    except ValueError:
        return None


def orden(noticia):
    """Clave de orden: por fecha descendente. Las que no parsean van al final."""
    f = a_fecha(noticia)
    return (f is not None, f or date.min)


def cargar(destino):
    if not os.path.exists(destino):
        return []
    try:
        with open(destino, encoding="utf8") as fh:
            datos = json.load(fh)
        return datos if isinstance(datos, list) else []
    except (json.JSONDecodeError, OSError) as exc:
        log(f"no se pudo leer el archivo existente ({exc}); se parte de cero")
        return []


def marcar_retiradas(archivo, pagina1):
    """Marca como retiradas las noticias que la UAGRM sacó de su sitio.

    Solo se puede afirmar de las que deberían estar en la página 1: si una noticia
    del archivo es más nueva que la más vieja de la portada y aun así no aparece ahí,
    es que la bajaron. Las que quedaron por debajo de esa fecha simplemente pasaron a
    la página 2 por el paso del tiempo, no fueron retiradas.
    """
    fechas = [f for f in map(a_fecha, pagina1) if f]
    if not fechas:
        return 0
    corte = min(fechas)
    presentes = {n["enlace"] for n in pagina1}
    marcadas = 0
    for n in archivo:
        f = a_fecha(n)
        if f and f > corte and n["enlace"] not in presentes and not n.get("retirada"):
            n["retirada"] = True
            marcadas += 1
            log(f"retirada de la fuente: {n['titulo'][:60]}")
    return marcadas


def escribir(destino, noticias):
    """Escritura atómica: si el proceso muere a mitad, el JSON viejo queda intacto."""
    os.makedirs(os.path.dirname(destino) or ".", exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(destino) or ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf8") as fh:
            json.dump(noticias, fh, ensure_ascii=False, indent=2)
        # mkstemp crea con 0600 y este JSON lo tiene que leer el Caddy que sirve la
        # landing, que corre en un contenedor con otro usuario: sin esto la sección
        # de noticias desaparece en producción.
        os.chmod(tmp, 0o644)
        os.replace(tmp, destino)
    except Exception:
        os.path.exists(tmp) and os.unlink(tmp)
        raise


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("destino", nargs="?", default="noticias.json",
                    help="ruta del JSON a generar (default: noticias.json)")
    ap.add_argument("--seed", action="store_true",
                    help="recorre todas las páginas para sembrar el archivo histórico")
    ap.add_argument("--max", type=int, default=MAX_NOTICIAS,
                    help=f"tope de noticias a conservar (default: {MAX_NOTICIAS})")
    args = ap.parse_args()

    paginas = range(1, MAX_PAGINAS + 1) if args.seed else [1]
    frescas, pagina1 = [], []
    for p in paginas:
        raw = descargar(p)
        if raw is None:
            if p == 1:
                log("ERROR: falló la página 1; no se toca el archivo existente")
                return 1
            break                       # una página profunda que falla no invalida el resto
        items = parsear(raw)
        if p == 1:
            pagina1 = items
        if not items:
            break                       # se acabó el paginado
        frescas += items
        log(f"página {p}: {len(items)} noticias")
        if len(frescas) >= args.max:
            break                       # ya hay de sobra para el tope; no molestamos más a la fuente

    if not frescas:
        log("ERROR: 0 noticias extraídas — ¿cambió el HTML de la UAGRM? "
            "No se toca el archivo existente")
        return 1

    archivo = cargar(args.destino)
    previas = len(archivo)

    marcadas = marcar_retiradas(archivo, pagina1)

    por_enlace = {n["enlace"]: n for n in archivo}
    nuevas = 0
    for n in frescas:
        if n["enlace"] in por_enlace:
            # refrescamos el contenido por si corrigieron título o imagen,
            # conservando la marca de retirada si la tuviera
            por_enlace[n["enlace"]].update(n)
            por_enlace[n["enlace"]].pop("retirada", None)
        else:
            por_enlace[n["enlace"]] = n
            nuevas += 1

    todas = sorted(por_enlace.values(), key=orden, reverse=True)
    recortadas = 0
    if len(todas) > args.max:
        recortadas = len(todas) - args.max
        todas = todas[:args.max]

    escribir(args.destino, todas)
    log(f"{len(todas)} noticias en {args.destino} "
        f"(antes {previas}, +{nuevas} nuevas, {marcadas} retiradas, "
        f"{recortadas} descartadas por antigüedad)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
