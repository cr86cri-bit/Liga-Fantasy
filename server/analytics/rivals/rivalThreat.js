import { clamp } from "../utils/number.js";
import { TARGET_POSITION_COUNTS } from "./squadAnalysis.js";

export function estimarCompetidores(player, rivals, salePrice) {
  return (rivals || [])
    .filter(
      (rival) =>
        Number(rival.id) !== Number(player.ownerId || 0)
    )
    .map((rival) =>
      analizarAmenazaRival(player, rival, salePrice)
    )
    .sort((a, b) => b.threatScore - a.threatScore);
}

function analizarAmenazaRival(player, rival, salePrice) {
  const currentCount =
    Number(rival.positions?.[player.position] || 0);

  const target =
    TARGET_POSITION_COUNTS[player.position] || 3;

  const needScore = clamp(
    ((target - currentCount + 1) / target) * 100,
    10,
    100
  );

  const samePosition = (rival.players || []).filter(
    (item) => item.position === player.position
  );

  const avgPositionScore =
    samePosition.length
      ? samePosition.reduce(
          (total, item) =>
            total + Number(item.analysisScore || 0),
          0
        ) / samePosition.length
      : 35;

  const qualityUpgrade = clamp(
    50 +
      (Number(player.analysis?.score || 50) -
        avgPositionScore) *
        2.1,
    0,
    100
  );

  let affordability = 50;

  if (rival.balanceVisible) {
    affordability =
      rival.balance >= salePrice
        ? clamp(
            65 +
              ((rival.balance - salePrice) /
                Math.max(salePrice, 1)) *
                25,
            65,
            100
          )
        : clamp(
            (rival.balance / Math.max(salePrice, 1)) * 60,
            0,
            60
          );
  }

  const squadRoom = clamp(
    90 -
      Math.max(0, rival.playerCount - 15) * 8,
    25,
    90
  );

  const threatScore = Math.round(
    needScore * 0.42 +
      qualityUpgrade * 0.30 +
      affordability * 0.18 +
      squadRoom * 0.10
  );

  let reason = "Interés posible";

  if (currentCount < target) {
    reason = `Necesita ${player.position}`;
  } else if (
    Number(player.analysis?.score || 0) >
    avgPositionScore + 10
  ) {
    reason = `Mejora clara en ${player.position}`;
  }

  return {
    userId: rival.id,
    name: rival.name,
    threatScore,
    label: amenazaLabel(threatScore),
    reason,
  };
}

export function amenazaLabel(score) {
  if (score >= 75) return "Alta";
  if (score >= 50) return "Media";
  return "Baja";
}
