export function etiquetaDificultad(score) {
  if (score <= 32) return "FÁCIL";
  if (score <= 55) return "MEDIA";
  if (score <= 74) return "DIFÍCIL";
  return "MUY DIFÍCIL";
}

export function estrellasDificultad(score) {
  if (score <= 20) return 1;
  if (score <= 40) return 2;
  if (score <= 60) return 3;
  if (score <= 80) return 4;
  return 5;
}
