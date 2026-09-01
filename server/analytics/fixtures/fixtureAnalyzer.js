import { clamp } from "../utils/number.js";
import {
  etiquetaDificultad,
  estrellasDificultad,
} from "./difficulty.js";

export function obtenerProximoPartido(
  teamId,
  teamsMap,
  roundsMap,
  teamStrengths
) {
  const normalizedTeamId = Number(teamId);
  const team = teamsMap?.[normalizedTeamId];
  const game = team?.nextGames?.[0];

  if (!team || !game) return  null;

  const homeId = Number(game?.home?.id || 0);
  const awayId = Number(game?.away?.id || 0);
  const isHome = homeId === normalizedTeamId;
  const opponentId = isHome ? awayId : homeId;
  const opponent = teamsMap?.[opponentId];

  const opponentStrength =
    Number(teamStrengths?.[opponentId] ?? 50);

  const difficultyScore = clamp(
    opponentStrength + (isHome ? -7 : 7),
    0,
    100
  );

  const roundId = Number(game?.round?.id || 0);

  return {
    gameId: Number(game.id || 0),
    date: game.date ? Number(game.date) : null,
    roundId,
    roundName: roundsMap?.[roundId]?.name || "Próxima jornada",
    venue: isHome ? "LOCAL" : "VISITANTE",
    opponent: {
      id: opponentId,
      name: opponent?.name || `Equipo ${opponentId}`,
      slug: opponent?.slug || "",
    },
    difficulty: {
      score: Math.round(difficultyScore),
      label: etiquetaDificultad(difficultyScore),
      stars: estrellasDificultad(difficultyScore),
    },
  };
}
