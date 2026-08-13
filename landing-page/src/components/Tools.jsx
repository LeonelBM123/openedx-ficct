import { platformLinks } from '../config';

const Tools = () => {
    return (
        <section id="herramientas" className="tools-section bg-light">
            <div className="container text-center">
                <h2 className="section-title">Herramientas Digitales</h2>
                <p className="section-subtitle">Plataformas y recursos para la comunidad estudiantil y docente.</p>
                
                <div className="tools-grid">
                    <a href={platformLinks.dashboard} rel="noopener noreferrer" className="tool-card reveal">
                        <i className="ph ph-chalkboard-teacher"></i>
                        <span>Aula Virtual</span>
                    </a>
                    <a href="#" className="tool-card reveal">
                        <i className="ph ph-books"></i>
                        <span>Biblioteca Digital</span>
                    </a>
                    <a href="#" className="tool-card reveal">
                        <i className="ph ph-file-text"></i>
                        <span>Trámites Online</span>
                    </a>
                    <a href="#" className="tool-card reveal">
                        <i className="ph ph-envelope-simple"></i>
                        <span>Correo Institucional</span>
                    </a>
                    <a href="#" className="tool-card reveal">
                        <i className="ph ph-code"></i>
                        <span>Fábrica de Software</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Tools;
