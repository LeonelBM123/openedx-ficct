import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useModel } from '../../../generic/model-store';
import { fetchDatesTab, fetchOutlineTab } from '../../data';

/**
 * The progress page only loads the "progress" model by default. The highlights section above it
 * (continue card, KPIs, upcoming dates) also needs the "outline" model (for resumeCourse) and the
 * "dates" model (for the next due date / upcoming dates list), which normally only get fetched
 * when the learner visits the Outline or Dates tab. This dispatches those two fetches on mount so
 * the data is available even when the learner lands directly on /progress.
 *
 * Like the per section breakdown in ProgressSummary, resumeCourse/dates are scoped to the
 * requesting user, so they are skipped when staff is viewing another learner's progress.
 */
export default function useProgressHighlightsData(courseId, skip) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (skip || !courseId) {
      return;
    }
    dispatch(fetchOutlineTab(courseId));
    dispatch(fetchDatesTab(courseId));
  }, [dispatch, courseId, skip]);

  const outline = useModel('outline', courseId);
  const dates = useModel('dates', courseId);

  return { outline: skip ? {} : outline, dates: skip ? {} : dates };
}
