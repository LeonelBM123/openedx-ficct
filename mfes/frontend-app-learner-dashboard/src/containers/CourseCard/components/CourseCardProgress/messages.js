import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  progressLabel: {
    id: 'learner-dash.courseCard.progress.label',
    description: 'Porcentaje de avance del curso mostrado sobre la barra de progreso',
    defaultMessage: '{percent} % completado',
  },
  progressBarAlt: {
    id: 'learner-dash.courseCard.progress.barAlt',
    description: 'Texto accesible de la barra de progreso del curso',
    defaultMessage: 'Progreso del curso: {percent} % completado',
  },
});

export default messages;
