import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  continueCardTitle: {
    id: 'progress.ficct.highlights.continueCard.title',
    defaultMessage: 'Continuar donde lo dejaste',
    description: 'Title of the card that links to the next pending unit',
  },
  continueCardResumeButton: {
    id: 'progress.ficct.highlights.continueCard.resume',
    defaultMessage: 'Reanudar curso',
    description: 'Button label to resume the course from the last visited unit',
  },
  continueCardStartButton: {
    id: 'progress.ficct.highlights.continueCard.start',
    defaultMessage: 'Comenzar curso',
    description: 'Button label to start the course when the learner has not visited it yet',
  },
  kpiUnitsCompleted: {
    id: 'progress.ficct.highlights.kpi.unitsCompleted',
    defaultMessage: 'Unidades completadas',
    description: 'KPI label for the number of completed units',
  },
  kpiCurrentGrade: {
    id: 'progress.ficct.highlights.kpi.currentGrade',
    defaultMessage: 'Calificación actual',
    description: 'KPI label for the current weighted grade',
  },
  kpiPassingGrade: {
    id: 'progress.ficct.highlights.kpi.passingGrade',
    defaultMessage: 'Nota para aprobar',
    description: 'KPI label for the minimum passing grade of the course',
  },
  kpiNextDueDate: {
    id: 'progress.ficct.highlights.kpi.nextDueDate',
    defaultMessage: 'Próxima entrega',
    description: 'KPI label for the next assignment due date',
  },
  kpiNextDueDateNone: {
    id: 'progress.ficct.highlights.kpi.nextDueDate.none',
    defaultMessage: 'Sin fechas próximas',
    description: 'Shown in the next due date KPI when there are no upcoming due dates',
  },
  projectedGradeTitle: {
    id: 'progress.ficct.highlights.projectedGrade.title',
    defaultMessage: 'Calificación proyectada',
    description: 'Title of the projected grade widget',
  },
  projectedGradePassing: {
    id: 'progress.ficct.highlights.projectedGrade.passing',
    defaultMessage: 'Vas aprobando el curso con {currentGrade}%, por encima del {passingGrade}% necesario.',
    description: 'Projected grade message shown when the learner is currently passing',
  },
  projectedGradeNotPassing: {
    id: 'progress.ficct.highlights.projectedGrade.notPassing',
    defaultMessage: 'Te faltan {gap} puntos porcentuales para llegar al {passingGrade}% necesario para aprobar (llevas {currentGrade}%).',
    description: 'Projected grade message shown when the learner is not currently passing',
  },
  milestonesTitle: {
    id: 'progress.ficct.highlights.milestones.title',
    defaultMessage: 'Hitos de avance',
    description: 'Title of the milestone badges row',
  },
  milestoneLabel: {
    id: 'progress.ficct.highlights.milestones.label',
    defaultMessage: '{percent}% completado',
    description: 'Label for a single milestone badge (25/50/100 percent of the course completed)',
  },
  milestoneAchievedAltText: {
    id: 'progress.ficct.highlights.milestones.achieved.alt',
    defaultMessage: 'Alcanzado',
    description: 'Accessible text marking a milestone badge as already achieved',
  },
});

export default messages;
