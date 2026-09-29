import PropTypes from 'prop-types';
import classNames from 'classnames';

import { getLocale, isRtl, useIntl } from '@edx/frontend-platform/i18n';
import { Icon, OverlayTrigger, Tooltip } from '@openedx/paragon';
import { CheckCircle, ErrorOutline, WarningFilled } from '@openedx/paragon/icons';

import messages from '../messages';

// La API de progreso solo expone { earned, possible } por problema -- no hay nombre real de
// evaluación ni una bandera de "intentado" (ver ProblemScore en progressTabData.factory.js).
// Por eso el chip usa la posición ordinal del problema ("P1", "P2"...) en vez de inventar un
// nombre, y separa "sin intentar" de "puntaje bajo" con la misma heurística que el resto de esta
// página: puntaje 0 se trata como no intentado.
const SCORE_STATUS = {
  NOT_ATTEMPTED: 'notAttempted',
  LOW: 'low',
  PARTIAL: 'partial',
  PASSED: 'passed',
};

const getScoreStatus = (earned, possible) => {
  if (earned === 0) {
    return SCORE_STATUS.NOT_ATTEMPTED;
  }
  const ratio = possible > 0 ? earned / possible : 0;
  if (ratio >= 0.8) {
    return SCORE_STATUS.PASSED;
  }
  if (ratio >= 0.5) {
    return SCORE_STATUS.PARTIAL;
  }
  return SCORE_STATUS.LOW;
};

const STATUS_CLASSNAME = {
  [SCORE_STATUS.NOT_ATTEMPTED]: 'bg-gray-100 text-gray-700',
  [SCORE_STATUS.LOW]: 'bg-danger-100 text-danger-700',
  [SCORE_STATUS.PARTIAL]: 'bg-warning-100 text-dark-700',
  [SCORE_STATUS.PASSED]: 'bg-success-100 text-success-700',
};

const STATUS_ICON = {
  [SCORE_STATUS.NOT_ATTEMPTED]: null,
  [SCORE_STATUS.LOW]: ErrorOutline,
  [SCORE_STATUS.PARTIAL]: WarningFilled,
  [SCORE_STATUS.PASSED]: CheckCircle,
};

const STATUS_MESSAGE = {
  [SCORE_STATUS.NOT_ATTEMPTED]: messages.problemScoreStatusNotAttempted,
  [SCORE_STATUS.LOW]: messages.problemScoreStatusLow,
  [SCORE_STATUS.PARTIAL]: messages.problemScoreStatusPartial,
  [SCORE_STATUS.PASSED]: messages.problemScoreStatusPassed,
};

const ProblemScoreChip = ({
  earned, possible, index, count, subsectionTitle, isLocaleRtl,
}) => {
  const intl = useIntl();
  const status = getScoreStatus(earned, possible);
  const statusLabel = intl.formatMessage(STATUS_MESSAGE[status]);
  const icon = STATUS_ICON[status];

  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id={`problem-score-tooltip-${index}`}>
          {intl.formatMessage(messages.problemScoreChipTooltip, {
            index, count, subsectionTitle, earned, possible, status: statusLabel,
          })}
        </Tooltip>
      )}
    >
      <span
        className={classNames(
          'problem-score-chip d-inline-flex align-items-center small font-weight-bold',
          STATUS_CLASSNAME[status],
        )}
        tabIndex={0}
        role="status"
        aria-label={`${intl.formatMessage(messages.problemScoreChipLabel, { index })}: ${earned}${isLocaleRtl ? '\\' : '/'}${possible} — ${statusLabel}`}
      >
        {icon && <Icon src={icon} className="problem-score-chip__icon mr-1" />}
        {intl.formatMessage(messages.problemScoreChipLabel, { index })}
        <span className="mx-1" aria-hidden="true">·</span>
        <span aria-hidden="true">{earned}{isLocaleRtl ? '\\' : '/'}{possible}</span>
      </span>
    </OverlayTrigger>
  );
};

ProblemScoreChip.propTypes = {
  earned: PropTypes.number.isRequired,
  possible: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  subsectionTitle: PropTypes.string.isRequired,
  isLocaleRtl: PropTypes.bool.isRequired,
};

const ProblemScoreDrawer = ({ problemScores, subsection }) => {
  const intl = useIntl();
  const isLocaleRtl = isRtl(getLocale());

  const scoreLabel = subsection.hasGradedAssignment ? messages.gradedScoreLabel : messages.practiceScoreLabel;

  return (
    <span className="row w-100 m-0 x-small ml-4 pt-2 pl-1 text-gray-700 flex-nowrap">
      <span id="problem-score-label" className="col-auto p-0">{intl.formatMessage(scoreLabel)}</span>
      <div className={classNames('col', 'p-0', { 'greyed-out': !subsection.learnerHasAccess })}>
        <ul className="problem-score-chip-list list-unstyled row w-100 m-0" aria-labelledby="problem-score-label">
          {problemScores.map((problemScore, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className="ml-3 mb-2">
              <ProblemScoreChip
                earned={problemScore.earned}
                possible={problemScore.possible}
                index={i + 1}
                count={problemScores.length}
                subsectionTitle={subsection.displayName}
                isLocaleRtl={isLocaleRtl}
              />
            </li>
          ))}
        </ul>
      </div>
    </span>
  );
};

ProblemScoreDrawer.propTypes = {
  problemScores: PropTypes.arrayOf(PropTypes.shape({
    earned: PropTypes.number.isRequired,
    possible: PropTypes.number.isRequired,
  })).isRequired,
  subsection: PropTypes.shape({
    displayName: PropTypes.string,
    learnerHasAccess: PropTypes.bool,
    hasGradedAssignment: PropTypes.bool,
  }).isRequired,
};

export default ProblemScoreDrawer;
