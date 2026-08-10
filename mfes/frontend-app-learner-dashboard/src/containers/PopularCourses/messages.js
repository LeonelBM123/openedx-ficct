import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  sectionTitle: {
    id: 'learner-dash.popularCourses.title',
    description: 'Titulo de la seccion de cursos mas demandados',
    defaultMessage: 'Cursos más demandados',
  },
  enrolledCount: {
    id: 'learner-dash.popularCourses.enrolledCount',
    description: 'Cantidad de estudiantes inscritos en un curso',
    defaultMessage: '{count, plural, one {# inscrito} other {# inscritos}}',
  },
  viewCourse: {
    id: 'learner-dash.popularCourses.viewCourse',
    description: 'Boton para ver la pagina del curso',
    defaultMessage: 'Ver curso',
  },
  courseImageAlt: {
    id: 'learner-dash.popularCourses.courseImageAlt',
    description: 'Texto alternativo de la imagen del curso',
    defaultMessage: 'Imagen del curso',
  },
});

export default messages;
