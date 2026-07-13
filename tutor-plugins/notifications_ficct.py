from tutor import hooks

hooks.Filters.CLI_DO_INIT_TASKS.add_item(
    (
        "lms",
        """
(./manage.py lms waffle_flag --list | grep notifications.enable_notifications) || ./manage.py lms waffle_flag --create --everyone notifications.enable_notifications
"""
    )
)
