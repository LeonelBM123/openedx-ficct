import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/**
 * Cliente del servicio propio de TTS (services/avatar-tts). El audio se pide
 * directo a AVATAR_TTS_API_URL, sin pasar por el LMS: el LMS corre con solo 2
 * workers de uwsgi, y una síntesis tarda 5-10 s, así que proxear el audio dejaría
 * la plataforma sin workers durante cada frase del avatar. Lo único que sale del
 * LMS es un token corto (GET /api/ficct/avatar/tts-token/, autenticado), que el
 * contenedor de TTS valida sin llamar de vuelta.
 *
 * El token dura varios minutos: se cachea en el módulo y se reusa entre síntesis,
 * en vez de pedir uno nuevo por cada frase.
 *
 * Contrato del backend (POST {AVATAR_TTS_API_URL}):
 *   headers:  Authorization: Bearer <token>
 *   request:  { text: string, voice: 'dora' | 'alex' | 'santa' }
 *   response: { audio_base64: string (WAV), visemes: Array<{ viseme, start, duration }> }
 *
 * Devuelve la misma forma que consumía el servicio de Azure para que
 * AvatarTour.jsx no necesite lógica de reproducción distinta:
 *   { audioData: ArrayBuffer (WAV), lipSyncData: Array<{ start, end, value }>, duration }
 * `value` es la letra del blendshape ARKit (A–H) que Avatar.jsx aplica.
 */

// Margen antes del vencimiento real para pedir un token nuevo, así una síntesis que
// arranca justo antes del corte no se queda con un token que vence a mitad de vuelo.
const TOKEN_REFRESH_MARGIN_SECONDS = 30;

let cachedToken = null; // { token, expiresAt } — expiresAt en epoch ms

async function fetchToken() {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/api/ficct/avatar/tts-token/`,
  );
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (data.expires_in - TOKEN_REFRESH_MARGIN_SECONDS) * 1000,
  };
  return cachedToken.token;
}

async function getToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  return fetchToken();
}

function synthesizeRequest(apiUrl, text, voice, token) {
  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, voice }),
  });
}

export async function textToSpeech(text, voice = 'dora') {
  const apiUrl = getConfig().AVATAR_TTS_API_URL;
  if (!apiUrl) {
    throw new Error('AVATAR_TTS_API_URL no está configurada.');
  }

  const token = await getToken();
  let response = await synthesizeRequest(apiUrl, text, voice, token);

  if (response.status === 401) {
    // El token cacheado pudo vencer justo entre que se leyó y se usó (o el
    // contenedor de TTS se reinició con otro secreto): se pide uno nuevo y se
    // reintenta una sola vez.
    const freshToken = await getToken(true);
    response = await synthesizeRequest(apiUrl, text, voice, freshToken);
  }

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
