const Programs = () => {
    return (
        <section id="pregrado" className="programs-section bg-light">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">Oferta <span className="highlight-text">Académica</span></h2>
                    <p className="section-subtitle">Programas de pregrado diseñados para formar líderes en tecnología e innovación. Descubre tu pasión en nuestras 4 carreras.</p>
                </div>
                
                <div className="programs-grid">
                    <div className="program-card reveal">
                        <div className="program-bg" style={{ backgroundImage: "url('./assets/informatica.jpg')" }}></div>
                        <div className="program-overlay"></div>
                        <div className="program-content">
                            <div className="program-icon-wrapper">
                                <i className="ph ph-laptop"></i>
                            </div>
                            <h3 className="program-title">Ingeniería Informática</h3>
                            <div className="program-reveal">
                                <p className="program-desc">Desarrollo de soluciones informáticas, software y eficiencia tecnológica para todo tipo de organizaciones.</p>
                                <a href="malla_curricular.html" className="program-link btn-link">Ver plan de estudios <i className="ph ph-arrow-right"></i></a>
                            </div>
                        </div>
                    </div>

                    <div className="program-card reveal">
                        <div className="program-bg" style={{ backgroundImage: "url('./assets/sistemas.jpg')" }}></div>
                        <div className="program-overlay"></div>
                        <div className="program-content">
                            <div className="program-icon-wrapper">
                                <i className="ph ph-share-network"></i>
                            </div>
                            <h3 className="program-title">Ingeniería en Sistemas</h3>
                            <div className="program-reveal">
                                <p className="program-desc">Análisis, diseño y optimización integral de sistemas de información complejos y arquitectura de datos.</p>
                                <a href="malla_sistemas.html" className="program-link btn-link">Ver plan de estudios <i className="ph ph-arrow-right"></i></a>
                            </div>
                        </div>
                    </div>

                    <div className="program-card reveal">
                        <div className="program-bg" style={{ backgroundImage: "url('./assets/redes.jpg')" }}></div>
                        <div className="program-overlay"></div>
                        <div className="program-content">
                            <div className="program-icon-wrapper">
                                <i className="ph ph-wifi-high"></i>
                            </div>
                            <h3 className="program-title">Ing. en Redes y Telecom.</h3>
                            <div className="program-reveal">
                                <p className="program-desc">Diseño, implementación y mantenimiento de redes de comunicación de alto rendimiento e infraestructura moderna.</p>
                                <a href="#" className="program-link btn-link">Ver plan de estudios <i className="ph ph-arrow-right"></i></a>
                            </div>
                        </div>
                    </div>

                    <div className="program-card reveal">
                        <div className="program-bg" style={{ backgroundImage: "url('./assets/robotica.jpg')" }}></div>
                        <div className="program-overlay"></div>
                        <div className="program-content">
                            <div className="program-icon-wrapper">
                                <i className="ph ph-robot"></i>
                            </div>
                            <h3 className="program-title">Ingeniería en Robótica</h3>
                            <div className="program-reveal">
                                <p className="program-desc">Desarrollo de sistemas robóticos avanzados, automatización industrial e inteligencia artificial integrada.</p>
                                <a href="#" className="program-link btn-link">Ver plan de estudios <i className="ph ph-arrow-right"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Programs;
