import { useEffect, useState } from 'react';
import { logError } from '@edx/frontend-platform/logging';

import { getDatesTabData, getOutlineTabData } from '../../data/api';

const EMPTY = {};

/**
 * The progress page only loads the "progress" model by default. The highlights section above it
 * (continue card, KPIs, upcoming dates) also needs outline data (for resumeCourse) and dates data
 * (for the next due date / upcoming dates list), which normally only get fetched when the learner
 * visits the Outline or Dates tab -- via fetchOutlineTab/fetchDatesTab, dispatched by TabContainer.
 *
 * Those two thunks were tried here first and caused an infinite reload loop: they write into the
 * same shared `courseHome.courseStatus`/`courseId` state that TabPage uses to decide whether to
 * render its children at all. Dispatching them again from an already "loaded" progress page reset
 * that status to "loading", which unmounted this component, which re-mounted once the fetch
 * resolved, re-triggering the same dispatch forever. Calling the underlying API functions
 * directly here (same approach useProgressSummary.js already uses for the navigation endpoint)
 * fetches the same data without touching that shared status at all.
 */
export default function useProgressHighlightsData(courseId, skip = false) {
  const [outline, setOutline] = useState(EMPTY);
  const [dates, setDates] = useState(EMPTY);

  useEffect(() => {
    if (skip || !courseId) {
      setOutline(EMPTY);
      setDates(EMPTY);
      return undefined;
    }

    let cancelled = false;

    getOutlineTabData(courseId)
      .then((data) => { if (!cancelled) { setOutline(data || EMPTY); } })
      .catch((error) => { logError(error); if (!cancelled) { setOutline(EMPTY); } });

    getDatesTabData(courseId)
      .then((data) => { if (!cancelled) { setDates(data || EMPTY); } })
      .catch((error) => { logError(error); if (!cancelled) { setDates(EMPTY); } });

    return () => { cancelled = true; };
  }, [courseId, skip]);

  return { outline, dates };
}
