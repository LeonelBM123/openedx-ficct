import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

import { platformLinks } from '../config';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuActive, setMenuActive] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Reset scroll indicator when changing pages
    useEffect(() => {
        setScrolled(false);
        setMenuActive(false);
    }, [location.pathname]);

    const toggleMenu = () => setMenuActive(!menuActive);
    const closeMenu = () => setMenuActive(false);

    return (
        <header className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
            <div className="container nav-container">
                <HashLink smooth to="/#inicio" className="logo-group" onClick={closeMenu}>
                    <img src="/assets/LOGO_FICCT.png" alt="Logo FICCT" className="nav-logo" id="headerLogo" />
                    <span className="nav-brand">FICCT</span>
                </HashLink>

                <nav className={`nav-links ${menuActive ? 'active' : ''}`} id="navLinks">
                    <HashLink smooth to="/#inicio" className="nav-link" onClick={closeMenu}><i className="ph ph-house"></i> Inicio</HashLink>
                    <Link to="/nosotros" className="nav-link" onClick={closeMenu}><i className="ph ph-users"></i> Nosotros</Link>
                    <HashLink smooth to="/#pregrado" className="nav-link" onClick={closeMenu}><i className="ph ph-student"></i> Pregrado</HashLink>
                    <HashLink smooth to="/#posgrado" className="nav-link" onClick={closeMenu}><i className="ph ph-certificate"></i> Posgrado</HashLink>
                    <HashLink smooth to="/#noticias" className="nav-link" onClick={closeMenu}><i className="ph ph-newspaper"></i> Noticias</HashLink>
                    <HashLink smooth to="/#herramientas" className="nav-link" onClick={closeMenu}><i className="ph ph-wrench"></i> Herramientas</HashLink>
                    <a href={platformLinks.catalog} rel="noopener noreferrer" className="nav-link" onClick={closeMenu}><i className="ph ph-graduation-cap"></i> Ver Cursos</a>
                </nav>

                {/* El botón vive fuera de .nav-links para poder anclarlo al extremo derecho
                    mientras los enlaces quedan centrados. En móvil .nav-links pasa a ser un
                    panel desplegable y el botón se queda visible en la barra superior. */}
                <div className="nav-actions">
                    <a href={platformLinks.login} rel="noopener noreferrer" className="btn btn-cta" onClick={closeMenu}>Iniciar Sesión<i className="ph ph-arrow-right"></i></a>
                    <button className="menu-toggle" aria-label="Abrir menú" aria-expanded={menuActive} id="menuToggle" onClick={toggleMenu}>
                        <i className={`ph ${menuActive ? 'ph-x' : 'ph-list'}`} aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;

