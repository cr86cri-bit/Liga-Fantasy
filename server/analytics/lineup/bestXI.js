import { FORMATIONS } from "../config/formations.js";
import { round1 } from "../utils/number.js";
import { proyectarPuntos } from "./projection.js";

export function generarMejorXI(squad, leagueSettings = {}) {
  const candidates = (squad || []).map((player) => ({
    ...player,
    projectedPoints: proyectarPuntos(player),
  }));

  let best = null;

  for (const formation of FORMATIONS) {
    const selected = [];
    let valid = true;

    for (const position of ["AR", "DF", "MC", "DL"]) {
      const needed = formation[position];

      const pool = candidates
        .filter((player) => player.position === position)
        .sort((a, b) => b.projectedPoints - a.projectedPoints);

      if (pool.length < needed) {
        valid = false;
        break;
      }

      selected.push(...pool.slice(0, needed));
    }

    if (!valid || selected.length !== 11) continue;

    const totalProjection = round1(
      selected.reduce(
        (total, player) => total + player.projectedPoints,
        0
      )
    );

    if (!best || totalProjection > best.totalProjection) {
      best = {
        formation: formation.name,
        players: selected,
        totalProjection,
      };
    }
  }

  if (!best) {
    const goalkeeper = candidates
      .filter((player) => player.position === "AR")
      .sort((a, b) => b.projectedPoints - a.projectedPoints)[0];

    const outfield = candidates
      .filter((player) => player.position !== "AR")
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, 10);

    const players = [goalkeeper, ...outfield].filter(Boolean);

    best = {
      formation: "XI óptimo",
      players,
      totalProjection: round1(
        players.reduce(
          (total, player) => total + player.projectedPoints,
          0
        )
      ),
    };
  }

  const ordered = [...best.players].sort(
    (a, b) => b.projectedPoints - a.projectedPoints
  );

  const captain =
    leagueSettings?.lineupCaptain === false
      ? null
      : ordered[0] || null;

  const striker =
    leagueSettings?.lineupStriker === false
      ? null
      : [...best.players]
          .filter((player) => player.position === "DL")
          .sort((a, b) => b.projectedPoints - a.projectedPoints)[0] ||
        null;

  return {
    formation: best.formation,
    totalProjection: best.totalProjection,
    captain: resumirXIPlayer(captain),
    striker: resumirXIPlayer(striker),
    players: [...best.players]
      .sort(
        (a, b) =>
          posicionOrden(a.position) - posicionOrden(b.position) ||
          b.projectedPoints - a.projectedPoints
      )
      .map(resumirXIPlayer),
  };
}

function resumirXIPlayer(player) {
  if (!player) return null;

  return {
    id: player.id,
    name: player.name,
    position: player.position,
    teamName: player.teamName,
    photoUrl: player.photoUrl,
    projectedPoints: player.projectedPoints,
    nextMatch: player.nextMatch,
    status: player.status,
    analysisScore: player.analysis?.score || 0,
  };
}

function posicionOrden(position) {
  return { AR: 1, DF: 2, MC: 3, DL: 4 }[position] || 9;
}
