export const TARGET_POSITION_COUNTS = {
  AR: 2,
  DF: 5,
  MC: 5,
  DL: 3,
};

export function contarPosiciones(players) {
  const result = { AR: 0, DF: 0, MC: 0, DL: 0 };

  for (const player of players || []) {
    if (result[player.position] != null) {
      result[player.position] += 1;
    }
  }

  return result;
}

export function detectarNecesidades(counts) {
  return Object.entries(TARGET_POSITION_COUNTS)
    .map(([position, target]) => {
      const current = Number(counts?.[position] || 0);

      return {
        position,
        current,
        target,
        missing: Math.max(0, target - current),
      };
    })
    .filter((item) => item.missing > 0)
    .sort((a, b) => b.missing - a.missing);
}

export function calcularFuerzaPlantilla(players) {
  if (!players?.length) return 0;

  const top = [...players]
    .sort(
      (a, b) =>
        Number(b.analysis?.score || 0) -
        Number(a.analysis?.score || 0)
    )
    .slice(0, 11);

  return Math.round(
    top.reduce(
      (total, player) =>
        total + Number(player.analysis?.score || 0),
      0
    ) / top.length
  );
}

export function extraerBalance(user) {
  const candidates = [
    user?.balance,
    user?.status?.balance,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return null;
}
