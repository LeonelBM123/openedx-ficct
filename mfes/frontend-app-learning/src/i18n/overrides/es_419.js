// Overrides puntuales de traducciones de Transifex que llegan rotas (p. ej. ICU
// mal escapado). Cada clave es un id de mensaje existente en messages.ts; solo se
// necesita listar los que están rotos, ya que frontend-platform hace merge con el
// catálogo descargado en vez de reemplazarlo entero.
//
// IMPORTANTE: este archivo vive fuera de src/i18n/messages/ a propósito -- esa
// carpeta se borra y se regenera por completo en cada build (`make
// pull_translations` hace `rm -rf src/i18n/messages`), así que cualquier archivo
// puesto ahí se perdería.
const es419Messages = {
  'progress.weightedGradeSummaryTooltip': 'Tu resumen de calificación ponderada bruta es {rawGrade} y se redondea a {roundedGrade}.',
};

export default es419Messages;
