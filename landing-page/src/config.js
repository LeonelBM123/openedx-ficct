/**
 * Enlaces a la plataforma Open edX.
 *
 * No pueden ser fijos: la landing se sirve en www.<LMS_HOST>, el LMS en <LMS_HOST> y los
 * MFEs en apps.<LMS_HOST>, y ese host cambia al migrar de servidor. A diferencia de los
 * MFEs, la landing no pasa por Tutor, asi que `tutor config save --set LMS_HOST=...` no
 * la toca: hasta ahora los enlaces estaban escritos a mano y habrian seguido apuntando al
 * servidor viejo.
 *
 * Se derivan del host donde esta servida la propia landing (le sacamos el `www.` y
 * anteponemos `apps.`), asi que funciona en cualquier servidor sin editar codigo. El
 * protocolo tambien sale de window.location: al activar HTTPS los enlaces pasan a https
 * solos, en vez de quedar como mixed content.
 *
 * Si algun dia los dominios dejan de seguir esa convencion (por ejemplo, landing en el
 * apex y LMS en campus.*), se fuerzan al construir:
 *
 *   VITE_LMS_BASE_URL=https://campus.ficct.uagrm.edu.bo \
 *   VITE_MFE_BASE_URL=https://apps.ficct.uagrm.edu.bo \
 *   npm run build
 */
const { protocol, hostname, port } = window.location;
const host = hostname.replace(/^www\./, '');
const suffix = port ? `:${port}` : '';

export const LMS_BASE_URL = import.meta.env.VITE_LMS_BASE_URL || `${protocol}//${host}${suffix}`;
export const MFE_BASE_URL = import.meta.env.VITE_MFE_BASE_URL || `${protocol}//apps.${host}${suffix}`;

export const platformLinks = {
    catalog: `${MFE_BASE_URL}/catalog/`,
    login: `${MFE_BASE_URL}/authn/login`,
    dashboard: `${MFE_BASE_URL}/learner-dashboard/`,
};
