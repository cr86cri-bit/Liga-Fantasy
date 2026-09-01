export function clamp(value, min, max) {
  const number = Number(value || 0);
  return Math.min(Math.max(number, min), max);
}

export function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function redondear10k(value) {
  return Math.round(Number(value || 0) / 10_000) * 10_000;
}
