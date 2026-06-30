import { getConfig } from '@edx/frontend-platform';

/**
 * Cliente del servicio externo de TTS (Python/Modal). Solo conoce una URL
 * pública, no secretos: la síntesis de voz ocurre del lado del servidor.
 *
 * Respuesta esperada del backend:
 *   { audioUrl: string, visemes: Array<{ time: number, viseme: string }> }
 * `visemes` son marcas de tiempo (segundos) con el blendshape ARKit a aplicar
 * en Avatar.jsx para el lip-sync.
 */
export async function synthesizeSpeech(text) {
  const apiUrl = getConfig().AVATAR_TTS_API_URL;
  if (!apiUrl) {
    throw new Error('AVATAR_TTS_API_URL no está configurada.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: text }),
  });

  if (!response.ok) {
    throw new Error(`El servicio de TTS respondió con estado ${response.status}`);
  }

  return response.json();
}

export default { synthesizeSpeech };
