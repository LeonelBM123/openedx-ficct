import { StrictDict } from 'utils';

import { getConfig } from '@edx/frontend-platform';

const getBaseUrl = () => getConfig().LMS_BASE_URL;

export const getApiUrl = () => (`${getConfig().LMS_BASE_URL}/api`);

const getInitApiUrl = () => (`${getApiUrl()}/learner_home/init`);

const event = () => `${getBaseUrl()}/event`;
const courseUnenroll = () => `${getBaseUrl()}/change_enrollment`;
const updateEmailSettings = () => `${getApiUrl()}/change_email_settings`;
const entitlementEnrollment = (uuid) => `${getApiUrl()}/entitlements/v1/entitlements/${uuid}/enrollments`;

// if url is null or absolute, return it as is
export const updateUrl = (base, url) => ((url == null || url.startsWith('http://') || url.startsWith('https://')) ? url : `${base}${url}`);

export const baseAppUrl = (url) => updateUrl(getBaseUrl(), url);
export const learningMfeUrl = (url) => updateUrl(getConfig().LEARNING_BASE_URL, url);

// static view url
const programsUrl = () => baseAppUrl('/dashboard/programs');

export const creditPurchaseUrl = (courseId) => {
  const config = getConfig();
  return config.CREDIT_PURCHASE_URL
    ? `${config.CREDIT_PURCHASE_URL}/${courseId}/`
    : `${config.ECOMMERCE_BASE_URL}/credit/checkout/${courseId}/`;
};
export const creditRequestUrl = (providerId) => `${getApiUrl()}/credit/v1/providers/${providerId}/request/`;

// Cursos mas demandados de la plataforma (API propia de FICCT, ver apps-custom/ficct-dashboard-api).
const popularCourses = () => `${getApiUrl()}/ficct/popular-courses/`;

// Progreso del alumno en un curso. Es el BFF que usa el MFE learning para su pestana
// de "Progreso"; trae completion_summary con las unidades completas e incompletas.
const courseProgress = (courseId) => `${getApiUrl()}/course_home/progress/${courseId}/`;

// Studio (CMS) endpoints para el flujo de "course creator" / solicitud de instructor.
// STUDIO_BASE_URL llega en runtime vía MFE_CONFIG.
const getStudioBaseUrl = () => getConfig().STUDIO_BASE_URL;
const requestCourseCreator = () => `${getStudioBaseUrl()}/request_course_creator`;
const courseCreatorStatus = () => `${getStudioBaseUrl()}/api/contentstore/v1/home`;

export default StrictDict({
  getApiUrl,
  baseAppUrl,
  courseCreatorStatus,
  courseProgress,
  courseUnenroll,
  creditPurchaseUrl,
  creditRequestUrl,
  entitlementEnrollment,
  event,
  getInitApiUrl,
  learningMfeUrl,
  popularCourses,
  programsUrl,
  requestCourseCreator,
  updateEmailSettings,
});
