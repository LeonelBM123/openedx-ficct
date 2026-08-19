import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <BrowserRouter>
      {/* Primer foco de la página: permite saltar el menú al navegar con teclado.
          Solo se ve al recibir foco (ver .skip-link en index.css). */}
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <Navbar />
      {/* div y no <main>: AboutPage ya renderiza el suyo y anidarlos sería inválido. */}
      <div id="contenido">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nosotros" element={<AboutPage />} />
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  );
}

export default App;

