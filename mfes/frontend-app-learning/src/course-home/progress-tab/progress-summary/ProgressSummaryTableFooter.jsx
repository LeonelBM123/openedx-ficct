import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { DataTable } from '@openedx/paragon';

import messages from './messages';

const totalPropTypes = {
  completed: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  percent: PropTypes.number.isRequired,
};

/**
 * Total row of the progress summary. Rendered inside the table footer, and also on its own when
 * there is no per section breakdown to show (staff viewing another learner's progress).
 */
export const ProgressTotalRow = ({ completed, total, percent }) => {
  const intl = useIntl();

  return (
    <div className="row w-100 m-0">
      <div id="total-progress-summary" className="col-6 p-0 small">
        {intl.formatMessage(messages.totalProgress)}
      </div>
      <div
        aria-labelledby="total-progress-summary"
        className="col-3 p-0 text-right small"
      >
        {intl.formatMessage(messages.unitsValue, { completed, total })}
      </div>
      <div
        data-testid="progressSummaryTotalPercent"
        aria-labelledby="total-progress-summary"
        className="col-3 p-0 text-right font-weight-bold small"
      >
        {percent}%
      </div>
    </div>
  );
};

ProgressTotalRow.propTypes = totalPropTypes;

const ProgressSummaryTableFooter = ({ completed, total, percent }) => (
  <DataTable.TableFooter className="border-top border-primary bg-light-200">
    <ProgressTotalRow completed={completed} total={total} percent={percent} />
  </DataTable.TableFooter>
);

ProgressSummaryTableFooter.propTypes = totalPropTypes;

export default ProgressSummaryTableFooter;
