import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PopularCoursesTrack from './PopularCoursesTrack';

const course = (id, title) => ({
  course_id: id,
  title,
  org: 'FICCT',
  number: 'INF102',
  short_description: '',
  image_url: '',
  about_url: `/courses/${id}/about`,
  enrollment_count: 1,
  start: null,
});

const mockOverflow = (track, {
  scrollLeft = 0, scrollWidth = 1000, clientWidth = 400,
} = {}) => {
  Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(track, 'scrollLeft', { value: scrollLeft, writable: true, configurable: true });
};

const renderTrack = (courses) => render(
  <IntlProvider locale="en"><PopularCoursesTrack courses={courses} /></IntlProvider>,
);

describe('PopularCoursesTrack', () => {
  it('disables the prev arrow and enables next when scrolled to the start', () => {
    renderTrack([course('a', 'A'), course('b', 'B')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollLeft: 0 });
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Cursos anteriores' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Más cursos' })).toBeEnabled();
  });

  it('disables both arrows when there is no overflow (few courses)', () => {
    renderTrack([course('a', 'A')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollLeft: 0, scrollWidth: 300, clientWidth: 400 });
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Cursos anteriores' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Más cursos' })).toBeDisabled();
  });

  it('does not navigate the card link after a drag release', () => {
    renderTrack([course('a', 'Base de Datos')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });

    fireEvent.pointerDown(track, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 150, pointerId: 1 }); // delta 50px > umbral
    fireEvent.pointerUp(track, { clientX: 150, pointerId: 1 });

    const link = screen.getByText('Base de Datos');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('allows a clean click without dragging to reach the card link', () => {
    renderTrack([course('a', 'Base de Datos')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });

    const link = screen.getByText('Base de Datos');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(false);
  });

  it('advances one page when ArrowRight is pressed on the track', () => {
    renderTrack([course('a', 'A'), course('b', 'B')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });
    track.scrollBy = jest.fn();

    fireEvent.keyDown(track, { key: 'ArrowRight' });

    expect(track.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number), behavior: 'smooth' }),
    );
  });

  it('lets a clean click starting on the card title link navigate, even with incidental mouse jitter', () => {
    // Reproduccion fiel del bug reportado: el click real empieza sobre el
    // <a>, no sobre el contenedor del track (que es lo que prueba el test
    // de arriba). Antes del fix, el jitter de 50px marcaba didDragRef=true
    // y este test fallaba igual que en produccion.
    renderTrack([course('a', 'Base de Datos')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });

    const link = screen.getByText('Base de Datos');
    fireEvent.pointerDown(link, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 150, pointerId: 1 }); // jitter humano tipico
    fireEvent.pointerUp(link, { clientX: 150, pointerId: 1 });

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(false);
  });

  it('does not leave didDragRef stuck after a drag that ends outside a link', () => {
    // Cubre el segundo defecto: un arrastre real que termina fuera de un
    // <a>/<button> no debe bloquear un click limpio posterior no relacionado.
    jest.useFakeTimers();
    renderTrack([course('a', 'Base de Datos')]);
    const track = screen.getByRole('group');
    mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });

    fireEvent.pointerDown(track, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 100, pointerId: 1 }); // delta 100px, arrastre real
    fireEvent.pointerUp(track, { clientX: 100, pointerId: 1 }); // release fuera de cualquier link

    jest.advanceTimersByTime(0); // corre el setTimeout(0) que limpia didDragRef

    const link = screen.getByText('Base de Datos');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(false);
    jest.useRealTimers();
  });

  describe('autoplay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(window, 'requestAnimationFrame');
      jest.spyOn(window, 'cancelAnimationFrame');
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('starts the autoplay loop once there is overflow to scroll', () => {
      renderTrack([course('a', 'A'), course('b', 'B')]);
      const track = screen.getByRole('group');
      mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });
      fireEvent.scroll(track); // dispara updateEdges -> canScrollNext=true -> enabled

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('pauses autoplay on hover and resumes on mouse leave', () => {
      renderTrack([course('a', 'A'), course('b', 'B')]);
      const track = screen.getByRole('group');
      mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });
      fireEvent.scroll(track);
      window.requestAnimationFrame.mockClear();

      const carousel = track.closest('.popular-courses-carousel');
      fireEvent.mouseEnter(carousel);
      expect(window.cancelAnimationFrame).toHaveBeenCalled();

      fireEvent.mouseLeave(carousel);
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('pauses autoplay while any part of the carousel has focus and resumes on blur', () => {
      // React delega onFocus/onBlur en focusin/focusout (que si burbujean).
      // fireEvent.focus/.blur no bubblean en jsdom y no dispararian el
      // handler puesto en el wrapper .popular-courses-carousel.
      renderTrack([course('a', 'A'), course('b', 'B')]);
      const track = screen.getByRole('group');
      mockOverflow(track, { scrollWidth: 1000, clientWidth: 400 });
      fireEvent.scroll(track);
      window.requestAnimationFrame.mockClear();

      fireEvent.focusIn(track);
      expect(window.cancelAnimationFrame).toHaveBeenCalled();

      fireEvent.focusOut(track);
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
