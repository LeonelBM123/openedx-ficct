import React, { useMemo } from 'react';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Container } from '@openedx/paragon';

import { usePopularCourses, useInitializeLearnerHome } from 'data/hooks';

import PopularCourseCard from './PopularCourseCard';
import messages from './messages';
import './index.scss';

const MAX_VISIBLE = 4;

/**
 * Cursos mas demandados de la plataforma (por inscritos activos), en una franja
 * a todo el ancho arriba de "Mis cursos".
 *
 * Los datos vienen de /api/ficct/popular-courses/ (apps-custom/ficct-dashboard-api).
 * Si el endpoint no responde, la seccion no se renderiza y el dashboard queda
 * exactamente como antes.
 */
export const PopularCourses = () => {
  const { formatMessage } = useIntl();
  const { data: popularCourses, isError } = usePopularCourses();
  const { data: learnerHomeData } = useInitializeLearnerHome();

  const visibleCourses = useMemo(() => {
    const enrolledIds = new Set(
      (learnerHomeData?.courses || [])
        .map((course) => course?.courseRun?.courseId)
        .filter(Boolean),
    );
    return (popularCourses || [])
      .filter((course) => !enrolledIds.has(course.course_id))
      .slice(0, MAX_VISIBLE);
  }, [popularCourses, learnerHomeData]);

  if (isError || visibleCourses.length === 0) {
    return null;
  }

  return (
    <Container fluid size="xl" className="popular-courses" data-testid="PopularCourses">
      <h2 className="popular-courses-title">{formatMessage(messages.sectionTitle)}</h2>
      <div className="popular-courses-list">
        {visibleCourses.map((course) => (
          <PopularCourseCard key={course.course_id} course={course} />
        ))}
      </div>
    </Container>
  );
};

PopularCourses.propTypes = {};

export default PopularCourses;
