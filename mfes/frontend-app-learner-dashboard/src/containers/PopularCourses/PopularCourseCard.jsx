import React from 'react';
import PropTypes from 'prop-types';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Button, Card } from '@openedx/paragon';

import { baseAppUrl } from 'data/services/lms/urls';

import messages from './messages';

/**
 * Tarjeta de un curso del catalogo dentro de la seccion de mas demandados.
 * El backend devuelve rutas relativas del LMS, igual que learner_home/init,
 * por eso se pasan por baseAppUrl.
 */
export const PopularCourseCard = ({ course }) => {
  const { formatMessage } = useIntl();
  const aboutUrl = baseAppUrl(course.about_url);

  return (
    <Card className="popular-course-card" data-testid="PopularCourseCard">
      <Card.ImageCap
        src={course.image_url ? baseAppUrl(course.image_url) : undefined}
        srcAlt={formatMessage(messages.courseImageAlt)}
      />
      <Card.Header
        size="sm"
        title={<a className="popular-course-card-title" href={aboutUrl}>{course.title}</a>}
        subtitle={`${course.org} • ${course.number}`}
      />
      <Card.Section className="pt-0">
        <Badge variant="light">
          {formatMessage(messages.enrolledCount, { count: course.enrollment_count })}
        </Badge>
      </Card.Section>
      <Card.Footer>
        <Button variant="outline-primary" size="sm" href={aboutUrl} block>
          {formatMessage(messages.viewCourse)}
        </Button>
      </Card.Footer>
    </Card>
  );
};

PopularCourseCard.propTypes = {
  course: PropTypes.shape({
    course_id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    org: PropTypes.string,
    number: PropTypes.string,
    image_url: PropTypes.string,
    about_url: PropTypes.string.isRequired,
    enrollment_count: PropTypes.number.isRequired,
  }).isRequired,
};

export default PopularCourseCard;
