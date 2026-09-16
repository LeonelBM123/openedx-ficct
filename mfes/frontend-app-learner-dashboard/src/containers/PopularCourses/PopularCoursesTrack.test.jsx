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
});
