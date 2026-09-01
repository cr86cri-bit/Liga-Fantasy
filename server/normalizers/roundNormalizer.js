export function normalizarJornadas(data) {
  const rounds =
    data?.season?.rounds ||
    data?.rounds ||
    [];

  const result = {};

  for (const round of rounds || []) {
    const id = Number(round?.id || 0);
    if (!id) continue;

    result[id] = {
      id,
      name:
        round?.name ||
        round?.short ||
        `Jornada ${id}`,
      short: round?.short || "",
      status: round?.status || "",
    };
  }

  return result;
}
