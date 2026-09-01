import {
  calcularFuerzaPlantilla,
  contarPosiciones,
  detectarNecesidades,
  extraerBalance,
} from "./squadAnalysis.js";

export function construirRivales({
  users,
  squadsByUser,
  normalizedPlayersById,
  myUserId,
}) {
  const result = [];

  for (const rawUser of users || []) {
    const id = Number(rawUser?.id || 0);

    if (!id || id === Number(myUserId)) continue;

    const ids = squadsByUser?.[id] || [];

    const players = ids
      .map((playerId) => normalizedPlayersById?.[playerId])
      .filter(Boolean);

    const teamValue = players.reduce(
      (total, player) => total + Number(player.price || 0),
      0
    );

    const positions = contarPosiciones(players);
    const strength = calcularFuerzaPlantilla(players);
    const balance = extraerBalance(rawUser);

    result.push({
      id,
      name: rawUser?.name || `Usuario ${id}`,
      icon: rawUser?.icon || "",
      points: Number(
        rawUser?.points ??
          rawUser?.status?.points ??
          0
      ),
      position: Number(rawUser?.position ?? 0) || null,
      balance,
      balanceVisible: balance != null,
      teamValue,
      playerCount: players.length,
      positions,
      strength,
      needs: detectarNecesidades(positions),
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        price: player.price,
        analysisScore: player.analysis?.score || 0,
      })),
    });
  }

  return result.sort((a, b) => b.strength - a.strength);
}
