"""
Vistas de las APIs de FICCT que viven en Studio (CMS).
"""
import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cms.djangoapps.course_creators.views import (
    add_user_with_status_unrequested,
    get_course_creator_status,
    user_requested_access,
)

log = logging.getLogger(__name__)


class RequestCourseCreatorView(APIView):
    """
    Solicitud del rol de course creator para el usuario autenticado.

    **Ejemplo**
        POST /api/ficct/request-course-creator/

    **Respuesta**
        {"course_creator_status": "pending"}

    Existe porque la vista nativa `/request_course_creator` del CMS es una vista
    Django legacy (`@require_POST @login_required`): al no ser DRF no acepta el JWT
    y depende de la cookie de sesion de Studio. Un alumno que nunca entro a Studio
    no la tiene, asi que recibe un 302 al flujo SSO y el XHR del MFE muere con un
    error de CORS. Este endpoint hace lo mismo pero como APIView, de modo que las
    clases de autenticacion por defecto del CMS (JWT + sesion) resuelven la llamada
    entre dominios. Al ser DRF con JWT tampoco hace falta el token CSRF.
    """

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        # `user_requested_access` hace un .get() sobre la tabla y revienta si el
        # usuario no esta. La fila se crea recien al visitar el home de Studio,
        # asi que la garantizamos antes (ambos helpers son idempotentes).
        add_user_with_status_unrequested(request.user)

        # El cambio de estado dispara post_save -> send_admin_notification, que
        # renderiza y manda un mail al STUDIO_REQUEST_EMAIL. Ese callback del core
        # solo captura SMTPException, y aqui STUDIO_REQUEST_EMAIL esta vacio, asi
        # que un fallo de notificacion podria propagarse. Para entonces el estado
        # ya quedo guardado, de modo que convertirlo en un 500 seria mentirle al
        # alumno: se registra la advertencia y se responde con el estado real.
        try:
            user_requested_access(request.user)
        except Exception:  # pylint: disable=broad-except
            log.warning(
                "Fallo la notificacion de solicitud de course creator para %s",
                request.user.username,
                exc_info=True,
            )

        # Se relee de la base: si el estado no cambio, el MFE vuelve a mostrar el boton.
        return Response({'course_creator_status': get_course_creator_status(request.user)})
