import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

// Mismo patron que ttsService.js: token cacheado en el modulo, con margen de 30s
// antes de expirar para no arrancar una pregunta con un token a punto de vencer.
const TOKEN_REFRESH_MARGIN_SECONDS = 30;

let cachedToken = null; // { token, expiresAt } — expiresAt en epoch ms

async function fetchToken() {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/api/ficct/avatar/llm-token/`,
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

function askRequest(apiUrl, pregunta, contexto, token) {
  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pregunta, contexto }),
  });
}

// El LLM local corre fuera del LMS (ver services/avatar-llm-gateway): esta funcion
// habla directo con ese contenedor, igual que ttsService.textToSpeech habla directo
// con el contenedor de voz, para no bloquear los workers de uwsgi del LMS durante la
// inferencia.
export async function askQuestion(pregunta, contexto) {
  const apiUrl = getConfig().AVATAR_LLM_API_URL;
  if (!apiUrl) {
    throw new Error('AVATAR_LLM_API_URL no está configurada.');
  }

  const token = await getToken();
  let response = await askRequest(apiUrl, pregunta, contexto, token);

  if (response.status === 401) {
    const freshToken = await getToken(true);
    response = await askRequest(apiUrl, pregunta, contexto, freshToken);
  }

  if (!response.ok) {
    throw new Error(`El servicio de LLM local respondió con estado ${response.status}`);
  }

  const { respuesta } = await response.json();
  return respuesta;
}

export default { askQuestion };
