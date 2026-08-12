import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  progressSummary: {
    id: 'progress.progressSummary',
    defaultMessage: 'Resumen de progreso',
    description: 'Headline for the (progress summary) section in progress tab',
  },
  progressSummaryTooltipAlt: {
    id: 'progress.progressSummary.tooltip.alt',
    defaultMessage: 'Ayuda del resumen de progreso',
    description: 'Alt text for icon which triggers (tip box) for progress summary',
  },
  progressSummaryTooltipBody: {
    id: 'progress.progressSummary.tooltip.body',
    defaultMessage: 'Muestra cuánto contenido has completado en cada sección del curso. '
      + 'Una unidad se marca como completada cuando revisas todo su contenido. '
      + 'Ten en cuenta que puede haber contenido que aún no ha sido publicado.',
    description: 'The content of (tip box) for the progress summary section',
  },
  section: {
    id: 'progress.progressSummary.section',
    defaultMessage: 'Sección',
    description: 'Headline for (section name column) in progress summary table',
  },
  units: {
    id: 'progress.progressSummary.units',
    defaultMessage: 'Unidades',
    description: 'Headline for (completed units column) in progress summary table',
  },
  progressPercent: {
    id: 'progress.progressSummary.progress',
    defaultMessage: 'Avance',
    description: 'Headline for (progress percentage column) in progress summary table',
  },
  totalProgress: {
    id: 'progress.progressSummary.total',
    defaultMessage: 'Avance total del curso',
    description: 'Label for the total row in the progress summary table footer',
  },
  unitsValue: {
    id: 'progress.progressSummary.units.value',
    defaultMessage: '{completed} / {total}',
    description: 'Number of completed units out of the total units of a section',
  },
});

export default messages;
