// eslint-disable-next-line import/prefer-default-export
export const portalTours = {
  learning: [
    {
      text: 'Hola, soy tu asistente virtual. Te voy a guiar por las secciones principales de este curso.',
      useAzureTTS: true,
    },
    {
      text: 'Desde estos tabs accedes al contenido del curso, tu progreso, fechas importantes y las discusiones.',
      useAzureTTS: true,
      targetDOMId: 'courseTabsNavigation',
    },
    {
      text: 'Aquí tienes el índice del curso: puedes explorar sus secciones y lecciones.',
      useAzureTTS: true,
      targetDOMId: 'courseHome-outline',
    },
    {
      text: 'En fechas importantes puedes ver tus entregas y plazos para no atrasarte.',
      useAzureTTS: true,
      targetDOMId: 'courseHome-dates',
    },
    {
      text: 'Eso es todo por ahora. Si tienes alguna duda, puedes preguntarme desde el chat en cualquier momento.',
      useAzureTTS: true,
    },
  ],
};
