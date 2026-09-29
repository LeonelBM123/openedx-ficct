import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  completed: {
    id: 'learning.dates.badge.completed',
    defaultMessage: 'Completed',
    description: 'shown as label for the assignments which learner has completed.',
  },
  dueNext: {
    id: 'learning.dates.badge.dueNext',
    defaultMessage: 'Due next',
    description: 'Shown as label for the assignment which date is in the future',
  },
  pastDue: {
    id: 'learning.dates.badge.pastDue',
    defaultMessage: 'Past due',
    description: 'Shown as label for the assignments which deadline has passed',
  },
  title: {
    id: 'learning.dates.title',
    defaultMessage: 'Important dates',
    description: 'The title of dates tab (course timeline).',
  },
  today: {
    id: 'learning.dates.badge.today',
    defaultMessage: 'Today',
    description: 'Label used when the scheduled date for the assignment matches the current day',
  },
  unreleased: {
    id: 'learning.dates.badge.unreleased',
    defaultMessage: 'Not yet released',
    description: 'Shown as label for assignments which date is unknown yet',
  },
  verifiedOnly: {
    id: 'learning.dates.badge.verifiedOnly',
    defaultMessage: 'Verified only',
    description: 'Shown as label for assignments which learner has no access to.',
  },
  calendarPreviousMonthAltText: {
    id: 'progress.ficct.dates.calendar.previousMonth',
    defaultMessage: 'Mes anterior',
    description: 'Alt text for the button that moves the calendar to the previous month',
  },
  calendarNextMonthAltText: {
    id: 'progress.ficct.dates.calendar.nextMonth',
    defaultMessage: 'Mes siguiente',
    description: 'Alt text for the button that moves the calendar to the next month',
  },
  calendarDayEventsAltText: {
    id: 'progress.ficct.dates.calendar.dayEvents',
    defaultMessage: '{count, plural, one {# fecha este día} other {# fechas este día}}',
    description: 'Accessible text announcing how many course dates fall on a given calendar day',
  },
});

export default messages;
