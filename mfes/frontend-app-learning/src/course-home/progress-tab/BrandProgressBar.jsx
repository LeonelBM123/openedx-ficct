import PropTypes from 'prop-types';
import classNames from 'classnames';

// Barra de progreso propia -- no usa <ProgressBar/> de Paragon a propósito: sus variantes
// ("dark", "success"...) no mapean de forma confiable a los colores de marca en este theme
// (se veía roja pase lo que pase, incluso al 100%). Con un div propio se controla el color
// exacto por token de marca (--pgn-color-*) y el radio de los bordes.
const BrandProgressBar = ({
  now, variant, className, ariaLabel,
}) => (
  <div
    className={classNames('brand-progress-bar', className)}
    role="progressbar"
    aria-valuenow={now}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={ariaLabel}
  >
    <div
      className={`brand-progress-bar__fill brand-progress-bar__fill--${variant}`}
      style={{ width: `${Math.min(Math.max(now, 0), 100)}%` }}
    />
  </div>
);

BrandProgressBar.propTypes = {
  now: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['muted', 'brand', 'success', 'danger']).isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

BrandProgressBar.defaultProps = {
  className: '',
  ariaLabel: undefined,
};

export default BrandProgressBar;
