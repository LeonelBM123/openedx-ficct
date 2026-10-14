"""Módulos de servicio para IA Assistant.

Este paquete evita importar implementaciones de servicios al momento de carga
para mantener liviana la inicialización del XBlock.
"""

__all__ = [
    "ai_errors",
    "component_service",
    "openrouter_client",
    "prompt_builder",
    "unit_service",
]
