import { useEffect } from 'react';
import Hero from '../components/Hero';
import Programs from '../components/Programs';
import Masters from '../components/Masters';
import News from '../components/News';
import Tools from '../components/Tools';

const HomePage = () => {
    useEffect(() => {
        const revealElements = document.querySelectorAll('.reveal');

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });

        revealElements.forEach(el => revealObserver.observe(el));

        return () => {
            revealElements.forEach(el => revealObserver.unobserve(el));
        };
    }, []);

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
