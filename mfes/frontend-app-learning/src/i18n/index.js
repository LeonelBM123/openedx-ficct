// Se intentó en su momento sobreescribir acá traducciones es_419 rotas de Transifex
// (mergeando { 'es-419': {...} } en este array, que frontend-platform pasa tal cual a
// configure()/mergeMessages()). En la práctica esas dos correcciones nunca se vieron
// reflejadas en dos builds distintos, mientras que ids de mensaje nuevos (que no
// existen en el catálogo de Transifex) sí caen correctamente a su `defaultMessage` --
// ver progress.ficct.weightedGradeSummary(Tooltip) en course-home/progress-tab/grades/
// messages.ts. La causa exacta de por qué el catálogo cargado en runtime le gana a
// este array no se pudo confirmar sin poder correr el build localmente, así que ante
// una traducción es_419 rota la solución que sí funciona es definir un id propio con
// el texto correcto como defaultMessage, no listarlo acá.
export default [];
