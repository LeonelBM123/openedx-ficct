// eslint-disable-next-line import/prefer-default-export
export const portalTours = {
  learning: [
    {
      text: 'Hola, soy tu asistente virtual. Te voy a guiar por las secciones principales de este curso.',
      useTTS: true,
    },
    {
      text: 'Desde estos tabs accedes al contenido del curso, tu progreso, fechas importantes y las discusiones.',
      useTTS: true,
      targetDOMId: 'courseTabsNavigation',
    },
    {
      text: 'Aquí tienes el índice del curso: puedes explorar sus secciones y lecciones.',
      useTTS: true,
      targetDOMId: 'courseHome-outline',
    },
    {
      text: 'En fechas importantes puedes ver tus entregas y plazos para no atrasarte.',
      useTTS: true,
      targetDOMId: 'courseHome-dates',
    },
    {
      text: 'Y aquí tienes tu panel de progreso: arriba ves el porcentaje del curso que ya completaste y tu calificación general, con si vas aprobado o no. Más abajo se desglosa tu desempeño por tipo de actividad y por sección, para que identifiques rápido dónde te va bien y qué conviene reforzar.',
      useTTS: true,
      openStats: true,
    },
    {
      text: 'Eso es todo por ahora. Si tienes alguna duda, puedes preguntarme desde el chat en cualquier momento.',
      useTTS: true,
    },
  ],
};
