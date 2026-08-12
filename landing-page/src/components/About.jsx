import React from 'react';

const About = () => {
    const mvvItems = [
        { icon: 'ph-target', label: 'Misión', text: 'Formar profesionales competentes en computación y telecomunicaciones, capaces de contribuir al desarrollo tecnológico de la región y del país.' },
        { icon: 'ph-eye', label: 'Visión', text: 'Ser una facultad líder en educación superior en computación y telecomunicaciones, reconocida por su calidad académica y contribución a la sociedad.' },
        { icon: 'ph-star', label: 'Valores', text: 'Excelencia académica, innovación, responsabilidad social, ética y compromiso con la formación integral de nuestros estudiantes.' },
    ];

    return (
        <section id="nosotros" className="about-section">
            <div className="container about-container">
                <div className="about-text">
                    <h2 className="section-title">Comprometidos con la <span>Excelencia Académica</span></h2>
                    <p className="about-lead">La FICCT de la UAGRM es una institución académica comprometida con la formación de profesionales en áreas relacionadas con las TIC.</p>
                    <p>Desde su fundación oficial en 2012, la facultad ha evolucionado para ofrecer programas académicos de vanguardia que respondan a las demandas del entorno tecnológico actual. Con un modelo de "Fábrica de Software" y un cuerpo docente altamente capacitado, promovemos la innovación y la investigación en cada plan de estudio.</p>

                    <div className="mvv-tabs">
                        {mvvItems.map(({ icon, label, text }) => (
                            <div key={label} className="mvv-tab-item mvv-open">
                                <div className="mvv-tab-header">
                                    <div className="mvv-tab-icon">
                                        <i className={`ph ${icon}`}></i>
                                    </div>
                                    <span className="mvv-tab-label">{label}</span>
                                </div>
                                <div className="mvv-tab-body">
                                    <p>{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="about-image-wrapper">
                    <div className="about-image-decoration"></div>
                    <img src="./assets/autoridades.jpg" alt="Autoridades y vida en la FICCT" className="about-image" />
                    <div className="floating-badge">
                        <i className="ph-fill ph-check-circle"></i>
                        <span>Fábrica de Software Integrada</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
