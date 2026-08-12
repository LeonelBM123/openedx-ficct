import Stats from './Stats';

const Hero = () => {
    return (
        <section id="inicio" className="hero">
            <div className="hero-overlay"></div>
            <div className="container hero-content">
                <span className="badge">Excelencia Académica UAGRM</span>
                <h1 className="hero-title">Facultad de Ingeniería en <span>Ciencias de la Computación</span> y Telecomunicaciones</h1>
                <p className="hero-subtitle">Primera facultad de su tipo en Bolivia. Formando profesionales competentes y líderes para el desarrollo tecnológico de la región y del mundo.</p>
                <div className="hero-actions">
                    <a href="#pregrado" className="btn btn-primary">Explorar Carreras</a>
                    <a href="#nosotros" className="btn btn-outline">Conoce Más</a>
                </div>
                <Stats />
            </div>
        </section>
    );
};

export default Hero;
