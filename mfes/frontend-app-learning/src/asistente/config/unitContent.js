import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';

/**
 * Texto de la unidad que el alumno tiene abierta, para dárselo al LLM como contexto.
 *
 * Sale de la Course Blocks API (la misma que ya usa este MFE en courseware/data/api.js),
 * pidiendo solo los hijos de la unidad. Los bloques `ia_assistant` (apps-custom) aportan
 * su teoría y enunciados vía student_view_data. Los bloques HTML solo traen su contenido si el
 * LMS tiene ENABLE_HTML_XBLOCK_STUDENT_VIEW_DATA (ver tutor-plugins/avatar_asistente.py);
 * los videos traen la URL de su transcripción; los problemas solo aportan el título (el
 * enunciado no está en la API, y así no se arriesga a filtrar respuestas).
 *
 * Todo es best-effort: si algo falla se devuelve lo que se pudo, o '' -- el asistente
 * tiene que funcionar igual sin el contenido de la unidad.
 */

const MAX_UNIT_CHARS = 3000;
const MAX_TRANSCRIPT_CHARS = 2000;
const TRANSCRIPT_TIMEOUT_MS = 5000;

const cache = new Map(); // unitId -> Promise<string>

function htmlToText(html) {
  if (!html) { return ''; }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

// SRT/WebVTT -> texto corrido (sin índices ni marcas de tiempo).
function transcriptToText(raw) {
  return raw
    .replace(/^WEBVTT.*$/m, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !/^\d+$/.test(line.trim()) && !/-->/.test(line))
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTranscript(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSCRIPT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'include' });
    if (!res.ok) { return ''; }
    return transcriptToText(await res.text()).slice(0, MAX_TRANSCRIPT_CHARS);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

function pickTranscriptUrl(transcripts) {
  if (!transcripts) { return null; }
  return transcripts.es || transcripts.en || Object.values(transcripts)[0] || null;
}

async function loadUnitContent(unitId) {
  const { username } = getAuthenticatedUser() || {};
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/api/courses/v2/blocks/${unitId}`,
    {
      params: {
        username: username || '',
        depth: 'all',
        requested_fields: 'children',
        student_view_data: 'html,video,ia_assistant',
        block_types_filter: 'html,video,problem,ia_assistant',
      },
    },
  );

  const blocks = data?.blocks || {};
  const root = blocks[data?.root];
  // Orden de la unidad; si la API no devuelve `children`, el orden de la respuesta.
  const ordered = (root?.children || Object.keys(blocks))
    .map((id) => blocks[id])
    .filter((b) => b && b.id !== data?.root);

  const parts = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const block of ordered) {
    const title = block.display_name ? `${block.display_name}: ` : '';
    const svd = block.student_view_data || {};
    if (block.type === 'html' && svd.html) {
      const text = htmlToText(svd.html);
      if (text) { parts.push(`${title}${text}`); }
    } else if (block.type === 'video') {
      const url = svd.only_on_web ? null : pickTranscriptUrl(svd.transcripts);
      // eslint-disable-next-line no-await-in-loop
      const transcript = url ? await fetchTranscript(url) : '';
      parts.push(`Video "${block.display_name || 'sin título'}"${transcript ? `, transcripción: ${transcript}` : ''}`);
    } else if (block.type === 'ia_assistant') {
      // Bloque propio (apps-custom/ia-assistant-plugin): solo teoría y enunciados.
      (svd.componentes || []).forEach((c) => {
        parts.push(`${c.nombre ? `${c.nombre}: ` : ''}${c.texto}`);
      });
    } else if (block.type === 'problem') {
      parts.push(`Ejercicio: ${block.display_name || 'sin título'}`);
    }
  }
  return parts.join('\n').slice(0, MAX_UNIT_CHARS);
}

export function getUnitContent(unitId) {
  if (!unitId) { return Promise.resolve(''); }
  if (!cache.has(unitId)) {
    const p = loadUnitContent(unitId).catch(() => {
      cache.delete(unitId); // un fallo puntual no debe quedar cacheado
      return '';
    });
    cache.set(unitId, p);
  }
  return cache.get(unitId);
}

export { MAX_UNIT_CHARS };
export default { getUnitContent };
