import PropTypes from 'prop-types';
import { FormattedDate, useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

const KpiTile = ({ label, value }) => (
  <div className="col-6 col-md-3 mb-3">
    <div className="progress-kpi-tile h-100 p-3 rounded raised-card">
      <div className="x-small text-gray-700 mb-1">{label}</div>
      <div className="h4 mb-0 font-weight-bold">{value}</div>
    </div>
  </div>
);

KpiTile.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
};

const KpiRow = ({
  completedUnits, totalUnits, currentGrade, passingGrade, nextDueDate,
}) => {
  const intl = useIntl();

  return (
    <div className="row w-100 m-0 mb-1" data-testid="progress-kpi-row">
      <KpiTile
        label={intl.formatMessage(messages.kpiUnitsCompleted)}
        value={`${completedUnits} / ${totalUnits}`}
      />
      <KpiTile
        label={intl.formatMessage(messages.kpiCurrentGrade)}
        value={`${currentGrade}%`}
      />
      <KpiTile
        label={intl.formatMessage(messages.kpiPassingGrade)}
        value={`${passingGrade}%`}
      />
      <KpiTile
        label={intl.formatMessage(messages.kpiNextDueDate)}
        value={nextDueDate
          ? <FormattedDate value={nextDueDate} day="numeric" month="short" year="numeric" />
          : intl.formatMessage(messages.kpiNextDueDateNone)}
      />
    </div>
  );
};

KpiRow.propTypes = {
  completedUnits: PropTypes.number.isRequired,
  totalUnits: PropTypes.number.isRequired,
  currentGrade: PropTypes.number.isRequired,
  passingGrade: PropTypes.number.isRequired,
  nextDueDate: PropTypes.instanceOf(Date),
};

KpiRow.defaultProps = {
  nextDueDate: null,
};

export default KpiRow;
