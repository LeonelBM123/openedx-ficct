from tutor import hooks

# Sin este flag, Open edX nunca muestra bloques de fecha de entrega en /api/course_home/dates/
# (pestana "Fechas" y "Proximas fechas"/"Proxima entrega" en el rediseno de Progreso), sin
# importar que tan bien configurado este el campo "due" de cada seccion calificada. Se activa
# igual que notifications_ficct.py: por CLI_DO_INIT_TASKS en vez de Django Admin manual, para que
# quede versionado y se re-aplique solo en cada `tutor local do init`.
hooks.Filters.CLI_DO_INIT_TASKS.add_item(
    (
        "lms",
        """
(./manage.py lms waffle_flag --list | grep course_experience.relative_dates) || ./manage.py lms waffle_flag --create --everyone course_experience.relative_dates
"""
    )
)
