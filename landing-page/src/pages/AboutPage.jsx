import { useEffect, useState } from 'react';

const values = [
    {
        icon: 'ph-target',
        title: 'Misión',
        desc: 'Formar profesionales competentes en computación y telecomunicaciones, capaces de contribuir al desarrollo tecnológico de la región y del país.',
    },
    {
        icon: 'ph-eye',
        title: 'Visión',
        desc: 'Ser una facultad líder en educación superior en computación y telecomunicaciones, reconocida por su calidad académica y contribución a la sociedad.',
    },
    {
        icon: 'ph-star',
        title: 'Valores',
        desc: 'Excelencia académica, innovación, responsabilidad social, ética y compromiso con la formación integral de nuestros estudiantes.',
    },
];

const pillars = [
    { icon: 'ph-code', label: 'Fábrica de Software' },
    { icon: 'ph-wifi-high', label: 'Redes y Telecom' },
    { icon: 'ph-robot', label: 'Robótica' },
    { icon: 'ph-brain', label: 'Inteligencia Artificial' },
    { icon: 'ph-shield-check', label: 'Ciberseguridad' },
    { icon: 'ph-cloud', label: 'Computación en la Nube' },
];

const AboutPage = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    useEffect(() => {
        window.scrollTo({ top: 0 });

        const revealElements = document.querySelectorAll('.reveal');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        revealElements.forEach(el => revealObserver.observe(el));
        return () => revealElements.forEach(el => revealObserver.unobserve(el));
    }, []);

    return (
        <main className="about-page">
            {/* Hero Banner */}
            <section className="about-banner">
                <div className="about-banner-overlay"></div>
                <div className="container about-banner-content">
                    <span className="badge">Conoce la Facultad</span>
                    <h1 className="about-banner-title">Comprometidos con la <span>Excelencia Académica</span></h1>
                    <p className="about-banner-subtitle">
                        Primera facultad de su tipo en Bolivia, formando líderes tecnológicos desde 2012.
                    </p>
                </div>
            </section>

            {/* About Story */}
            <section className="about-story-section">
                <div className="container about-story-grid">
                    <div className="about-story-image reveal">
                        <div className="about-image-decoration"></div>
                        <img src="/assets/autoridades.jpg" alt="Autoridades FICCT" className="about-image" />
                        <div className="floating-badge">
                            <i className="ph-fill ph-check-circle"></i>
                            <span>Fábrica de Software Integrada</span>
                        </div>
                    </div>
                    <div className="about-story-text reveal">
                        <h2 className="section-title">Nuestra <span>Historia</span></h2>
                        <p className="about-lead">La FICCT de la UAGRM es una institución académica comprometida con la formación de profesionales en áreas relacionadas con las TIC.</p>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                            Desde su fundación oficial en 2012, la facultad ha evolucionado para ofrecer programas académicos de vanguardia que respondan a las demandas del entorno tecnológico actual.
                        </p>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
                            Con un modelo de "Fábrica de Software" y un cuerpo docente altamente capacitado, promovemos la innovación y la investigación en cada plan de estudio, preparando a los estudiantes para los retos del mundo digital.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission / Vision / Values */}
            <section className="about-mvv-section">
                <div className="container">
                    <div className="text-center reveal" style={{ marginBottom: '60px' }}>
                        <h2 className="section-title">Misión, Visión y <span>Valores</span></h2>
                        <p className="section-subtitle">Los principios que guían nuestro compromiso con la educación superior.</p>
                    </div>
                    <div className="about-mvv-grid">
                        {values.map((item, i) => (
                            <div
                                key={i}
                                className={`about-mvv-card reveal ${activeIndex === i ? 'active-card' : ''}`}
                                onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                            >
                                <div className="about-mvv-icon">
                                    <i className={`ph ${item.icon}`}></i>
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pillars / Areas */}
            <section className="about-pillars-section">
                <div className="container">
                    <div className="text-center reveal" style={{ marginBottom: '50px' }}>
                        <h2 className="section-title text-white">Nuestras Áreas de <span>Enfoque</span></h2>
                        <p className="section-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>Los pilares tecnológicos sobre los que construimos el futuro.</p>
                    </div>
                    <div className="about-pillars-grid">
                        {pillars.map((p, i) => (
                            <div key={i} className="about-pillar-card reveal">
                                <i className={`ph ${p.icon}`}></i>
                                <span>{p.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default AboutPage;
