import React from 'react';
import PropTypes from 'prop-types';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Card, ProgressBar } from '@openedx/paragon';

import { useCourseData, useEntitlementInfo, useIsMasquerading } from 'hooks';
import { useCourseProgress } from 'data/hooks';

import messages from './messages';
import './index.scss';

/**
 * Barra con el porcentaje de unidades completadas del curso.
 * El dato no viene en /api/learner_home/init: se pide por curso a
 * /api/course_home/progress/{courseId}/ (mismo numero que muestra la
 * pestana "Progreso" del MFE learning).
 */
export const CourseCardProgress = ({ cardId }) => {
  const { formatMessage } = useIntl();
  const courseData = useCourseData(cardId);
  const isMasquerading = useIsMasquerading();
  const { isEntitlement, isFulfilled } = useEntitlementInfo(courseData);

  const courseId = courseData?.courseRun?.courseId;
  // En modo "Ver como" el endpoint devolveria el progreso del staff, no el del alumno observado.
  const isEnabled = !!courseId && !isMasquerading && !(isEntitlement && !isFulfilled);
  const { data: completionSummary, isPending, isError } = useCourseProgress(courseId, isEnabled);

  if (!isEnabled || isError) {
    return null;
  }

  if (isPending) {
    // Placeholder de la misma altura para que la tarjeta no salte al cargar.
    return (
      <Card.Section className="pt-0 pb-3">
        <div className="course-card-progress-placeholder" data-testid="CourseCardProgressLoading" />
      </Card.Section>
    );
  }

  const completeCount = completionSummary?.complete_count ?? 0;
  const incompleteCount = completionSummary?.incomplete_count ?? 0;
  const totalCount = completeCount + incompleteCount;

  if (totalCount === 0) {
    return null;
  }

  const percent = Math.round((completeCount / totalCount) * 100);

  return (
    <Card.Section className="pt-0 pb-3">
      <div className="course-card-progress" data-testid="CourseCardProgress">
        <div className="course-card-progress-label small">
          {formatMessage(messages.progressLabel, { percent })}
        </div>
        <ProgressBar
          now={percent}
          variant="success"
          label=""
          aria-label={formatMessage(messages.progressBarAlt, { percent })}
        />
      </div>
    </Card.Section>
  );
};

CourseCardProgress.propTypes = {
  cardId: PropTypes.string.isRequired,
};

export default CourseCardProgress;
