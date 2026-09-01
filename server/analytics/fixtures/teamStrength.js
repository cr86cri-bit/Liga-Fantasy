import { STATUS_FACTOR } from "../config/status.js";
import { clamp } from "../utils/number.js";

export function crearFuerzaEquipos(playersMap, teamsMap) {
  const byTeam = new Map();

  for (const raw of Object.values(playersMap || {})) {
    const teamId = Number(raw?.teamID || 0);
    const position = Number(raw?.position || 0);

    if (!teamId || position < 1 || position > 4) continue;

    const games =
      Number(raw?.playedHome || 0) + Number(raw?.playedAway || 0);

    const currentPpg =
      games > 0 ? Number(raw?.points || 0) / games : 0;

    const lastPpg =
      raw?.pointsLastSeason == null
        ? currentPpg
        : Number(raw.pointsLastSeason || 0) / 38;

    const availability =
      STATUS_FACTOR[raw?.status || "unknown"] ?? 0.5;

    const power =
      (currentPpg * 0.68 + lastPpg * 0.32) *
      (0.75 + availability * 0.25);

    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(power);
  }

  const rawStrengths = [];

  for (const [teamId, values] of byTeam.entries()) {
    const top = [...values].sort((a, b) => b - a).slice(0, 11);

    const average =
      top.length > 0
        ? top.reduce((total, value) => total + value, 0) / top.length
        : 0;

    rawStrengths.push({ teamId, average });
  }

  const values = rawStrengths.map((item) => item.average);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  const result = {};

  for (const item of rawStrengths) {
    const normalized =
      max === min
        ? 50
        : ((item.average - min) / (max - min)) * 100;

    result[item.teamId] = Math.round(clamp(normalized, 0, 100));
  }

  for (const team of Object.values(teamsMap || {})) {
    if (result[team.id] == null) result[team.id] = 50;
  }

  return result;
}
