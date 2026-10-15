import React from 'react';
import PropTypes from 'prop-types';

const Svg = ({ size, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: 'middle', flexShrink: 0 }}
  >
    {children}
  </svg>
);

Svg.propTypes = {
  size: PropTypes.number,
  children: PropTypes.node.isRequired,
};
Svg.defaultProps = { size: 16 };

export const UserIcon = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </Svg>
);

export const ChatIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </Svg>
);

UserIcon.propTypes = { size: PropTypes.number };
UserIcon.defaultProps = { size: 16 };
ChatIcon.propTypes = { size: PropTypes.number };
ChatIcon.defaultProps = { size: 16 };
