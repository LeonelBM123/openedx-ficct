import React, { useMemo } from 'react';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Container } from '@openedx/paragon';

import { useNewCourses, useInitializeLearnerHome } from 'data/hooks';

import PopularCoursesTrack from 'containers/PopularCourses/PopularCoursesTrack';
import 'containers/PopularCourses/index.scss';
import messages from './messages';

const NEW_COURSES_LIMIT = 12;

/**
 * Cursos publicados mas recientemente (por fecha de creacion), en el mismo
 * carrusel que "Cursos mas demandados", al final del dashboard.
 *
 * Los datos vienen de /api/ficct/popular-courses/?sort=new. Si el backend aun no
 * soporta `sort` la respuesta no trae `created`; en ese caso la seccion se oculta
 * para no mostrar el ranking de demandados como si fueran nuevos.
 */
export const NewCourses = () => {
  const { formatMessage } = useIntl();
  const { data: newCourses, isError } = useNewCourses(NEW_COURSES_LIMIT);
  const { data: learnerHomeData } = useInitializeLearnerHome();

  const visibleCourses = useMemo(() => {
    const enrolledIds = new Set(
      (learnerHomeData?.courses || [])
        .map((course) => course?.courseRun?.courseId)
        .filter(Boolean),
    );
    return (newCourses || []).filter((course) => !enrolledIds.has(course.course_id));
  }, [newCourses, learnerHomeData]);

  const backendSupportsSort = (newCourses || []).every((course) => 'created' in course);

  if (isError || !backendSupportsSort || visibleCourses.length === 0) {
    return null;
  }

  const title = formatMessage(messages.sectionTitle);
  return (
    <Container fluid size="xl" className="popular-courses" data-testid="NewCourses">
      <h2 className="popular-courses-title">{title}</h2>
      <PopularCoursesTrack courses={visibleCourses} label={title} variant="new" />
    </Container>
  );
};

NewCourses.propTypes = {};

export default NewCourses;
