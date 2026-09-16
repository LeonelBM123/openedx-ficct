import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

import { useIntl } from '@edx/frontend-platform/i18n';

import PopularCourseCard from './PopularCourseCard';
import CarouselArrowButton from './CarouselArrowButton';
import { useCarouselDrag, useCarouselScrollState } from './hooks';
import messages from './messages';

/**
 * Track deslizable de PopularCourses: arrastre con mouse/touch (Pointer
 * Events), scroll-snap nativo, botones prev/next y flechas de teclado.
 */
export const PopularCoursesTrack = ({ courses }) => {
  const { formatMessage } = useIntl();
  const trackRef = useRef(null);
  const { didDragRef, dragHandlers } = useCarouselDrag(trackRef);
  const { canScrollPrev, canScrollNext, scrollByPage } = useCarouselScrollState(
    trackRef,
    courses.length,
  );

  // Si el gesto que acaba de terminar fue un arrastre (supero el umbral),
  // el click del link "Ver curso"/titulo dispararia una navegacion no
  // deseada al soltar. Se captura en fase de captura (antes de que llegue
  // al <a>) y se cancela una sola vez por gesto.
  const onTrackClickCapture = useCallback((event) => {
    if (didDragRef.current) {
      event.preventDefault();
      event.stopPropagation();
      didDragRef.current = false;
    }
  }, [didDragRef]);

  const onTrackKeyDown = useCallback((event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByPage(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByPage(-1);
    }
  }, [scrollByPage]);

  return (
    <div className="popular-courses-carousel">
      <div
        ref={trackRef}
        className="popular-courses-list"
        role="group"
        aria-label={formatMessage(messages.sectionTitle)}
        tabIndex={0}
        onKeyDown={onTrackKeyDown}
        onClickCapture={onTrackClickCapture}
        {...dragHandlers}
      >
        {courses.map((course) => (
          <PopularCourseCard key={course.course_id} course={course} />
        ))}
      </div>
      <div className="popular-courses-arrows">
        <CarouselArrowButton
          direction="prev"
          onClick={() => scrollByPage(-1)}
          disabled={!canScrollPrev}
          label={formatMessage(messages.prevButtonLabel)}
        />
        <CarouselArrowButton
          direction="next"
          onClick={() => scrollByPage(1)}
          disabled={!canScrollNext}
          label={formatMessage(messages.nextButtonLabel)}
        />
      </div>
    </div>
  );
};

PopularCoursesTrack.propTypes = {
  courses: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string.isRequired,
  })).isRequired,
};

export default PopularCoursesTrack;
