"""Reglas de prompt para componentes codigo."""


def build_codigo_rules():
    """Devuelve reglas especificas para codigo."""
    return "\n".join(
        [
            "Codigo:",
            "- data.enunciado debe explicar que debe resolver el alumno.",
            "- data.lenguaje debe indicar un lenguaje concreto.",
            "- data.codigo_base debe ser una plantilla editable, simple y segura.",
            "- data.codigo_base debe ser sintácticamente válido cuando sea posible.",
            "- No usar asignaciones incompletas como 'valor1 = # TODO' o 'edad = # TODO'.",
            "- No usar placeholders inválidos como 'Tu Edad', '???' o texto suelto que rompa el lenguaje.",
            "- Si el alumno debe completar partes, usar comentarios claros como '# TODO' o valores iniciales seguros.",
            "- Ejemplos válidos para Python: 'valor1 = 0  # TODO: cambia este valor' y 'valor2 = 0  # TODO: cambia este valor'.",
            "- Ejemplo alternativo válido: '# TODO: cambia los valores iniciales' seguido de 'valor1 = 0'.",
            "- data.codigo_base no debe resolver completamente el ejercicio salvo que el docente lo pida.",
            "- data.instrucciones debe orientar a completar, modificar, analizar o revisar el código base.",
            "- El prompt no debe indicar ejecutar el código.",
            "- No pedir usar consola, terminal o ejecución real dentro del componente.",
            "- No usar palabras como ejecutar, correr, run o ver resultado en ejecución dentro de las instrucciones.",
            "- No depender de librerias externas innecesarias.",
            "- Si hay teoria existente, el ejercicio debe estar alineado con esa teoria.",
        ]
    )
