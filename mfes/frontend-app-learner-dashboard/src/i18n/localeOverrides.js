// Overrides puntuales de traducción que no dependen del pull_translations.
//
// 'header.links.courses' pertenece a @edx/frontend-component-header, pero este MFE
// no usa su menú por defecto: LearnerDashboardHeader arma su propio mainMenuItems con
// el mensaje 'learnerVariantDashboard.course' (ver src/containers/LearnerDashboardHeader/messages.js),
// cuya traducción oficial en es-419 es "cursos" en minúscula. Ese es el que hay que pisar.
export default {
  'es-419': {
    'header.links.courses': 'Cursos',
    'learnerVariantDashboard.course': 'Cursos',
  },
};
