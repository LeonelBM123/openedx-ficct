import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { DataTable } from '@openedx/paragon';

import ProgressSummaryTableFooter from './ProgressSummaryTableFooter';

import messages from './messages';

const ProgressSummaryTable = ({ sections, total }) => {
  const intl = useIntl();

  const progressSummaryData = sections.map((section) => ({
    section: section.title,
    units: intl.formatMessage(messages.unitsValue, {
      completed: section.completionStat.completed,
      total: section.completionStat.total,
    }),
    progressPercent: `${section.percent}%`,
  }));

  return (
    <DataTable
      data={progressSummaryData}
      itemCount={progressSummaryData.length}
      columns={[
        {
          Header: `${intl.formatMessage(messages.section)}`,
          accessor: 'section',
          headerClassName: 'h5 mb-0',
          cellClassName: 'small',
        },
        {
          Header: `${intl.formatMessage(messages.units)}`,
          accessor: 'units',
          headerClassName: 'justify-content-end h5 mb-0',
          cellClassName: 'text-right small',
        },
        {
          Header: `${intl.formatMessage(messages.progressPercent)}`,
          accessor: 'progressPercent',
          headerClassName: 'justify-content-end h5 mb-0 text-right',
          cellClassName: 'text-right font-weight-bold small',
        },
      ]}
    >
      <DataTable.Table />
      <ProgressSummaryTableFooter
        completed={total.completed}
        total={total.total}
        percent={total.percent}
      />
    </DataTable>
  );
};

ProgressSummaryTable.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    percent: PropTypes.number,
    completionStat: PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
    }),
  })).isRequired,
  total: PropTypes.shape({
    completed: PropTypes.number,
    total: PropTypes.number,
    percent: PropTypes.number,
  }).isRequired,
};

export default ProgressSummaryTable;
