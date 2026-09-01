function normalizeAssetUrl(
  raw
) {
  const value =
    String(
      raw ||
      ""
    ).trim();

  if (!value) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      value
    )
  ) {
    return value;
  }

  return `https://cdn.biwenger.com/${value.replace(/^\/+/, "")}`;
}

function getTeamIconUrl(
  team,
  id
) {
  const raw =
    team?.iconHero ||
    team?.icon ||
    team?.logo ||
    team?.image ||
    team?.shield ||
    team?.badge ||
    team?.crest ||
    "";

  const normalized =
    normalizeAssetUrl(
      raw
    );

  if (normalized) {
    return normalized;
  }

  /*
   * Fallback de CDN.
   * Si Biwenger cambia la ruta o el escudo no existe,
   * el frontend muestra las iniciales del club.
   */
  return id
    ? `https://cdn.biwenger.com/i/t/${id}.png`
    : "";
}

export function normalizarEquipos(data) {
  const result = {};

  const rawTeams = data?.teams
    ? Array.isArray(data.teams)
      ? data.teams
      : Object.values(data.teams)
    : [];

  for (const team of rawTeams) {
    const id =
      Number(
        team?.id ||
        0
      );

    if (!id) {
      continue;
    }

    result[id] = {
      id,

      name:
        team?.name ||
        `Equipo ${id}`,

      slug:
        team?.slug ||
        "",

      iconUrl:
        getTeamIconUrl(
          team,
          id
        ),

      nextGames:
        Array.isArray(
          team?.nextGames
        )
          ? team.nextGames
          : [],
    };
  }

  /*
   * Fallback: equipos presentes en eventos activos.
   */
  for (
    const event of
      data?.activeEvents ||
      []
  ) {
    for (
      const game of
        event?.games ||
        []
    ) {
      for (
        const team of
          [
            game?.home,
            game?.away,
          ]
      ) {
        const id =
          Number(
            team?.id ||
            0
          );

        if (!id) {
          continue;
        }

        result[id] ??= {
          id,

          name:
            team?.name ||
            `Equipo ${id}`,

          slug:
            team?.slug ||
            "",

          iconUrl:
            getTeamIconUrl(
              team,
              id
            ),

          nextGames: [],
        };
      }
    }
  }

  return result;
}
