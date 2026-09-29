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
  statusNotStarted: {
    id: 'progress.progressSummary.status.notStarted',
    defaultMessage: 'No iniciado',
    description: 'Badge shown for a course section the learner has not started yet',
  },
  statusInProgress: {
    id: 'progress.progressSummary.status.inProgress',
    defaultMessage: 'En progreso',
    description: 'Badge shown for a course section the learner has partially completed',
  },
  statusCompleted: {
    id: 'progress.progressSummary.status.completed',
    defaultMessage: 'Completado',
    description: 'Badge shown for a course section the learner has fully completed',
  },
  expandSectionAltText: {
    id: 'progress.progressSummary.section.expand.alt',
    defaultMessage: 'Ver las unidades de {sectionTitle}',
    description: 'Alt text for the button that expands a section row to list its units',
  },
  collapseSectionAltText: {
    id: 'progress.progressSummary.section.collapse.alt',
    defaultMessage: 'Ocultar las unidades de {sectionTitle}',
    description: 'Alt text for the button that collapses an expanded section row',
  },
  sectionUnitsHeading: {
    id: 'progress.progressSummary.section.units.heading',
    defaultMessage: 'Unidades',
    description: 'Heading for the list of units shown when a section row is expanded',
  },
  unitCompletedAltText: {
    id: 'progress.progressSummary.unit.completed.alt',
    defaultMessage: 'Completada',
    description: 'Accessible text marking a unit as completed in the expanded section row',
  },
  unitIncompleteAltText: {
    id: 'progress.progressSummary.unit.incomplete.alt',
    defaultMessage: 'Sin completar',
    description: 'Accessible text marking a unit as not completed in the expanded section row',
  },
});

export default messages;
