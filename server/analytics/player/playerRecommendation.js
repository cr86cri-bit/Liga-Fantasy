export function obtenerRecomendacion(player, score, context = "squad") {
  if (context === "market") {
    if (player.status !== "ok") return "VIGILAR";
    return score >= 68 ? "FICHAR" : "VIGILAR";
  }

  if (player.status === "discarded") return "VENDER";

  if (["injured", "doubt", "sanctioned"].includes(player.status)) {
    return "VIGILAR";
  }

  if (score >= 58) return "MANTENER";
  if (score < 35) return "VENDER";
  return "VIGILAR";
}
