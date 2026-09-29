import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Icon } from '@openedx/paragon';
import { CheckCircle } from '@openedx/paragon/icons';

import messages from './messages';

const MILESTONES = [25, 50, 100];

const MilestoneBadges = ({ percentComplete }) => {
  const intl = useIntl();

  return (
    <div className="mb-3" data-testid="progress-milestone-badges">
      <div className="small font-weight-bold text-gray-700 mb-2">
        {intl.formatMessage(messages.milestonesTitle)}
      </div>
      <ul className="progress-milestone-list list-unstyled d-flex flex-wrap m-0">
        {MILESTONES.map((milestone) => {
          const achieved = percentComplete >= milestone;
          return (
            <li
              key={milestone}
              className={classNames(
                'progress-milestone-badge d-flex align-items-center small font-weight-bold mr-2 mb-2',
                achieved ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-700',
              )}
            >
              {achieved && (
                <Icon
                  src={CheckCircle}
                  className="mr-1"
                  alt={intl.formatMessage(messages.milestoneAchievedAltText)}
                />
              )}
              {intl.formatMessage(messages.milestoneLabel, { percent: milestone })}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

MilestoneBadges.propTypes = {
  percentComplete: PropTypes.number.isRequired,
};

export default MilestoneBadges;
