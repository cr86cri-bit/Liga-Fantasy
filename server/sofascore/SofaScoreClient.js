const SEARCH_ENDPOINTS = [
  "https://api.sofascore.com/api/v1/search/all",
  "https://www.sofascore.com/api/v1/search/all",
];

const CACHE_TTL_MS =
  24 * 60 * 60 * 1000;

export class SofaScoreClient {
  constructor({
    cacheTtlMs = CACHE_TTL_MS,
  } = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map();
  }

  async buscarJugador({
    name,
    team = "",
  }) {
    const cleanName =
      String(name || "").trim();

    const cleanTeam =
      String(team || "").trim();

    if (!cleanName) {
      throw new Error(
        "Falta el nombre del jugador."
      );
    }

    const cacheKey =
      `${normalizarTexto(cleanName)}|${normalizarTexto(cleanTeam)}`;

    const cached =
      this.cache.get(cacheKey);

    if (
      cached &&
      Date.now() -
        cached.createdAt <
        this.cacheTtlMs
    ) {
      return cached.value;
    }

    /*
     * Primero buscamos nombre + equipo para
     * reducir homónimos. Si no hay resultados,
     * hacemos una segunda búsqueda solo por nombre.
     */
    const queries = [
      `${cleanName} ${cleanTeam}`.trim(),
      cleanName,
    ].filter(
      (value, index, array) =>
        value &&
        array.indexOf(value) === index
    );

    let lastError = null;

    for (const query of queries) {
      try {
        const results =
          await this.buscar(query);

        const candidate =
          elegirMejorJugador(
            results,
            {
              name: cleanName,
              team: cleanTeam,
            }
          );

        if (candidate) {
          const value = {
            found: true,

            profile: {
              id:
                candidate.id,

              name:
                candidate.name,

              slug:
                candidate.slug,

              teamName:
                candidate.teamName,

              url:
                `https://www.sofascore.com/football/player/${candidate.slug}/${candidate.id}`,
            },

            fallbackUrl:
              crearBusquedaFallback(
                cleanName,
                cleanTeam
              ),
          };

          this.cache.set(
            cacheKey,
            {
              createdAt:
                Date.now(),

              value,
            }
          );

          return value;
        }
      } catch (error) {
        lastError = error;
      }
    }

    const value = {
      found: false,

      profile: null,

      fallbackUrl:
        crearBusquedaFallback(
          cleanName,
          cleanTeam
        ),

      message:
        lastError
          ? "No se pudo resolver automáticamente el perfil de SofaScore."
          : "No encontramos una coincidencia suficientemente segura.",
    };

    /*
     * Cache corto para resultados negativos.
     * Así evitamos repetir la búsqueda cada vez
     * que se abre el mismo modal.
     */
    this.cache.set(
      cacheKey,
      {
        createdAt:
          Date.now() -
          this.cacheTtlMs +
          15 * 60 * 1000,

        value,
      }
    );

    return value;
  }

  async buscar(query) {
    let lastError = null;

    for (
      const endpoint of
        SEARCH_ENDPOINTS
    ) {
      try {
        const url =
          `${endpoint}?q=${encodeURIComponent(
            query
          )}`;

        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json, text/plain, */*",

                "Accept-Language":
                  "es-ES,es;q=0.9,en;q=0.7",

                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36",

                Referer:
                  "https://www.sofascore.com/",
              },
            }
          );

        const body =
          await leerJson(
            response
          );

        if (!response.ok) {
          lastError =
            new Error(
              `SofaScore respondió ${response.status}`
            );

          continue;
        }

        return extraerResultados(
          body
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error(
        "No se pudo consultar SofaScore."
      )
    );
  }
}

function extraerResultados(body) {
  const candidates = [
    body?.results,
    body?.data?.results,
    body?.search?.results,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function elegirMejorJugador(
  results,
  target
) {
  const candidates =
    (results || [])
      .map(
        normalizarResultado
      )
      .filter(Boolean)
      .map((candidate) => ({
        ...candidate,

        score:
          puntuarCoincidencia(
            candidate,
            target
          ),
      }))
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const best =
    candidates[0];

  /*
   * El umbral evita abrir perfiles de homónimos
   * cuando la coincidencia es débil.
   */
  if (
    !best ||
    best.score < 62
  ) {
    return null;
  }

  return best;
}

function normalizarResultado(result) {
  const entity =
    result?.entity ||
    result?.player ||
    result;

  const type =
    String(
      result?.type ||
        entity?.type ||
        ""
    )
      .trim()
      .toLowerCase();

  /*
   * Si el resultado declara explícitamente otro
   * tipo de entidad, lo descartamos.
   */
  if (
    type &&
    ![
      "player",
      "football_player",
      "football-player",
    ].includes(type)
  ) {
    return null;
  }

  const sport =
    String(
      entity?.sport?.slug ||
        result?.sport?.slug ||
        result?.sport ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    sport &&
    ![
      "football",
      "soccer",
    ].includes(sport)
  ) {
    return null;
  }

  const id =
    Number(
      entity?.id ||
        result?.id ||
        0
    );

  const name =
    String(
      entity?.name ||
        result?.name ||
        ""
    ).trim();

  const slug =
    String(
      entity?.slug ||
        result?.slug ||
        ""
    ).trim();

  if (
    !id ||
    !name ||
    !slug
  ) {
    return null;
  }

  const team =
    entity?.team ||
    result?.team ||
    null;

  const teamName =
    String(
      team?.name ||
        result?.team_name ||
        result?.teamName ||
        ""
    ).trim();

  return {
    id,
    name,
    slug,
    teamName,
  };
}

function puntuarCoincidencia(
  candidate,
  target
) {
  const candidateName =
    normalizarTexto(
      candidate.name
    );

  const targetName =
    normalizarTexto(
      target.name
    );

  const candidateTeam =
    normalizarTexto(
      candidate.teamName
    );

  const targetTeam =
    normalizarTexto(
      target.team
    );

  let score = 0;

  if (
    candidateName ===
    targetName
  ) {
    score += 78;
  } else if (
    candidateName.includes(
      targetName
    ) ||
    targetName.includes(
      candidateName
    )
  ) {
    score += 62;
  } else {
    score +=
      tokenSimilarity(
        candidateName,
        targetName
      ) * 60;
  }

  if (
    targetTeam &&
    candidateTeam
  ) {
    if (
      candidateTeam ===
      targetTeam
    ) {
      score += 30;
    } else if (
      candidateTeam.includes(
        targetTeam
      ) ||
      targetTeam.includes(
        candidateTeam
      )
    ) {
      score += 23;
    } else {
      score +=
        tokenSimilarity(
          candidateTeam,
          targetTeam
        ) * 18;
    }
  }

  return score;
}

function tokenSimilarity(
  a,
  b
) {
  if (!a || !b) {
    return 0;
  }

  const aTokens =
    new Set(
      a.split(" ")
        .filter(Boolean)
    );

  const bTokens =
    new Set(
      b.split(" ")
        .filter(Boolean)
    );

  if (
    !aTokens.size ||
    !bTokens.size
  ) {
    return 0;
  }

  let matches = 0;

  for (
    const token of aTokens
  ) {
    if (
      bTokens.has(token)
    ) {
      matches += 1;
    }
  }

  return (
    matches /
    Math.max(
      aTokens.size,
      bTokens.size
    )
  );
}

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

function crearBusquedaFallback(
  name,
  team
) {
  /*
   * Si SofaScore bloquea temporalmente su buscador
   * JSON o hay un homónimo difícil, dejamos un
   * fallback que busca únicamente perfiles de
   * futbolistas de SofaScore.
   */
  const query =
    [
      "site:sofascore.com/football/player",
      `"${name}"`,
      team
        ? `"${team}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(
      query
    )
  );
}

async function leerJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}
