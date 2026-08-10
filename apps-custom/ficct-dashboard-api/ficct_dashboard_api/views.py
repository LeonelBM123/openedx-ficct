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
CACHE_KEY = 'ficct.popular_courses'
CACHE_TIMEOUT = 60 * 10  # 10 minutos


def _enrollment_counts():
    """
    Inscripciones activas por curso: {course_id (str): cantidad}.

    Es la misma consulta que usa el Instructor Dashboard
    (CourseEnrollmentManager.enrollment_counts), pero agregada para toda la plataforma.
    """
    rows = (
        CourseEnrollment.objects
        .filter(is_active=True)
        .values('course_id')
        .annotate(total=Count('id'))
    )
    return {str(row['course_id']): row['total'] for row in rows}


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
    asi que no requiere autenticacion. La respuesta no depende del usuario, lo que
    permite cachearla; el filtrado de "cursos en los que ya estoy inscrito" lo hace
    el MFE con los datos que ya tiene de /api/learner_home/init.
    """

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', DEFAULT_LIMIT))
        except ValueError:
            limit = DEFAULT_LIMIT
        limit = max(1, min(limit, MAX_LIMIT))

        courses = cache.get(CACHE_KEY)
        if courses is None:
            courses = _build_popular_courses()
            cache.set(CACHE_KEY, courses, CACHE_TIMEOUT)

        return Response({'results': courses[:limit]})
