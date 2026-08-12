import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useSelector } from 'react-redux';

import { useContextId } from '../../../data/hooks';
import { useModel } from '../../../generic/model-store';

import ProgressSummaryHeader from './ProgressSummaryHeader';
import ProgressSummaryTable from './ProgressSummaryTable';
import { ProgressTotalRow } from './ProgressSummaryTableFooter';
import useProgressSummary from './useProgressSummary';

const getPercent = (completed, total) => (total > 0 ? Math.round((completed / total) * 100) : 0);

const ProgressSummary = () => {
  const courseId = useContextId();
  const { targetUserId } = useSelector(state => state.courseHome);
  const { userId } = getAuthenticatedUser();

  const {
    completionSummary: {
      completeCount,
      incompleteCount,
      lockedCount,
    },
  } = useModel('progress', courseId);

  // The navigation endpoint always answers for the requesting user, so it cannot be used to show
  // the progress of the learner a staff member is looking at. In that case we only show the total,
  // which does come from the progress endpoint and is scoped to that learner.
  const viewingOtherStudentsProgressPage = !!(targetUserId && targetUserId !== userId);
  const sections = useProgressSummary(courseId, viewingOtherStudentsProgressPage);

  if (sections === null) {
    return null;
  }

  const sectionsWithProgress = sections
    .filter((section) => section.completionStat && section.completionStat.total > 0)
    .map((section) => ({
      ...section,
      percent: getPercent(section.completionStat.completed, section.completionStat.total),
    }));

  if (!sectionsWithProgress.length && !viewingOtherStudentsProgressPage) {
    // Completion tracking is off for this course, or there is nothing completable in it.
    return null;
  }

  const total = viewingOtherStudentsProgressPage
    ? {
      completed: completeCount,
      total: completeCount + incompleteCount + lockedCount,
    }
    : sectionsWithProgress.reduce((acc, section) => ({
      completed: acc.completed + section.completionStat.completed,
      total: acc.total + section.completionStat.total,
    }), { completed: 0, total: 0 });
  total.percent = getPercent(total.completed, total.total);

  return (
    <section className="text-dark-700 my-4 p-4 rounded raised-card" data-testid="progress-summary">
      <ProgressSummaryHeader />
      {sectionsWithProgress.length ? (
        <ProgressSummaryTable sections={sectionsWithProgress} total={total} />
      ) : (
        <div className="border-top border-primary bg-light-200 p-3">
          <ProgressTotalRow completed={total.completed} total={total.total} percent={total.percent} />
        </div>
      )}
    </section>
  );
};

export default ProgressSummary;
