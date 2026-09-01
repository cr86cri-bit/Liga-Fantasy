export function etiquetaPrecio(ratio) {
  if (ratio <= 0.95) return "BARATO";
  if (ratio <= 1.07) return "JUSTO";
  if (ratio <= 1.18) return "CARO";
  return "MUY CARO";
}

export function etiquetaCompetencia(score) {
  if (score >= 75) return "ALTA";
  if (score >= 50) return "MEDIA";
  return "BAJA";
}
