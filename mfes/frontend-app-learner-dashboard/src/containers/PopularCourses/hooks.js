import {
  useCallback, useEffect, useRef, useState,
} from 'react';

const DRAG_THRESHOLD_PX = 8;
const AUTOPLAY_SPEED_PX_PER_SEC = 40;
const AUTOPLAY_NAV_PAUSE_FALLBACK_MS = 1000;

const isInteractiveTarget = (target) => (
  !!target && typeof target.closest === 'function' && target.closest('a, button') !== null
);

/**
 * Arrastre con mouse/touch/pen sobre un contenedor con overflow-x scroll.
 * Usa Pointer Events (unifica mouse y touch) y setPointerCapture para
 * seguir recibiendo pointermove aunque el cursor salga del elemento.
 *
 * Expone `didDragRef`: true si el gesto actual supero el umbral de arrastre.
 * PopularCoursesTrack lo usa para cancelar el click del link de la tarjeta
 * al soltar (ver onClickCapture en PopularCoursesTrack.jsx).
 */
export const useCarouselDrag = (trackRef) => {
  const stateRef = useRef({ isDown: false, startX: 0, startScrollLeft: 0 });
  const didDragRef = useRef(false);

  const onPointerDown = useCallback((event) => {
    const track = trackRef.current;
    if (!track) { return; }
    // Un click sobre el titulo o el boton "Ver curso" no debe iniciar el
    // tracking de arrastre: si lo hiciera, el jitter normal de un click
    // humano (casi nunca es un pixel perfecto) supera el umbral de abajo y
    // el click queda marcado como "arrastre", bloqueando la navegacion casi
    // siempre. Se deja pasar el gesto sin interferencia para que el
    // navegador maneje el click nativamente.
    if (isInteractiveTarget(event.target)) { return; }
    stateRef.current = {
      isDown: true,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
    };
    didDragRef.current = false;
    track.setPointerCapture(event.pointerId);
  }, [trackRef]);

  const onPointerMove = useCallback((event) => {
    const track = trackRef.current;
    if (!track || !stateRef.current.isDown) { return; }
    const delta = event.clientX - stateRef.current.startX;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) {
      didDragRef.current = true;
    }
    track.scrollLeft = stateRef.current.startScrollLeft - delta;
  }, [trackRef]);

  const onPointerUp = useCallback((event) => {
    const track = trackRef.current;
    stateRef.current.isDown = false;
    if (track) { track.releasePointerCapture(event.pointerId); }
    // El click sintetico (si lo hay) de esta misma interaccion se despacha
    // de forma sincronica justo despues de pointerup, asi que todavia ve
    // didDragRef=true a tiempo para bloquearlo cuando corresponde. Este
    // reset diferido evita que la bandera quede "pegada" en true cuando el
    // release ocurre fuera de un <a>/<button> (ahi nunca llega un click que
    // la resetee) y termine bloqueando un click limpio no relacionado mas
    // adelante.
    setTimeout(() => { didDragRef.current = false; }, 0);
  }, [trackRef]);

  return {
    didDragRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
};

/**
 * Estado de bordes del carrusel (para habilitar/deshabilitar flechas) y
 * helper para avanzar/retroceder una "pagina" (el ancho visible del track).
 * Se recalcula en cada scroll y con ResizeObserver (cambia al cruzar el
 * breakpoint de 1200px o al redimensionar la ventana).
 */
export const useCarouselScrollState = (trackRef, itemCount) => {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) { return; }
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollPrev(scrollLeft > 1);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 1);
  }, [trackRef]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) { return undefined; }
    updateEdges();
    track.addEventListener('scroll', updateEdges, { passive: true });

    if (typeof ResizeObserver === 'undefined') {
      return () => track.removeEventListener('scroll', updateEdges);
    }
    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(track);
    return () => {
      track.removeEventListener('scroll', updateEdges);
      resizeObserver.disconnect();
    };
  }, [trackRef, updateEdges, itemCount]);

  const scrollByPage = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) { return; }
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  }, [trackRef]);

  return { canScrollPrev, canScrollNext, scrollByPage };
};

/**
 * Auto-scroll lento y continuo del carrusel, en rebote (ping-pong) entre los
 * bordes. Se pausa mientras el usuario interactua (hover, foco por teclado,
 * arrastre, click en flechas) y reanuda al terminar. No usa estado de React:
 * escribe scrollLeft directamente via rAF, igual de imperativo que el drag.
 */
export const useCarouselAutoplay = (trackRef, { enabled }) => {
  const directionRef = useRef(1);
  const rafIdRef = useRef(null);
  const lastTsRef = useRef(null);
  const pauseReasonsRef = useRef(new Set());
  const navFallbackTimeoutRef = useRef(null);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const tick = useCallback((ts) => {
    const track = trackRef.current;
    if (!track || pauseReasonsRef.current.size > 0) {
      rafIdRef.current = null;
      lastTsRef.current = null;
      return;
    }
    if (lastTsRef.current !== null) {
      const deltaSec = (ts - lastTsRef.current) / 1000;
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      if (maxScrollLeft > 0) {
        let next = track.scrollLeft + directionRef.current * AUTOPLAY_SPEED_PX_PER_SEC * deltaSec;
        if (next >= maxScrollLeft) {
          next = maxScrollLeft;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        // scrollLeft directo hereda `scroll-behavior: smooth` del CSS
        // (index.scss): en un loop de rAF dispararia una animacion nativa
        // nueva cada ~16ms peleando consigo misma (jank). scrollTo con
        // behavior:'instant' explicito ignora el CSS solo para esta
        // llamada puntual.
        track.scrollTo({ left: next, behavior: 'instant' });
      }
    }
    lastTsRef.current = ts;
    rafIdRef.current = requestAnimationFrame(tick);
  }, [trackRef]);

  const startLoop = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const pauseAutoplay = useCallback((reason) => {
    pauseReasonsRef.current.add(reason);
    stopLoop();
  }, [stopLoop]);

  const resumeAutoplay = useCallback((reason) => {
    pauseReasonsRef.current.delete(reason);
    if (enabled && pauseReasonsRef.current.size === 0) {
      startLoop();
    }
  }, [enabled, startLoop]);

  const pauseAutoplayForNav = useCallback(() => {
    pauseAutoplay('nav');
    const track = trackRef.current;
    if (track && 'onscrollend' in window) {
      const onScrollEnd = () => {
        track.removeEventListener('scrollend', onScrollEnd);
        resumeAutoplay('nav');
      };
      track.addEventListener('scrollend', onScrollEnd);
    }
    // Red de seguridad: si 'scrollend' no soporta o el click no movio nada
    // (deberia ser imposible, el boton se deshabilita en los bordes), no
    // deja el autoplay pausado para siempre.
    clearTimeout(navFallbackTimeoutRef.current);
    navFallbackTimeoutRef.current = setTimeout(
      () => resumeAutoplay('nav'),
      AUTOPLAY_NAV_PAUSE_FALLBACK_MS,
    );
  }, [pauseAutoplay, resumeAutoplay, trackRef]);

  useEffect(() => {
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      pauseReasonsRef.current.add('reduced-motion');
    } else if (enabled) {
      startLoop();
    }
    if (!enabled) {
      stopLoop();
    }
    return () => {
      stopLoop();
      clearTimeout(navFallbackTimeoutRef.current);
    };
  }, [enabled, startLoop, stopLoop]);

  return { pauseAutoplay, resumeAutoplay, pauseAutoplayForNav };
};
