import { useEffect, useState } from 'react';
import { logError } from '@edx/frontend-platform/logging';

import { getCourseOutline } from '../../../courseware/data/api';

const EMPTY_OUTLINE = {
  sections: [], sequences: {}, units: {},
};

/**
 * Fetches the course navigation outline to get completion data per section.
 *
 * The progress endpoint only exposes global completion counts, so the per section breakdown comes
 * from the same endpoint the courseware sidebar uses (/api/course_home/v1/navigation/). That same
 * response also carries the sequences/units below each section, which the progress summary table
 * uses to build the "unidades del módulo" accordion with links to each unit.
 *
 * @param {string} courseId
 * @param {boolean} skip - Skip the request (the endpoint always answers for the requesting user,
 *                         so it must not be used when staff is viewing another learner's progress).
 * @returns {null|{sections: Array, sequences: Object, units: Object}} null while loading.
 */
export default function useProgressSummary(courseId, skip = false) {
  const [outline, setOutline] = useState(null);

  useEffect(() => {
    if (skip) {
      setOutline(EMPTY_OUTLINE);
      return undefined;
    }

    let cancelled = false;
    setOutline(null);

    getCourseOutline(courseId)
      .then((rawOutline) => {
        if (cancelled) {
          return;
        }
        if (!rawOutline) {
          setOutline(EMPTY_OUTLINE);
          return;
        }
        setOutline({
          sections: Object.values(rawOutline.sections),
          sequences: rawOutline.sequences,
          units: rawOutline.units,
        });
      })
      .catch((error) => {
        logError(error);
        if (!cancelled) {
          setOutline(EMPTY_OUTLINE);
        }
      });

    return () => { cancelled = true; };
  }, [courseId, skip]);

  return outline;
}
