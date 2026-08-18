import Hero from '../components/Hero';
import Programs from '../components/Programs';
import Masters from '../components/Masters';
import News from '../components/News';
import Tools from '../components/Tools';
import { useReveal } from '../hooks/useReveal';

const HomePage = () => {
    // Cubre el contenido estático de la página. News se encarga de sus propias
    // tarjetas, que llegan por fetch después de este primer escaneo.
    useReveal();

    return (
        <>
            <Hero />
            <Programs />
            <Masters />
            <News />
            <Tools />
        </>
    );
};

export default HomePage;
