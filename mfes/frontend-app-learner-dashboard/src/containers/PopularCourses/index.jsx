import React, { useMemo } from 'react';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Container } from '@openedx/paragon';

import { usePopularCourses, useInitializeLearnerHome } from 'data/hooks';

import PopularCoursesTrack from './PopularCoursesTrack';
import messages from './messages';
import './index.scss';

// El carrusel necesita mas de 4 tarjetas para tener sentido deslizar.
// 12 sigue dentro de MAX_LIMIT=20 del backend (ver PopularCoursesView), no
// requiere rebuild de la imagen openedx.
const POPULAR_COURSES_LIMIT = 12;

/**
 * Cursos mas demandados de la plataforma (por inscritos activos), en un
 * carrusel deslizable a todo el ancho arriba de "Mis cursos".
 *
 * Los datos vienen de /api/ficct/popular-courses/ (apps-custom/ficct-dashboard-api).
 * Si el endpoint no responde, la seccion no se renderiza y el dashboard queda
 * exactamente como antes.
 */
export const PopularCourses = () => {
  const { formatMessage } = useIntl();
  const { data: popularCourses, isError } = usePopularCourses(POPULAR_COURSES_LIMIT);
  const { data: learnerHomeData } = useInitializeLearnerHome();

  const visibleCourses = useMemo(() => {
    const enrolledIds = new Set(
      (learnerHomeData?.courses || [])
        .map((course) => course?.courseRun?.courseId)
        .filter(Boolean),
    );
    return (popularCourses || []).filter((course) => !enrolledIds.has(course.course_id));
  }, [popularCourses, learnerHomeData]);

  if (isError || visibleCourses.length === 0) {
    return null;
  }

  return (
    <Container fluid size="xl" className="popular-courses" data-testid="PopularCourses">
      <h2 className="popular-courses-title">{formatMessage(messages.sectionTitle)}</h2>
      <PopularCoursesTrack courses={visibleCourses} />
    </Container>
  );
};

PopularCourses.propTypes = {};

export default PopularCourses;
