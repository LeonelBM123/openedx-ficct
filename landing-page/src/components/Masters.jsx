const Masters = () => {
    return (
        <section id="posgrado" className="masters-section">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">Impulsa tu Carrera con una <span className="highlight-text">Maestría</span></h2>
                    <p className="section-subtitle">Programas posgraduales especializados diseñados para profesionales que buscan profundizar su experiencia en campos tecnológicos de vanguardia.</p>
                </div>

                <div className="masters-grid">
                    <div className="master-card reveal">
                        <img src="./assets/Msc_direccion_sw.webp" alt="Maestría en Dirección Estratégica" className="master-image" />
                        <div className="master-content">
                            <span className="master-tag">Negocios y Software</span>
                            <h3 className="master-title">M.S. en Dirección Estratégica en Ing. de Software</h3>
                            <p className="master-desc">Gestión estratégica de proyectos y liderazgo tecnológico enfocado en el desarrollo de software a gran escala.</p>
                            <a href="mailto:soporte@ficct.uagrm.edu.bo" className="btn btn-outline-primary btn-sm">Solicitar Información</a>
                        </div>
                    </div>

                    <div className="master-card reveal">
                        <img src="./assets/Msc_seguridad.jfif" alt="Maestría en Seguridad Informática" className="master-image" />
                        <div className="master-content">
                            <span className="master-tag">Ciberseguridad</span>
                            <h3 className="master-title">M.S. en Seguridad Informática</h3>
                            <p className="master-desc">Protección avanzada de sistemas críticos, auditoría de ciberseguridad y gestión estratégica de riesgos digitales.</p>
                            <a href="mailto:soporte@ficct.uagrm.edu.bo" className="btn btn-outline-primary btn-sm">Solicitar Información</a>
                        </div>
                    </div>

                    <div className="master-card reveal">
                        <img src="./assets/Msc_data_ia.jpg" alt="Maestría en Ciencia de Datos" className="master-image" />
                        <div className="master-content">
                            <span className="master-tag">IA & Data</span>
                            <h3 className="master-title">M.S. en Ciencia de Datos e Inteligencia Artificial</h3>
                            <p className="master-desc">Gestión y análisis de grandes volúmenes de información utilizando técnicas modernas de IA y machine learning.</p>
                            <a href="mailto:soporte@ficct.uagrm.edu.bo" className="btn btn-outline-primary btn-sm">Solicitar Información</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Masters;
