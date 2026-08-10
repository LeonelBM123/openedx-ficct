import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  progressLabel: {
    id: 'learner-dash.courseCard.progress.label',
    description: 'Etiqueta a la izquierda de la barra de progreso del curso',
    defaultMessage: 'Progreso',
  },
  progressPercent: {
    id: 'learner-dash.courseCard.progress.percent',
    description: 'Porcentaje de avance mostrado a la derecha de la barra de progreso',
    defaultMessage: '{percent} %',
  },
  courseCompleted: {
    id: 'learner-dash.courseCard.progress.completed',
    description: 'Etiqueta que reemplaza a "Progreso" cuando el curso esta al 100 %',
    defaultMessage: '¡Curso completado!',
  },
  progressBarAlt: {
    id: 'learner-dash.courseCard.progress.barAlt',
    description: 'Texto accesible de la barra de progreso del curso',
    defaultMessage: 'Progreso del curso: {percent} % completado',
  },
});

export default messages;
