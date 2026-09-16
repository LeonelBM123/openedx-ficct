/* eslint-disable import/no-extraneous-dependencies */
import '@testing-library/jest-dom';

// jsdom no implementa estas APIs, usadas por el drag del carrusel en
// containers/PopularCourses/hooks.js (Pointer Events + scrollBy).
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || jest.fn();
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || jest.fn();
Element.prototype.scrollBy = Element.prototype.scrollBy || jest.fn();
