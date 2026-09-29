import React from 'react';
import PropTypes from 'prop-types';

import { Card } from '@openedx/paragon';

// REVERT-MIS-CURSOS: import { useIsCollapsed } from './hooks';
import CourseCardBanners from './components/CourseCardBanners';
import CourseCardImage from './components/CourseCardImage';
import CourseCardMenu from './components/CourseCardMenu';
import CourseCardActions from './components/CourseCardActions';
import CourseCardDetails from './components/CourseCardDetails';
import CourseCardProgress from './components/CourseCardProgress';
import CourseCardTitle from './components/CourseCardTitle';

import './CourseCard.scss';

/* REVERT-MIS-CURSOS (original: card horizontal). Para revertir: descomentar este bloque,
   borrar la version compacta de abajo y restaurar `useIsCollapsed` (import de ./hooks).
export const CourseCard = ({
  cardId,
}) => {
  const isCollapsed = useIsCollapsed();
  const orientation = isCollapsed ? 'vertical' : 'horizontal';
  return (
    <div className="mb-4.5 course-card" id={cardId} data-testid="CourseCard">
      <Card orientation={orientation}>
        <div className="d-flex flex-column w-100">
          <div {...(!isCollapsed && { className: 'd-flex' })}>
            <CourseCardImage cardId={cardId} orientation="horizontal" />
            <Card.Body>
              <Card.Header
                title={<CourseCardTitle cardId={cardId} />}
                actions={<CourseCardMenu cardId={cardId} />}
              />
              <Card.Section className="pt-0">
                <CourseCardDetails cardId={cardId} />
              </Card.Section>
              <CourseCardProgress cardId={cardId} />
              <Card.Footer orientation={orientation}>
                <CourseCardActions cardId={cardId} />
              </Card.Footer>
            </Card.Body>
          </div>
          <CourseCardBanners cardId={cardId} />
        </div>
      </Card>
    </div>
  );
};
*/

export const CourseCard = ({
  cardId,
}) => (
  <div className="course-card" id={cardId} data-testid="CourseCard">
    <Card orientation="vertical" className="h-100">
      <CourseCardImage cardId={cardId} orientation="vertical" />
      <Card.Body className="course-card-body">
        <Card.Header
          size="sm"
          title={<CourseCardTitle cardId={cardId} />}
          actions={<CourseCardMenu cardId={cardId} />}
        />
        <Card.Section className="pt-0 pb-2">
          <CourseCardDetails cardId={cardId} />
        </Card.Section>
        <div className="mt-auto">
          <CourseCardProgress cardId={cardId} />
          <Card.Footer orientation="vertical">
            <CourseCardActions cardId={cardId} />
          </Card.Footer>
        </div>
      </Card.Body>
      <CourseCardBanners cardId={cardId} />
    </Card>
  </div>
);

CourseCard.propTypes = {
  cardId: PropTypes.string.isRequired,
};

export default CourseCard;
