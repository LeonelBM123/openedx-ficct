import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

// Ciclo de clases de utilidad de Paragon/Bootstrap (ya generadas por el theme de marca, ver
// brand-ficct/paragon/_variables.scss) -- se repite si el curso tiene más de 6 tipos de
// evaluación, pero eso es infrecuente y el nombre en la leyenda igual distingue cada tramo.
const SEGMENT_CLASSNAMES = [
  'bg-primary-500',
  'bg-success-500',
  'bg-warning-500',
  'bg-danger-500',
  'bg-info-500',
  'bg-dark-500',
];

const AssignmentWeightBar = ({ assignmentTypeGradeSummary }) => {
  const intl = useIntl();

  const segments = assignmentTypeGradeSummary.map((assignment, index) => ({
    type: assignment.type,
    weightPercent: Math.round(assignment.weight * 100),
    className: SEGMENT_CLASSNAMES[index % SEGMENT_CLASSNAMES.length],
  }));

  const summary = segments.map((segment) => `${segment.type} ${segment.weightPercent}%`).join(', ');

  return (
    <div className="assignment-weight-bar mb-3">
      <div className="small font-weight-bold text-gray-700 mb-2">
        {intl.formatMessage(messages.assignmentWeightBarTitle)}
      </div>
      <div
        className="assignment-weight-bar__track d-flex w-100"
        role="img"
        aria-label={intl.formatMessage(messages.assignmentWeightBarAltText, { summary })}
      >
        {segments.map((segment) => (
          <div
            key={segment.type}
            className={classNames('assignment-weight-bar__segment', segment.className)}
            style={{ width: `${segment.weightPercent}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <ul className="assignment-weight-bar__legend list-unstyled x-small d-flex flex-wrap m-0 mt-2">
        {segments.map((segment) => (
          <li key={segment.type} className="d-flex align-items-center mr-3 mb-1">
            <span className={classNames('assignment-weight-bar__legend-swatch mr-1', segment.className)} aria-hidden="true" />
            {segment.type}
            &nbsp;
            {segment.weightPercent}%
          </li>
        ))}
      </ul>
    </div>
  );
};

AssignmentWeightBar.propTypes = {
  assignmentTypeGradeSummary: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    weight: PropTypes.number.isRequired,
  })).isRequired,
};

export default AssignmentWeightBar;
