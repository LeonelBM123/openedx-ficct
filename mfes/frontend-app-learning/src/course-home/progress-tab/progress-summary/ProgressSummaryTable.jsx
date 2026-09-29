import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge, Icon, IconButton, ProgressBar,
} from '@openedx/paragon';
import {
  ArrowDropDown, ArrowDropUp, CheckCircle, WatchFilled,
} from '@openedx/paragon/icons';

import { useContextId } from '../../../data/hooks';
import { ProgressTotalRow } from './ProgressSummaryTableFooter';
import messages from './messages';

const STATUS = {
  NOT_STARTED: 'notStarted',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
};

const getStatus = (percent) => {
  if (percent >= 100) {
    return STATUS.COMPLETED;
  }
  if (percent > 0) {
    return STATUS.IN_PROGRESS;
  }
  return STATUS.NOT_STARTED;
};

const STATUS_BADGE_VARIANT = {
  [STATUS.NOT_STARTED]: 'light',
  [STATUS.IN_PROGRESS]: 'info',
  [STATUS.COMPLETED]: 'success',
};

const STATUS_BAR_VARIANT = {
  [STATUS.NOT_STARTED]: 'dark',
  [STATUS.IN_PROGRESS]: 'dark',
  [STATUS.COMPLETED]: 'success',
};

const STATUS_MESSAGE = {
  [STATUS.NOT_STARTED]: messages.statusNotStarted,
  [STATUS.IN_PROGRESS]: messages.statusInProgress,
  [STATUS.COMPLETED]: messages.statusCompleted,
};

const SectionUnitsList = ({
  courseId, sequenceIds, sequences, units,
}) => {
  const intl = useIntl();

  return (
    <ul className="progress-summary-table__unit-list list-unstyled m-0">
      {sequenceIds.map((sequenceId) => {
        const sequence = sequences[sequenceId];
        if (!sequence) {
          return null;
        }
        return sequence.unitIds.map((unitId) => {
          const unit = units[unitId];
          if (!unit) {
            return null;
          }
          return (
            <li key={unitId} className="progress-summary-table__unit-item">
              <Icon
                src={unit.complete ? CheckCircle : WatchFilled}
                className={`mr-2 flex-shrink-0 ${unit.complete ? 'text-success-500' : 'text-gray-500'}`}
                alt={intl.formatMessage(unit.complete ? messages.unitCompletedAltText : messages.unitIncompleteAltText)}
              />
              <Link to={`/course/${courseId}/${sequenceId}/${unitId}`} className="muted-link small">
                {unit.title}
              </Link>
            </li>
          );
        });
      })}
    </ul>
  );
};

SectionUnitsList.propTypes = {
  courseId: PropTypes.string.isRequired,
  sequenceIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  sequences: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  units: PropTypes.object.isRequired,
};

const ProgressSummaryRow = ({
  courseId, section, sequences, units,
}) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getStatus(section.percent);
  const contentId = `progress-summary-units-${section.id}`;

  return (
    <>
      <tr className="progress-summary-table__row" role="row">
        <th scope="row" role="rowheader" className="progress-summary-table__cell">
          <div className="d-flex align-items-center">
            <IconButton
              src={isExpanded ? ArrowDropUp : ArrowDropDown}
              iconAs={Icon}
              alt={intl.formatMessage(
                isExpanded ? messages.collapseSectionAltText : messages.expandSectionAltText,
                { sectionTitle: section.title },
              )}
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-controls={contentId}
              size="sm"
              className="mr-2 flex-shrink-0"
            />
            <span className="small font-weight-bold mr-2">{section.title}</span>
            <Badge variant={STATUS_BADGE_VARIANT[status]}>
              {intl.formatMessage(STATUS_MESSAGE[status])}
            </Badge>
          </div>
        </th>
        <td
          role="cell"
          className="progress-summary-table__cell text-right small"
          data-label={intl.formatMessage(messages.units)}
        >
          {intl.formatMessage(messages.unitsValue, {
            completed: section.completionStat.completed,
            total: section.completionStat.total,
          })}
        </td>
        <td
          role="cell"
          className="progress-summary-table__cell progress-summary-table__progress-cell"
          data-label={intl.formatMessage(messages.progressPercent)}
        >
          <div className="d-flex align-items-center justify-content-end">
            {/* El "% completado" ya se muestra en el <span> de al lado como texto visible;
                no se pasa `label` porque ProgressBar lo dibuja como una burbuja flotante sobre
                la barra, pensada para barras de ancho completo, no para esta versión compacta
                dentro de una celda. La barra sigue siendo un progressbar accesible por sí sola
                (aria-valuenow/min/max los pone el propio componente). */}
            <ProgressBar
              now={section.percent}
              variant={STATUS_BAR_VARIANT[status]}
              className="progress-summary-table__bar flex-grow-1 mr-2"
            />
            <span className="small font-weight-bold">{section.percent}%</span>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="progress-summary-table__expanded-row" role="row">
          <td colSpan={3} id={contentId} role="cell" className="progress-summary-table__cell">
            <span className="x-small font-weight-bold text-gray-700 d-block mb-2">
              {intl.formatMessage(messages.sectionUnitsHeading)}
            </span>
            <SectionUnitsList
              courseId={courseId}
              sequenceIds={section.sequenceIds}
              sequences={sequences}
              units={units}
            />
          </td>
        </tr>
      )}
    </>
  );
};

ProgressSummaryRow.propTypes = {
  courseId: PropTypes.string.isRequired,
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    percent: PropTypes.number,
    sequenceIds: PropTypes.arrayOf(PropTypes.string),
    completionStat: PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
    }),
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  sequences: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  units: PropTypes.object.isRequired,
};

const ProgressSummaryTable = ({
  sections, sequences, units, total,
}) => {
  const intl = useIntl();
  const courseId = useContextId();

  return (
    <div className="progress-summary-table__wrapper">
      <table className="progress-summary-table w-100" role="table">
        <thead className="progress-summary-table__head" role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader" className="h5 mb-0 progress-summary-table__cell">{intl.formatMessage(messages.section)}</th>
            <th scope="col" role="columnheader" className="h5 mb-0 progress-summary-table__cell text-right">{intl.formatMessage(messages.units)}</th>
            <th scope="col" role="columnheader" className="h5 mb-0 progress-summary-table__cell text-right">{intl.formatMessage(messages.progressPercent)}</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {sections.map((section) => (
            <ProgressSummaryRow
              key={section.id}
              courseId={courseId}
              section={section}
              sequences={sequences}
              units={units}
            />
          ))}
        </tbody>
        <tfoot className="border-top border-primary bg-light-200" role="rowgroup">
          <tr role="row">
            <td colSpan={3} className="progress-summary-table__cell">
              <ProgressTotalRow completed={total.completed} total={total.total} percent={total.percent} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
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
  // eslint-disable-next-line react/forbid-prop-types
  sequences: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  units: PropTypes.object.isRequired,
  total: PropTypes.shape({
    completed: PropTypes.number,
    total: PropTypes.number,
    percent: PropTypes.number,
  }).isRequired,
};

export default ProgressSummaryTable;
