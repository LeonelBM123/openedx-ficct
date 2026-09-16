/* eslint-disable import/no-extraneous-dependencies */
import '@testing-library/jest-dom';

// jsdom no implementa estas APIs, usadas por el drag y el autoplay del
// carrusel en containers/PopularCourses/hooks.js (Pointer Events + scroll).
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || jest.fn();
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || jest.fn();
Element.prototype.scrollBy = Element.prototype.scrollBy || jest.fn();
Element.prototype.scrollTo = Element.prototype.scrollTo || jest.fn();
global.requestAnimationFrame = global.requestAnimationFrame
  || ((cb) => setTimeout(() => cb(performance.now()), 16));
global.cancelAnimationFrame = global.cancelAnimationFrame || ((id) => clearTimeout(id));
