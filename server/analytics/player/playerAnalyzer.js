import { STATUS_SCORE } from "../config/status.js";
import { clamp, round1, round2 } from "../utils/number.js";
import { obtenerRecomendacion } from "./playerRecommendation.js";

export function analizarJugador(player, context = "squad") {
  const recentValues = [0, 1, 2].map((index) => {
    const value = player?.fitness?.[index];
    return typeof value === "number" ? value : 0;
  });

  const recentAverage =
    recentValues.reduce((total, value) => total + value, 0) / 3;

  const games =
    Number(player.playedHome || 0) + Number(player.playedAway || 0);

  const ppg =
    games > 0 ? Number(player.points || 0) / games : recentAverage;

  const lastSeasonPpg =
    player.pointsLastSeason == null
      ? ppg
      : Number(player.pointsLastSeason || 0) / 38;

  const formScore = clamp((recentAverage / 8) * 100, 0, 100);
  const pointsScore = clamp((ppg / 8) * 100, 0, 100);

  const trendPercent =
    player.price > 0
      ? (Number(player.priceIncrement || 0) / Number(player.price)) * 100
      : 0;

  const trendScore = clamp(50 + trendPercent * 18, 0, 100);

  const priceMillions = Number(player.price || 0) / 1_000_000;
  const pointsPerMillion =
    priceMillions > 0 ? Number(player.points || 0) / priceMillions : 0;

  const valueScore = clamp((pointsPerMillion / 6) * 100, 0, 100);
  const statusScore = STATUS_SCORE[player.status] ?? 45;
  const lastSeasonScore = clamp((lastSeasonPpg / 5) * 100, 0, 100);

  const fixtureDifficulty =
    Number(player?.nextMatch?.difficulty?.score ?? 50);

  const fixtureScore = clamp(100 - fixtureDifficulty, 0, 100);

  const score = Math.round(
    clamp(
      formScore * 0.27 +
        pointsScore * 0.20 +
        trendScore * 0.13 +
        valueScore * 0.13 +
        statusScore * 0.12 +
        lastSeasonScore * 0.05 +
        fixtureScore * 0.10,
      0,
      100
    )
  );

  return {
    score,
    recommendation: obtenerRecomendacion(player, score, context),
    recentAverage: round1(recentAverage),
    ppg: round2(ppg),
    trendPercent: round2(trendPercent),
    pointsPerMillion: round2(pointsPerMillion),
    breakdown: {
      form: Math.round(formScore),
      points: Math.round(pointsScore),
      trend: Math.round(trendScore),
      value: Math.round(valueScore),
      availability: Math.round(statusScore),
      history: Math.round(lastSeasonScore),
      fixture: Math.round(fixtureScore),
    },
  };
}
