import {
  useCallback, useEffect, useRef, useState,
} from 'react';

const DRAG_THRESHOLD_PX = 5;

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
