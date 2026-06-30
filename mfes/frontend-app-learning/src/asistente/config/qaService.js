import { getConfig } from '@edx/frontend-platform';

/**
 * Cliente del proxy de preguntas libres. El backend (servicio Modal externo)
 * guarda la key de Azure OpenAI del lado del servidor y nunca la expone al
 * navegador; el frontend solo envía la pregunta y recibe la respuesta.
 *
 * Contrato:
 *   POST {AVATAR_QA_API_URL}  Body: { pregunta, contexto? }
 *   Resp: { respuesta: string }
 */
export async function askAssistant(pregunta, contexto) {
  const apiUrl = getConfig().AVATAR_QA_API_URL;
  if (!apiUrl) {
    throw new Error('AVATAR_QA_API_URL no está configurada.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta, contexto }),
  });

  if (!response.ok) {
    throw new Error(`El servicio de preguntas respondió con estado ${response.status}`);
  }

  const data = await response.json();
  return data.respuesta;
}

export default { askAssistant };
