import { useState } from 'react';

const noticiasData = [
    {
        "id": 1,
        "titulo": "CALENDARIO ACADÉMICO SEMESTRE I - 2025",
        "categoria": "Institucional",
        "fecha": "27 de Enero de 2025",
        "enlace": "https://www.uagrm.edu.bo/noticias/calendario-acad-mico-semestre-i-2025_a8dcab",
        "imagen": "https://www.uagrm.edu.bo/img/image-not-found.jpg",
        "destacado": true
    },
    {
        "id": 2,
        "titulo": "Curso Preuniversitario (CUP) 2026",
        "categoria": "Académico",
        "fecha": "9 de Diciembre de 2025",
        "enlace": "https://www.uagrm.edu.bo/noticias/curso-preuniversitario-cup-2026_ce5c15",
        "imagen": "https://files.uagrm.edu.bo/entidad/15/image/web_Mesa_de_trabajo_1_Mesa_de_trabajo_1.jpg",
        "destacado": true
    },
    {
        "id": 3,
        "titulo": "AMPLIAMOS LAS INSCRIPCIONES AL CUP 1/2026 – Facultad de Ciencias Farmacéuticas y Bioquímicas",
        "categoria": "Académico",
        "fecha": "29 de Diciembre de 2025",
        "enlace": "https://www.uagrm.edu.bo/noticias/ampliamos-las-inscripciones-al-cup-1-2026-facultad-de-ciencias-farmaceuticas-y-bioquimicas_23d067",
        "imagen": "https://files.uagrm.edu.bo/entidad/8/image/Flyer_CUP.png",
        "destacado": true
    },
    {
        "id": 4,
        "titulo": "Semilleros FICCT: Conferencia con Juan Pablo Velasco",
        "categoria": "Institucional",
        "fecha": "8 de Abril de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/semilleros-ficct-conferencia-con-juan-pablo-velasco_78e115",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/arte.jpeg",
        "destacado": false
    },
    {
        "id": 5,
        "titulo": "📢 𝐂𝐨𝐦𝐮𝐧𝐢𝐜𝐚𝐝𝐨 𝐅𝐈𝐂𝐂𝐓 - 𝐀𝐝𝐢𝐜𝐢𝐨́𝐧 𝐲 𝐫𝐞𝐭𝐢𝐫𝐨 𝐝𝐞 𝐦𝐚𝐭𝐞𝐫𝐢𝐚𝐬",
        "categoria": "Académico",
        "fecha": "7 de Abril de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-_1ebcca",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Comunicados-01(3).jpg",
        "destacado": false
    },
    {
        "id": 6,
        "titulo": "Pasantías – Los Tajibos",
        "categoria": "Institucional",
        "fecha": "7 de Abril de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/pasantias-los-tajibos_7b2644",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/PASANTIAS-01.jpg",
        "destacado": false
    },
    {
        "id": 7,
        "titulo": "CONDOLENCIAS",
        "categoria": "Institucional",
        "fecha": "6 de Abril de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/condolencias_2b6ea0",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Necrolgicos-01.jpg",
        "destacado": false
    },
    {
        "id": 8,
        "titulo": "𝗣𝗮𝘀𝗮𝗻𝘁𝗶́𝗮𝘀 𝗱𝗶𝘀𝗽𝗼𝗻𝗶𝗯𝗹𝗲𝘀",
        "categoria": "Académico",
        "fecha": "2 de Abril de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-_01dffc",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/PASANTIAS_INFORMATICA-01.jpg",
        "destacado": false
    },
    {
        "id": 9,
        "titulo": "Seminario Informativo de Proceso de Autoevaluación",
        "categoria": "Académico",
        "fecha": "31 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/seminario-informativo-de-proceso-de-autoevaluacion-carrera-de-ingenieria-en-redes-y-telecomunicaciones_f332e2",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/2(3).jpeg",
        "destacado": false
    },
    {
        "id": 10,
        "titulo": "𝐅𝐈𝐂𝐂𝐓 𝐢𝐧𝐢𝐜𝐢𝐚 𝐮𝐧𝐚 𝐧𝐮𝐞𝐯𝐚 𝐞𝐭𝐚𝐩𝐚 𝐝𝐞 𝐭𝐫𝐚𝐛𝐚𝐣𝐨 𝐜𝐨𝐧𝐣𝐮𝐧𝐭𝐨",
        "categoria": "Institucional",
        "fecha": "31 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-_9978e2",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/1(1).jpeg",
        "destacado": false
    },
    {
        "id": 11,
        "titulo": "CAMPEONATO FÚTBOL 11 – FICCT",
        "categoria": "Institucional",
        "fecha": "31 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/campeonato-f-tbol-11-ficct_fabf06",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Futbol_FICCT-01.jpg",
        "destacado": false
    },
    {
        "id": 12,
        "titulo": "𝐍𝐮𝐞𝐯𝐨𝐬 𝐩𝐫𝐨𝐟𝐞𝐬𝐢𝐨𝐧𝐚𝐥𝐞𝐬 𝐞𝐧 𝐑𝐞𝐝𝐞𝐬 𝐲 𝐓𝐞𝐥𝐞𝐜𝐨𝐦𝐮𝐧𝐢𝐜𝐚𝐜𝐢𝐨𝐧𝐞𝐬 𝐬𝐞 𝐠𝐫𝐚𝐝𝐮́𝐚𝐧",
        "categoria": "Académico",
        "fecha": "30 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-_dfbe93",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/4(1).jpeg",
        "destacado": false
    },
    {
        "id": 13,
        "titulo": "📢 Seminario de Autoevaluación – Ing. en Redes",
        "categoria": "Institucional",
        "fecha": "30 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-seminario-de-autoevaluacion-ing-en-redes-y-telecomunicaciones_1ed221",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Seminario_Redes-07.jpg",
        "destacado": false
    },
    {
        "id": 14,
        "titulo": "📢 Convocatoria a reunión – FICCT",
        "categoria": "Institucional",
        "fecha": "26 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-convocatoria-a-reunion-ficct_4233a7",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Comunicados_6-03.jpg",
        "destacado": false
    },
    {
        "id": 15,
        "titulo": "📢 Casos Especiales Rezagados – FICCT Sistemas",
        "categoria": "Académico",
        "fecha": "20 de Marzo de 2026",
        "enlace": "https://www.uagrm.edu.bo/facultades/ficct/noticias/-casos-especiales-rezagados-ficct-sistemas_46ab02",
        "imagen": "https://files.uagrm.edu.bo/entidad/11/image/Casos_especiales-07.jpg",
        "destacado": false
    }
];

const News = () => {
    const [displayCount, setDisplayCount] = useState(6);

    const loadMore = () => {
        setDisplayCount(noticiasData.length);
    };

    return (
        <section id="noticias" className="news-section">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">Últimas <span className="highlight-text">Noticias</span></h2>
                    <p className="section-subtitle">Mantente informado con los avisos y comunicados oficiales de la facultad.</p>
                </div>
                <div className="news-grid" id="newsGrid">
                    {noticiasData.slice(0, displayCount).map((noticia) => (
                        <div key={noticia.id} className="news-card reveal">
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
                {displayCount < noticiasData.length && (
                    <div className="text-center mt-4">
                        <button onClick={loadMore} className="btn btn-outline-primary">Ver todas las noticias</button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default News;
