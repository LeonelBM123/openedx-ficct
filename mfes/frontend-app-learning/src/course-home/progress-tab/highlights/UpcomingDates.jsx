import PropTypes from 'prop-types';
import { FormattedDate, useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

const MAX_UPCOMING_DATES = 5;

const UpcomingDates = ({ courseDateBlocks }) => {
  const intl = useIntl();

  const upcoming = courseDateBlocks
    .filter((block) => new Date(block.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, MAX_UPCOMING_DATES);

  return (
    <div className="mb-3" data-testid="progress-upcoming-dates">
      <div className="small font-weight-bold text-gray-700 mb-2">
        {intl.formatMessage(messages.upcomingDatesTitle)}
      </div>
      {upcoming.length === 0 ? (
        <div className="small text-gray-700">{intl.formatMessage(messages.upcomingDatesEmpty)}</div>
      ) : (
        <ul className="progress-upcoming-dates-list list-unstyled m-0">
          {upcoming.map((block) => (
            <li key={`${block.title}-${block.date}`} className="small d-flex mb-2">
              <span className="progress-upcoming-dates-list__date text-gray-700 mr-3 flex-shrink-0">
                <FormattedDate value={block.date} day="numeric" month="short" />
              </span>
              {block.link ? (
                <a href={block.link} className="muted-link">
                  {block.assignmentType && `${block.assignmentType}: `}{block.title}
                </a>
              ) : (
                <span>{block.assignmentType && `${block.assignmentType}: `}{block.title}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

UpcomingDates.propTypes = {
  courseDateBlocks: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    date: PropTypes.string,
    link: PropTypes.string,
    assignmentType: PropTypes.string,
  })).isRequired,
};

export default UpcomingDates;
