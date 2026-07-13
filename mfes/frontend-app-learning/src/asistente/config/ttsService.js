import { getConfig } from '@edx/frontend-platform';

/**
 * Cliente del servicio externo de TTS (Python/Modal). Solo conoce una URL
 * pública, no secretos: la síntesis de voz ocurre del lado del servidor.
 *
 * Contrato del backend (POST {AVATAR_TTS_API_URL}):
 *   request:  { text: string, voice: 'dora' | 'alex' | 'santa' }
 *   response: { audio_base64: string (WAV), visemes: Array<{ viseme, start, duration }> }
 *
 * Devuelve la misma forma que consumía el servicio de Azure para que
 * AvatarTour.jsx no necesite lógica de reproducción distinta:
 *   { audioData: ArrayBuffer (WAV), lipSyncData: Array<{ start, end, value }>, duration }
 * `value` es la letra del blendshape ARKit (A–H) que Avatar.jsx aplica.
 */
export async function textToSpeech(text, voice = 'dora') {
  const apiUrl = getConfig().AVATAR_TTS_API_URL;
  if (!apiUrl) {
    throw new Error('AVATAR_TTS_API_URL no está configurada.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    throw new Error(`El servicio de TTS respondió con estado ${response.status}`);
  }

  const { audio_base64: audioB64, visemes } = await response.json();

  // base64 (WAV) -> ArrayBuffer
  const bin = atob(audioB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }

  // { viseme, start, duration } -> { start, end, value }
  const lipSyncData = (visemes || []).map((v) => ({
    start: v.start,
    end: v.start + v.duration,
    value: v.viseme,
  }));
  const duration = lipSyncData.length ? lipSyncData[lipSyncData.length - 1].end : 0;

  return { audioData: bytes.buffer, lipSyncData, duration };
}

export default { textToSpeech };
