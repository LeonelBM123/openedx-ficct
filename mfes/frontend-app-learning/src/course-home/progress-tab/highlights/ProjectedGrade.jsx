import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ProgressBar } from '@openedx/paragon';

import messages from './messages';

// La API de progreso no expone cuánto peso de la calificación corresponde a evaluaciones que
// todavía faltan por entregar/calificar, así que no se puede calcular con certeza "necesitas X%
// en lo que resta para aprobar" sin inventar ese dato. En su lugar se muestra la distancia real
// entre la calificación actual y la nota mínima de aprobación, que sí sale de datos existentes
// (courseGrade.percent y gradingPolicy.gradeRange).
const ProjectedGrade = ({ currentGrade, passingGrade }) => {
  const intl = useIntl();
  const isPassing = currentGrade >= passingGrade;
  const gap = Math.max(0, passingGrade - currentGrade);

  return (
    <div className="mb-3" data-testid="progress-projected-grade">
      <div className="small font-weight-bold text-gray-700 mb-2">
        {intl.formatMessage(messages.projectedGradeTitle)}
      </div>
      <ProgressBar
        now={Math.min(currentGrade, 100)}
        variant={isPassing ? 'success' : 'dark'}
        className="mb-2"
      />
      <div className="small">
        {isPassing
          ? intl.formatMessage(messages.projectedGradePassing, { currentGrade, passingGrade })
          : intl.formatMessage(messages.projectedGradeNotPassing, { gap, passingGrade, currentGrade })}
      </div>
    </div>
  );
};

ProjectedGrade.propTypes = {
  currentGrade: PropTypes.number.isRequired,
  passingGrade: PropTypes.number.isRequired,
};

export default ProjectedGrade;
