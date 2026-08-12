import { useEffect, useState } from 'react';
import { logError } from '@edx/frontend-platform/logging';

import { getCourseOutline } from '../../../courseware/data/api';

/**
 * Fetches the course navigation outline to get completion data per section.
 *
 * The progress endpoint only exposes global completion counts, so the per section breakdown comes
 * from the same endpoint the courseware sidebar uses (/api/course_home/v1/navigation/).
 *
 * @param {string} courseId
 * @param {boolean} skip - Skip the request (the endpoint always answers for the requesting user,
 *                         so it must not be used when staff is viewing another learner's progress).
 * @returns {null|Array} null while loading, otherwise the list of sections (may be empty).
 */
export default function useProgressSummary(courseId, skip = false) {
  const [sections, setSections] = useState(null);

  useEffect(() => {
    if (skip) {
      setSections([]);
      return undefined;
    }

    let cancelled = false;
    setSections(null);

    getCourseOutline(courseId)
      .then((outline) => {
        if (!cancelled) {
          setSections(outline ? Object.values(outline.sections) : []);
        }
      })
      .catch((error) => {
        logError(error);
        if (!cancelled) {
          setSections([]);
        }
      });

    return () => { cancelled = true; };
  }, [courseId, skip]);

  return sections;
}
