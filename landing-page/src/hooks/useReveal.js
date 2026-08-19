import { useEffect } from 'react';

/**
 * Revela con animación los elementos `.reveal` a medida que entran en pantalla.
 *
 * `.reveal` arranca en opacity:0 y solo se ve al recibir la clase `active`. Como el
 * observer se engancha a los elementos que existen cuando corre el efecto, cualquier
 * contenido que llegue después (por ejemplo las noticias, que se piden con fetch) se
 * quedaba invisible para siempre: ocupando espacio en el layout pero sin dibujarse.
 *
 * Por eso el componente que carga datos asincrónicos debe pasar esos datos en `deps`,
 * para que el observer vuelva a escanear cuando aparezcan sus nodos.
 *
 * @param {Array} deps - dependencias que disparan un nuevo escaneo del DOM.
 */
export function useReveal(deps = []) {
    useEffect(() => {
        // Evita volver a observar lo que ya se reveló en un escaneo previo.
        const elements = document.querySelectorAll('.reveal:not([data-revealed])');
        if (elements.length === 0) return undefined;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // data-attribute y no classList: React reescribe className entero en
                    // cada render y borraría la marca, dejando el elemento invisible para
                    // siempre porque acá mismo dejamos de observarlo.
                    entry.target.dataset.revealed = 'true';
                    obs.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });

        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useReveal;
