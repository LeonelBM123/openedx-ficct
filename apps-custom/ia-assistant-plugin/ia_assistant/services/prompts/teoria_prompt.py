"""Reglas de prompt para componentes teoria."""


def build_teoria_rules():
    """Devuelve reglas especificas para teoria."""
    return "\n".join([
        "Teoria:",
        "- data.titulo debe ser string.",
        "- data.formato debe ser exactamente \"markdown\".",
        "- data.contenido debe usar Markdown educativo claro y simple.",
        "- Permitir explicitamente:",
        "  - titulos Markdown",
        "  - listas",
        "  - negrita",
        "  - cursiva",
        "  - codigo inline",
        "  - bloques de codigo simples",
        "- Prohibir explicitamente:",
        "  - imagenes Markdown",
        "  - HTML crudo",
        "  - <img>",
        "  - <script>",
        "  - <iframe>",
        "  - <object>",
        "  - <embed>",
        "  - depender de recursos externos para entender la teoria.",
    ])