import { STATUS_FACTOR } from "../config/status.js";
import { clamp, round1 } from "../utils/number.js";

export function proyectarPuntos(player) {
  const recent = [0, 1, 2].map((index) => {
    const value = player?.fitness?.[index];
    return typeof value === "number" ? value : 0;
  });

  const recentAverage =
    recent.reduce((total, value) => total + value, 0) / 3;

  const games =
    Number(player.playedHome || 0) + Number(player.playedAway || 0);

  const ppg =
    games > 0 ? Number(player.points || 0) / games : recentAverage;

  const lastPpg =
    player.pointsLastSeason == null
      ? ppg
      : Number(player.pointsLastSeason || 0) / 38;

  const difficulty =
    Number(player?.nextMatch?.difficulty?.score ?? 50);

  const fixtureFactor =
    1.18 - (difficulty / 100) * 0.36;

  const statusFactor =
    STATUS_FACTOR[player.status] ?? 0.5;

  const analysisFactor =
    0.86 +
    (Number(player?.analysis?.score || 50) / 100) * 0.28;

  const base =
    recentAverage * 0.48 +
    ppg * 0.34 +
    lastPpg * 0.18;

  return round1(
    clamp(
      base * fixtureFactor * statusFactor * analysisFactor,
      0,
      25
    )
  );
}
