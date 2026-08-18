import { useState, useEffect } from 'react';
import { useReveal } from '../hooks/useReveal';

// Las noticias las genera scripts/scrape_noticias.py desde www.uagrm.edu.bo y las deja
// en public/noticias.json. No se piden a la UAGRM desde el navegador porque su sitio no
// manda Access-Control-Allow-Origin y CORS bloquearía el fetch; este JSON se sirve desde
// el mismo origen que la landing.
const FUENTE = '/noticias.json';
const VISIBLES_INICIALES = 6;

const News = () => {
    const [noticias, setNoticias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [displayCount, setDisplayCount] = useState(VISIBLES_INICIALES);

    useEffect(() => {
        let cancelado = false;

        fetch(FUENTE)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (cancelado) return;
                // Las retiradas siguen en el archivo como registro, pero no se muestran:
                // son noticias que la UAGRM bajó de su sitio.
                setNoticias(Array.isArray(data) ? data.filter((n) => !n.retirada) : []);
            })
            .catch(() => {
                if (!cancelado) setNoticias([]);
            })
            .finally(() => {
                if (!cancelado) setCargando(false);
            });

        return () => { cancelado = true; };
    }, []);

    // Las tarjetas se montan después del escaneo inicial de HomePage, así que sin este
    // re-escaneo se quedarían en opacity:0 ocupando espacio pero sin verse.
    // displayCount también cuenta: "Ver todas" agrega tarjetas nuevas.
    useReveal([noticias, displayCount]);

    // Sin datos no se renderiza la sección: mejor que mostrarla vacía o con contenido viejo.
    if (cargando || noticias.length === 0) return null;

    return (
        <section id="noticias" className="news-section">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">Últimas <span className="highlight-text">Noticias</span></h2>
                    <p className="section-subtitle">Mantente informado con los avisos y comunicados oficiales de la facultad.</p>
                </div>
                <div className="news-grid" id="newsGrid">
                    {noticias.slice(0, displayCount).map((noticia) => (
                        <div key={noticia.enlace} className="news-card reveal">
                            <div className="news-image-wrapper">
                                <span className={`news-category ${noticia.categoria.toLowerCase()}`}>{noticia.categoria}</span>
                                <img src={noticia.imagen} alt={noticia.titulo} className="news-image" onError={(e) => { e.target.src = './assets/portada.jfif'; }} />
                            </div>
                            <div className="news-content">
                                <div className="news-date"><i className="ph ph-calendar-blank"></i> {noticia.fecha}</div>
                                <h3 className="news-title">{noticia.titulo}</h3>
                                <a href={noticia.enlace} target="_blank" rel="noreferrer" className="news-link">Leer más <i className="ph ph-arrow-right"></i></a>
                            </div>
                        </div>
                    ))}
                </div>
                {displayCount < noticias.length && (
                    <div className="text-center mt-4">
                        <button onClick={() => setDisplayCount(noticias.length)} className="btn btn-outline-primary">Ver todas las noticias</button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default News;
