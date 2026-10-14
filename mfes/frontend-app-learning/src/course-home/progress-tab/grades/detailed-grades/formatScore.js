// Redondea a un máximo de 2 decimales (9.310344827586206 -> 9.31, 21 -> 21).
const formatScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 100) / 100) : value;
};

export default formatScore;
