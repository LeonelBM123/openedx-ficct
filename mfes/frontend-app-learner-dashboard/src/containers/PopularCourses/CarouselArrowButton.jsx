import React from 'react';
import PropTypes from 'prop-types';

import { Icon, IconButton } from '@openedx/paragon';
import { ChevronLeft, ChevronRight } from '@openedx/paragon/icons';

export const CarouselArrowButton = ({
  direction, onClick, disabled, label,
}) => (
  <IconButton
    className="popular-courses-arrow"
    src={direction === 'prev' ? ChevronLeft : ChevronRight}
    iconAs={Icon}
    alt={label}
    variant="primary"
    disabled={disabled}
    onClick={onClick}
    invertColors
  />
);

CarouselArrowButton.propTypes = {
  direction: PropTypes.oneOf(['prev', 'next']).isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
};

export default CarouselArrowButton;
