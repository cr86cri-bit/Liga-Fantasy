export function normalizarEquipos(data) {
  const result = {};

  const rawTeams = data?.teams
    ? Array.isArray(data.teams)
      ? data.teams
      : Object.values(data.teams)
    : [];

  for (const team of rawTeams) {
    const id = Number(team?.id || 0);
    if (!id) continue;

    result[id] = {
      id,
      name: team?.name || `Equipo ${id}`,
      slug: team?.slug || "",
      nextGames: Array.isArray(team?.nextGames)
        ? team.nextGames
        : [],
    };
  }

  /*
   * Fallback: equipos presentes en eventos activos.
   */
  for (const event of data?.activeEvents || []) {
    for (const game of event?.games || []) {
      for (const team of [game?.home, game?.away]) {
        const id = Number(team?.id || 0);
        if (!id) continue;

        result[id] ??= {
          id,
          name: team?.name || `Equipo ${id}`,
          slug: team?.slug || "",
          nextGames: [],
        };
      }
    }
  }

  return result;
}
