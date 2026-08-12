import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

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

                <button className="menu-toggle" aria-label="Abrir menú" id="menuToggle" onClick={toggleMenu}>
                    <i className={`ph ${menuActive ? 'ph-x' : 'ph-list'}`}></i>
                </button>

                <nav className={`nav-links ${menuActive ? 'active' : ''}`} id="navLinks">
                    <HashLink smooth to="/#inicio" className="nav-link" onClick={closeMenu}><i className="ph ph-house"></i> Inicio</HashLink>
                    <Link to="/nosotros" className="nav-link" onClick={closeMenu}><i className="ph ph-users"></i> Nosotros</Link>
                    <HashLink smooth to="/#pregrado" className="nav-link" onClick={closeMenu}><i className="ph ph-student"></i> Pregrado</HashLink>
                    <HashLink smooth to="/#posgrado" className="nav-link" onClick={closeMenu}><i className="ph ph-certificate"></i> Posgrado</HashLink>
                    <HashLink smooth to="/#noticias" className="nav-link" onClick={closeMenu}><i className="ph ph-newspaper"></i> Noticias</HashLink>
                    <HashLink smooth to="/#herramientas" className="nav-link" onClick={closeMenu}><i className="ph ph-wrench"></i> Herramientas</HashLink>
                    <a href="http://apps.167.172.142.82.nip.io/catalog/" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}><i className="ph ph-graduation-cap"></i> Ver Cursos</a>
                    <a href="http://apps.167.172.142.82.nip.io/authn/login" rel="noopener noreferrer" className="btn btn-cta" onClick={closeMenu}>Iniciar Sesión<i className="ph ph-arrow-right"></i></a>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;

