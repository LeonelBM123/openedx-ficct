import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useSelector } from 'react-redux';

import { useContextId } from '../../../data/hooks';
import { useModel } from '../../../generic/model-store';

import ContinueCard from './ContinueCard';
import KpiRow from './KpiRow';
import MilestoneBadges from './MilestoneBadges';
import ProjectedGrade from './ProjectedGrade';
import useProgressHighlightsData from './useProgressHighlightsData';

const getPercent = (completed, total) => (total > 0 ? Math.round((completed / total) * 100) : 0);

const getNextDueDate = (courseDateBlocks) => {
  const now = new Date();
  const upcomingDueDates = courseDateBlocks
    .filter((block) => block.dateType === 'assignment-due-date' && new Date(block.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcomingDueDates.length ? new Date(upcomingDueDates[0].date) : null;
};

const ProgressHighlights = () => {
  const courseId = useContextId();
  const { targetUserId } = useSelector((state) => state.courseHome);
  const { userId } = getAuthenticatedUser();
  const viewingOtherStudentsProgressPage = !!(targetUserId && targetUserId !== userId);

  const {
    completionSummary: { completeCount, incompleteCount, lockedCount },
    courseGrade: { percent },
    gradingPolicy: { gradeRange },
  } = useModel('progress', courseId);

  const { outline, dates } = useProgressHighlightsData(courseId, viewingOtherStudentsProgressPage);

  const totalUnits = completeCount + incompleteCount + lockedCount;
  const currentGrade = Number((percent * 100).toFixed(0));
  const passingGrade = Number((Math.min(...Object.values(gradeRange)) * 100).toFixed(0));
  const percentComplete = getPercent(completeCount, totalUnits);
  const courseDateBlocks = dates.courseDateBlocks || [];
  const nextDueDate = getNextDueDate(courseDateBlocks);

  return (
    <div className="mb-4" data-testid="progress-highlights">
      {!viewingOtherStudentsProgressPage && (
        <ContinueCard
          resumeCourseUrl={outline.resumeCourse?.url}
          hasVisitedCourse={outline.resumeCourse?.hasVisitedCourse}
        />
      )}
      <KpiRow
        completedUnits={completeCount}
        totalUnits={totalUnits}
        currentGrade={currentGrade}
        passingGrade={passingGrade}
        nextDueDate={nextDueDate}
      />
      <div className="row w-100 m-0">
        <div className="col-12 col-md-6 p-0 pr-md-3">
          <ProjectedGrade currentGrade={currentGrade} passingGrade={passingGrade} />
        </div>
        <div className="col-12 col-md-6 p-0">
          <MilestoneBadges percentComplete={percentComplete} />
        </div>
      </div>
    </div>
  );
};

export default ProgressHighlights;
