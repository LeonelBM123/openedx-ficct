from pathlib import Path, PurePosixPath


STATIC_ROOT = Path(__file__).resolve().parents[1] / "static"


def read_static_text(relative_path):
    """
    Lee un archivo de ia_assistant/static como texto UTF-8.
    """
    resource_path = _normalize_static_path(relative_path)
    return (STATIC_ROOT / Path(*resource_path.parts)).read_text(encoding="utf-8")


def _normalize_static_path(relative_path):
    """
    Evita rutas absolutas o segmentos que salgan de static/.
    """
    resource_path = PurePosixPath(relative_path)

    if resource_path.is_absolute() or ".." in resource_path.parts:
        raise ValueError("La ruta estatica debe ser relativa a static/.")

    return resource_path
