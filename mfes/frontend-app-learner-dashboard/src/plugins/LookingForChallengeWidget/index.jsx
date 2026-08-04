import React from 'react';

import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button, Card, Hyperlink, Icon,
} from '@openedx/paragon';
import { ArrowForward } from '@openedx/paragon/icons';

import { useInitializeLearnerHome, useCourseCreatorStatus, useRequestCourseCreator } from 'data/hooks';
import moreCoursesSVG from 'assets/more-courses-sidewidget.svg';
import { baseAppUrl } from 'data/services/lms/urls';

import { findCoursesWidgetClicked } from './track';
import messages from './messages';
import './index.scss';

export const arrowIcon = (<Icon className="mx-1" src={ArrowForward} />);

export const LookingForChallengeWidget = () => {
  const { formatMessage } = useIntl();
  const { data: learnerData } = useInitializeLearnerHome();
  const courseSearchUrl = learnerData?.platformSettings?.courseSearchUrl || '';
  const hyperlinkDestination = baseAppUrl(courseSearchUrl) || '';

  const { data: creatorStatus } = useCourseCreatorStatus();
  const requestCourseCreator = useRequestCourseCreator();

  const renderInstructorAction = () => {
    // Sin dato (cargando/error/CORS) o ya es creator: no mostrar nada.
    if (!creatorStatus || creatorStatus === 'granted') {
      return null;
    }
    // Solicitud en curso o ya rechazada: solo mostramos el estado, sin re-solicitar.
    if (creatorStatus === 'pending' || creatorStatus === 'denied') {
      return (
        <p className="small text-gray-500 mt-2 mb-0">
          {formatMessage(messages.instructorRequestPending)}
        </p>
      );
    }
    // 'unrequested': botón para solicitar.
    return (
      <h5 className="mt-2">
        <Button
          variant="link"
          className="p-0 d-flex align-items-center"
          onClick={() => requestCourseCreator.mutate()}
          disabled={requestCourseCreator.isPending}
        >
          {formatMessage(messages.becomeInstructorButton, { arrow: arrowIcon })}
        </Button>
      </h5>
    );
  };

  return (
    <Card orientation="horizontal" id="looking-for-challenge-widget">
      <Card.ImageCap
        src={moreCoursesSVG}
        srcAlt="course side widget"
      />
      <Card.Body className="m-auto pr-2">
        <h4>
          {formatMessage(messages.lookingForChallengePrompt)}
        </h4>
        <h5>
          <Hyperlink
            variant="brand"
            destination={hyperlinkDestination}
            onClick={findCoursesWidgetClicked(hyperlinkDestination)}
            className="d-flex align-items-center"
          >
            {formatMessage(messages.findCoursesButton, { arrow: arrowIcon })}
          </Hyperlink>
        </h5>
        {renderInstructorAction()}
      </Card.Body>
    </Card>
  );
};

LookingForChallengeWidget.propTypes = {};

export default LookingForChallengeWidget;
