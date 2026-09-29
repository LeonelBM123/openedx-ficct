import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Card } from '@openedx/paragon';

import messages from './messages';

const ContinueCard = ({ resumeCourseUrl, hasVisitedCourse }) => {
  const intl = useIntl();

  if (!resumeCourseUrl) {
    return null;
  }

  return (
    <Card className="mb-3 raised-card" data-testid="progress-continue-card">
      <Card.Header
        title={intl.formatMessage(messages.continueCardTitle)}
        actions={(
          <Button variant="brand" block href={resumeCourseUrl}>
            {intl.formatMessage(hasVisitedCourse ? messages.continueCardResumeButton : messages.continueCardStartButton)}
          </Button>
        )}
      />
      {/* Footer is needed for internal vertical spacing to work out, same as StartOrResumeCourseCard. */}
      {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
      <Card.Footer><></></Card.Footer>
    </Card>
  );
};

ContinueCard.propTypes = {
  resumeCourseUrl: PropTypes.string,
  hasVisitedCourse: PropTypes.bool,
};

ContinueCard.defaultProps = {
  resumeCourseUrl: null,
  hasVisitedCourse: false,
};

export default ContinueCard;
