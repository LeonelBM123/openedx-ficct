import React, { useState } from 'react';

import { useContextId } from '../../../../data/hooks';
import { useModel } from '../../../../generic/model-store';

import AssignmentWeightBar from './AssignmentWeightBar';
import GradeSummaryHeader from './GradeSummaryHeader';
import GradeSummaryTable from './GradeSummaryTable';

const GradeSummary = () => {
  const courseId = useContextId();

  const {
    assignmentTypeGradeSummary,
  } = useModel('progress', courseId);

  const [allOfSomeAssignmentTypeIsLocked, setAllOfSomeAssignmentTypeIsLocked] = useState(false);

  if (assignmentTypeGradeSummary.length === 0) {
    return null;
  }

  return (
    <section className="text-dark-700 mb-4">
      <GradeSummaryHeader allOfSomeAssignmentTypeIsLocked={allOfSomeAssignmentTypeIsLocked} />
      <AssignmentWeightBar assignmentTypeGradeSummary={assignmentTypeGradeSummary} />
      <GradeSummaryTable setAllOfSomeAssignmentTypeIsLocked={setAllOfSomeAssignmentTypeIsLocked} />
      <hr className="my-4 border-light-500" />
    </section>
  );
};

export default GradeSummary;
