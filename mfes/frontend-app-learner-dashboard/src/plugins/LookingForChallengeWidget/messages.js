import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  lookingForChallengePrompt: {
    id: 'WidgetSidebar.lookingForChallengePrompt',
    defaultMessage: 'Looking for a new challenge?',
    description: 'Prompt user for new challenge',
  },
  findCoursesButton: {
    id: 'WidgetSidebar.findCoursesButton',
    defaultMessage: 'Find a course {arrow}',
    description: 'Button to explore more courses',
  },
  becomeInstructorButton: {
    id: 'WidgetSidebar.becomeInstructorButton',
    defaultMessage: 'Conviértete en instructor {arrow}',
    description: 'Button for a learner to request course creator (instructor) access',
  },
  instructorRequestPending: {
    id: 'WidgetSidebar.instructorRequestPending',
    defaultMessage: 'Tu solicitud para ser instructor está pendiente de aprobación.',
    description: 'Status text shown when the instructor (course creator) request is pending or denied',
  },
  goToStudioButton: {
    id: 'WidgetSidebar.goToStudioButton',
    defaultMessage: 'Ir a Studio {arrow}',
    description: 'Link for a learner who already has course creator access to go to Studio',
  },
});

export default messages;
