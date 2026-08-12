import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-grid">
                <div className="footer-brand">
                    <div className="footer-logo-wrapper">
                        <img src="/assets/LOGO_FICCT.png" alt="Logo FICCT" className="footer-logo" />
                        <h2>FICCT</h2>
                    </div>
                    <p>Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones de la UAGRM.</p>
                    <div className="social-links">
                        <a href="#"><i className="ph-fill ph-facebook-logo"></i></a>
                        <a href="#"><i className="ph-fill ph-twitter-logo"></i></a>
                        <a href="#"><i className="ph-fill ph-instagram-logo"></i></a>
                        <a href="#"><i className="ph-fill ph-linkedin-logo"></i></a>
                    </div>
                </div>
                
                <div className="footer-links">
                    <h3>Enlaces Rápidos</h3>
                    <ul>
                        <li><a href="/#inicio">Inicio</a></li>
                        <li><Link to="/nosotros">Sobre la Facultad</Link></li>
                        <li><a href="/#pregrado">Carreras de Pregrado</a></li>
                        <li><a href="/#posgrado">Programas de Posgrado</a></li>
                        <li><a href="/#noticias">Noticias y Avisos</a></li>
                        <li><a href="/#herramientas">Herramientas Digitales</a></li>
                    </ul>
                </div>
                
                <div className="footer-contact">
                    <h3>Contacto</h3>
                    <ul>
                        <li><i className="ph ph-map-pin"></i> Campus de la UAGRM, Santa Cruz, Bolivia</li>
                        <li><i className="ph ph-phone"></i> +591 (3) 123-4567</li>
                        <li><i className="ph ph-envelope"></i> info@ficct.uagrm.edu.bo</li>
                    </ul>
                    <a href="mailto:soporte@ficct.uagrm.edu.bo" className="btn btn-primary mt-4">Contactar Soporte</a>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; 2026 Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones - UAGRM. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

