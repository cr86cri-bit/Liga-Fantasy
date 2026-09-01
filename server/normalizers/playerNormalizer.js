import { obtenerProximoPartido } from "../analytics/index.js";

const POSITIONS = {
  1: "AR",
  2: "DF",
  3: "MC",
  4: "DL",
  5: "DT",
};

export function normalizarJugador(
  player,
  {
    teamsMap,
    roundsMap,
    teamStrengths,
  }
) {
  const id = Number(player?.id || 0);

  const teamId = Number(
    player?.teamID ||
      player?.team?.id ||
      0
  );

  const team = teamsMap?.[teamId] || null;

  const iconHero =
    player?.iconHero || "";

  const normalized = {
    id,
    name:
      player?.name ||
      `Jugador ${id}`,
    slug:
      player?.slug || "",
    number:
      Number(player?.number || 0) || null,
    teamId,
    teamName:
      team?.name || "Sin club",
    teamSlug:
      team?.slug || "",
    position:
      POSITIONS[Number(player?.position)] ||
      String(player?.position || "?"),
    altPositions:
      Array.isArray(player?.altPositions)
        ? player.altPositions
        : [],
    price:
      Number(player?.price || 0),
    fantasyPrice:
      Number(player?.fantasyPrice || 0),
    priceIncrement:
      Number(player?.priceIncrement || 0),
    points:
      Number(player?.points || 0),
    pointsLastSeason:
      player?.pointsLastSeason == null
        ? null
        : Number(player.pointsLastSeason),
    playedHome:
      Number(player?.playedHome || 0),
    playedAway:
      Number(player?.playedAway || 0),
    pointsHome:
      Number(player?.pointsHome || 0),
    pointsAway:
      Number(player?.pointsAway || 0),
    status:
      player?.status || "unknown",
    statusInfo:
      player?.statusInfo || "",
    fitness:
      Array.isArray(player?.fitness)
        ? player.fitness.slice(0, 3)
        : [],
    iconHero,
    photoUrl:
      iconHero && /^https?:\/\//i.test(iconHero)
        ? iconHero
        : iconHero
          ? `https://cdn.biwenger.com/${String(iconHero).replace(/^\/+/, "")}`
          : `https://cdn.biwenger.com/i/p/${id}.png`,
  };

  normalized.nextMatch =
    obtenerProximoPartido(
      teamId,
      teamsMap,
      roundsMap,
      teamStrengths
    );

  return normalized;
}
