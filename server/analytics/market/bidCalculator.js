import { MARKET_STATUS_MULTIPLIER } from "../config/status.js";
import { clamp, redondear10k } from "../utils/number.js";

export function calcularPujaMaxima(
  player,
  {
    salePrice,
    competitionScore,
    maximumBid,
  }
) {
  const price =
    Number(player.price || salePrice || 0);

  const score =
    Number(player.analysis?.score || 50);

  const trendPct =
    price > 0
      ? Number(player.priceIncrement || 0) / price
      : 0;

  const difficulty =
    Number(player?.nextMatch?.difficulty?.score ?? 50);

  const scoreMultiplier =
    0.80 + (score / 100) * 0.46;

  const trendMultiplier = clamp(
    1 + trendPct * 10,
    0.94,
    1.07
  );

  const fixtureMultiplier = clamp(
    1.05 - (difficulty / 100) * 0.10,
    0.95,
    1.05
  );

  const competitionMultiplier =
    1 + (clamp(competitionScore, 0, 100) / 100) * 0.08;

  const statusMultiplier =
    MARKET_STATUS_MULTIPLIER[player.status] ?? 0.82;

  let recommended =
    price *
    scoreMultiplier *
    trendMultiplier *
    fixtureMultiplier *
    competitionMultiplier *
    statusMultiplier;

  if (salePrice < price * 0.95 && score >= 55) {
    recommended = Math.max(
      recommended,
      salePrice * 1.03
    );
  }

  if (maximumBid > 0) {
    recommended = Math.min(recommended, maximumBid);
  }

  return redondear10k(Math.max(0, recommended));
}
