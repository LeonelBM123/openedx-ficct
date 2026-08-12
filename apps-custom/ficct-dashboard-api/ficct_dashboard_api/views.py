"""
Vistas de las APIs de FICCT para el dashboard del estudiante.
"""
import logging

from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.djangoapps.student.models import CourseEnrollment
from openedx.core.djangoapps.content.course_overviews.models import CourseOverview

log = logging.getLogger(__name__)

DEFAULT_LIMIT = 8
MAX_LIMIT = 20
COUNTS_CACHE_KEY = 'ficct.enrollment_counts'
COUNTS_CACHE_TIMEOUT = 60 * 10  # 10 minutos


def _enrollment_counts():
    """
    Inscripciones activas por curso: {course_id (str): cantidad}.

    Es la misma consulta que usa el Instructor Dashboard
    (CourseEnrollmentManager.enrollment_counts), pero agregada para toda la plataforma.

    Es lo unico que se cachea: el agregado es lo caro, y que el numero de inscritos
    tarde unos minutos en actualizarse no afecta a un ranking de "mas demandados".
    Los datos del curso (imagen, titulo) se leen frescos, para que una edicion en
    Studio se refleje al instante.
    """
    counts = cache.get(COUNTS_CACHE_KEY)
    if counts is None:
        rows = (
            CourseEnrollment.objects
            .filter(is_active=True)
            .values('course_id')
            .annotate(total=Count('id'))
        )
        counts = {str(row['course_id']): row['total'] for row in rows}
        cache.set(COUNTS_CACHE_KEY, counts, COUNTS_CACHE_TIMEOUT)
    return counts


def _visible_courses():
    """
    Cursos publicables en el catalogo: visibles, abiertos y no terminados.
    """
    now = timezone.now()
    return (
        CourseOverview.objects
        .exclude(catalog_visibility='none')
        .filter(invitation_only=False, visible_to_staff_only=False)
        .exclude(end__lt=now)
    )


def _serialize_course(course_overview, enrollment_count):
    """Forma del curso tal como la consume el MFE learner-dashboard."""
    course_id = str(course_overview.id)
    return {
        'course_id': course_id,
        'title': course_overview.display_name_with_default,
        'org': course_overview.org,
        'number': course_overview.display_number_with_default,
        'short_description': course_overview.short_description or '',
        'image_url': course_overview.image_urls.get('small') or course_overview.course_image_url,
        'about_url': f'/courses/{course_id}/about',
        'enrollment_count': enrollment_count,
        'start': course_overview.start.isoformat() if course_overview.start else None,
    }


def _build_popular_courses():
    """
    Lista completa de cursos visibles ordenada por inscritos activos (desc).

    Los cursos sin inscritos quedan al final en vez de omitirse, para que la
    seccion del dashboard no aparezca vacia en una plataforma nueva.
    """
    counts = _enrollment_counts()
    courses = [
        _serialize_course(overview, counts.get(str(overview.id), 0))
        for overview in _visible_courses()
    ]
    courses.sort(key=lambda course: (-course['enrollment_count'], course['title'].lower()))
    return courses


class PopularCoursesView(APIView):
    """
    Cursos mas demandados de la plataforma, ordenados por inscripciones activas.

    **Ejemplo**
        GET /api/ficct/popular-courses/?limit=8

    **Respuesta**
        {"results": [{"course_id", "title", "org", "number", "short_description",
                      "image_url", "about_url", "enrollment_count", "start"}, ...]}

    Es informacion de catalogo (misma sensibilidad que /api/courses/v1/courses/),
    asi que no requiere autenticacion. El filtrado de "cursos en los que ya estoy
    inscrito" lo hace el MFE con los datos que ya tiene de /api/learner_home/init.

    Solo se cachea el agregado de inscripciones (ver `_enrollment_counts`), no la
    respuesta completa: cachearla entera hacia que una imagen recien subida en Studio
    tardara hasta 10 minutos en aparecer, y mientras tanto la URL vieja daba 404.
    """

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', DEFAULT_LIMIT))
        except ValueError:
            limit = DEFAULT_LIMIT
        limit = max(1, min(limit, MAX_LIMIT))

        return Response({'results': _build_popular_courses()[:limit]})
