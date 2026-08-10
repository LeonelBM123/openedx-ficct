export const learnerDashboardQueryKeys = {
  all: ['learner-dashboard'] as const,
  initialize: (masqueradedUser?: string | null) => [...learnerDashboardQueryKeys.all, 'initialize', masqueradedUser] as const,
  unenrollFromCourse: () => [...learnerDashboardQueryKeys.all, 'unenrollFromCourse'] as const,
  updateEntitlementEnrollment: () => [...learnerDashboardQueryKeys.all, 'updateEntitlementEnrollment'] as const,
  deleteEntitlementEnrollment: () => [...learnerDashboardQueryKeys.all, 'deleteEntitlementEnrollment'] as const,
  updateEmailSettings: () => [...learnerDashboardQueryKeys.all, 'updateEmailSettings'] as const,
  createCreditRequest: () => [...learnerDashboardQueryKeys.all, 'createCreditRequest'] as const,
  sendConfirmEmail: (sendEmailUrl: string) => [...learnerDashboardQueryKeys.all, 'sendConfirmEmail', sendEmailUrl] as const,
  courseCreatorStatus: () => [...learnerDashboardQueryKeys.all, 'courseCreatorStatus'] as const,
  requestCourseCreator: () => [...learnerDashboardQueryKeys.all, 'requestCourseCreator'] as const,
  popularCourses: (limit: number) => [...learnerDashboardQueryKeys.all, 'popularCourses', limit] as const,
  courseProgress: (courseId: string) => [...learnerDashboardQueryKeys.all, 'courseProgress', courseId] as const,
};
