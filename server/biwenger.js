const API_URL = "https://biwenger.as.com/api/v2";
const CF_URL = "https://cf.biwenger.com/api/v2";

export class BiwengerClient {
  constructor({
    token,
    version = "",
    leagueName = "",
    score = "1",
  }) {
    if (!token) {
      throw new Error(
        "No existe BIWENGER_TOKEN en el archivo .env"
      );
    }

    this.token = limpiarToken(token);
    this.version = String(version || "").trim();
    this.leagueName = String(leagueName || "").trim();
    this.score = String(score || "1");

    this.account = null;
    this.league = null;
    this.leagueId = null;
    this.userId = null;
  }

  async inicializar() {
    if (
      this.account &&
      this.leagueId &&
      this.userId
    ) {
      return;
    }

    await this.cargarCuenta();
  }

  async cargarCuenta() {
    const response = await fetch(
      `${API_URL}/account`,
      {
        method: "GET",
        headers: this.crearHeaders(false),
      }
    );

    const body = await this.leerJson(response);

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "El token de Biwenger no es válido o ha caducado."
      );
    }

    if (!response.ok) {
      throw new Error(
        body?.message ||
          `Error consultando la cuenta (${response.status})`
      );
    }

    const leagues =
      body?.data?.leagues || [];

    if (!leagues.length) {
      throw new Error(
        "No se encontraron ligas."
      );
    }

    let selectedLeague =
      leagues[0];

    if (this.leagueName) {
      const encontrada =
        leagues.find(
          (league) =>
            String(
              league?.name || ""
            )
              .trim()
              .toLowerCase() ===
            this.leagueName.toLowerCase()
        );

      if (encontrada) {
        selectedLeague =
          encontrada;
      }
    }

    this.account = body.data;
    this.league = selectedLeague;

    this.leagueId = Number(
      selectedLeague.id
    );

    this.userId = Number(
      selectedLeague?.user?.id
    );

    /*
     * Detectamos automáticamente
     * el sistema de puntuación.
     *
     * En tu liga:
     * 1 = Diario AS
     */
    if (selectedLeague?.scoreID) {
      this.score = String(
        selectedLeague.scoreID
      );
    }

    /*
     * Biwenger también devuelve
     * la versión actual.
     */
    if (
      !this.version &&
      body?.data?.version
    ) {
      this.version = String(
        body.data.version
      );
    }

    console.log(
      "Liga:",
      selectedLeague.name
    );

    console.log(
      "Liga ID:",
      this.leagueId
    );

    console.log(
      "Usuario ID:",
      this.userId
    );

    console.log(
      "Score:",
      this.score
    );

    console.log(
      "Version:",
      this.version
    );
  }

  async request(path) {
    await this.inicializar();

    const response = await fetch(
      `${API_URL}${path}`,
      {
        method: "GET",
        headers:
          this.crearHeaders(true),
      }
    );

    const body =
      await this.leerJson(
        response
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "La sesión de Biwenger ha caducado."
      );
    }

    if (!response.ok) {
      throw new Error(
        body?.message ||
          `Error ${response.status} en ${path}`
      );
    }

    return body;
  }

  async obtenerCatalogo() {
    const url =
      `${CF_URL}/competitions/la-liga/data` +
      `?lang=es&score=${encodeURIComponent(
        this.score
      )}`;

    const response =
      await fetch(url, {
        headers: {
          Accept:
            "application/json, text/plain, */*",

          "Accept-Language":
            "es-ES,es;q=0.9",
        },
      });

    const body =
      await this.leerJson(
        response
      );

    if (!response.ok) {
      throw new Error(
        `No se pudo obtener LaLiga (${response.status})`
      );
    }

    return body;
  }

  async obtenerDashboard() {
    await this.inicializar();

    const [
      userResponse,
      marketResponse,
      catalogResponse,
    ] =
      await Promise.all([
        this.request(
          "/user?fields=players(id,owner)"
        ),

        this.request(
          "/market"
        ),

        this.obtenerCatalogo(),
      ]);

    const catalogData =
      catalogResponse?.data || {};

    const catalogPlayers =
      catalogData?.players || {};

    /*
     * Mapa:
     *
     * teamID -> nombre club
     */
    const teams =
      crearMapaEquipos(
        catalogData
      );

    /*
     |--------------------------------------------------------------------------
     | PLANTILLA
     |--------------------------------------------------------------------------
     */

    const userPlayers =
      userResponse?.data
        ?.players || [];

    const squad =
      userPlayers
        .map((row) => {
          const id =
            Number(row.id);

          const info =
            catalogPlayers[
              String(id)
            ] || {};

          const player =
            normalizarJugador(
              {
                id,
                ...info,
              },
              teams
            );

          return {
            ...player,

            analysis:
              analizarJugador(
                player,
                "squad"
              ),
          };
        })

        .sort(
          (a, b) =>
            Number(b.price) -
            Number(a.price)
        );

    /*
     |--------------------------------------------------------------------------
     | MERCADO
     |--------------------------------------------------------------------------
     */

    const sales =
      marketResponse?.data
        ?.sales || [];

    const market =
      sales
        .map((sale) => {
          const playerId =
            Number(
              sale?.player?.id
            );

          const info =
            catalogPlayers[
              String(playerId)
            ] || {};

          const player =
            normalizarJugador(
              {
                id: playerId,
                ...info,
              },
              teams
            );

          const ownerId =
            Number(
              sale?.user?.id ||
                0
            );

          return {
            ...player,

            salePrice:
              Number(
                sale?.price ||
                  0
              ),

            ownerId,

            ownerName:
              sale?.user?.name ||
              "Mercado",

            isMine:
              ownerId ===
              this.userId,

            until:
              sale?.until ||
              null,

            analysis:
              analizarJugador(
                player,
                "market"
              ),
          };
        })

        .sort(
          (a, b) =>
            Number(
              b.analysis.score
            ) -
            Number(
              a.analysis.score
            )
        );

    /*
     |--------------------------------------------------------------------------
     | DINERO
     |--------------------------------------------------------------------------
     */

    const status =
      marketResponse?.data
        ?.status || {};

    const balance =
      Number(
        status.balance || 0
      );

    const maximumBid =
      Number(
        status.maximumBid ||
          0
      );

    const teamValue =
      squad.reduce(
        (
          total,
          player
        ) =>
          total +
          Number(
            player.price ||
              0
          ),
        0
      );

    /*
     |--------------------------------------------------------------------------
     | RESPUESTA
     |--------------------------------------------------------------------------
     */

    return {
      syncedAt:
        new Date().toISOString(),

      league: {
        id:
          this.leagueId,

        name:
          this.league
            ?.name ||
          "Mi Liga",

        scoreID:
          Number(
            this.score
          ),
      },

      user: {
        id:
          this.userId,

        name:
          this.league
            ?.user?.name ||
          "Mi equipo",
      },

      finances: {
        balance,

        maximumBid,

        teamValue,

        totalAssets:
          balance +
          teamValue,
      },

      squad,

      market,
    };
  }

  crearHeaders(
    includeLeague = false
  ) {
    const headers = {
      Accept:
        "application/json, text/plain, */*",

      "Content-Type":
        "application/json",

      "X-Lang":
        "es",

      Authorization:
        `Bearer ${this.token}`,
    };

    if (this.version) {
      headers["X-Version"] =
        this.version;
    }

    if (includeLeague) {
      headers["X-League"] =
        String(
          this.leagueId
        );

      headers["X-User"] =
        String(
          this.userId
        );
    }

    return headers;
  }

  async leerJson(
    response
  ) {
    const text =
      await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(
        text
      );
    } catch {
      return {
        message: text,
      };
    }
  }
}

/*
|--------------------------------------------------------------------------
| MAPA EQUIPOS
|--------------------------------------------------------------------------
*/

function crearMapaEquipos(
  data
) {
  const teams = {};

  /*
   * Por si Biwenger devuelve
   * directamente data.teams.
   */

  if (data?.teams) {
    const rawTeams =
      Array.isArray(
        data.teams
      )
        ? data.teams
        : Object.values(
            data.teams
          );

    rawTeams.forEach(
      (team) => {
        if (!team?.id) {
          return;
        }

        teams[
          Number(team.id)
        ] = {
          id:
            Number(
              team.id
            ),

          name:
            team.name ||
            "Sin club",

          slug:
            team.slug ||
            "",
        };
      }
    );
  }

  /*
   * También podemos obtenerlos
   * de los partidos activos.
   */

  const events =
    data?.activeEvents ||
    [];

  events.forEach(
    (event) => {
      const games =
        event?.games ||
        [];

      games.forEach(
        (game) => {
          [
            game?.home,
            game?.away,
          ].forEach(
            (team) => {
              if (
                !team?.id
              ) {
                return;
              }

              teams[
                Number(
                  team.id
                )
              ] = {
                id:
                  Number(
                    team.id
                  ),

                name:
                  team.name ||
                  "Sin club",

                slug:
                  team.slug ||
                  "",
              };
            }
          );
        }
      );
    }
  );

  return teams;
}

/*
|--------------------------------------------------------------------------
| NORMALIZAR JUGADOR
|--------------------------------------------------------------------------
*/

function normalizarJugador(
  player,
  teams
) {
  const posiciones = {
    1: "AR",
    2: "DF",
    3: "MC",
    4: "DL",
    5: "DT",
  };

  const teamId =
    Number(
      player.teamID ||
        player?.team?.id ||
        0
    );

  const team =
    teams?.[teamId] ||
    null;

  const id =
    Number(
      player.id || 0
    );

  return {
    id,

    name:
      player.name ||
      `Jugador ${id}`,

    slug:
      player.slug ||
      "",

    teamId,

    teamName:
      team?.name ||
      "Sin club",

    teamSlug:
      team?.slug ||
      "",

    position:
      posiciones[
        Number(
          player.position
        )
      ] ||
      String(
        player.position ||
          "?"
      ),

    altPositions:
      Array.isArray(
        player.altPositions
      )
        ? player.altPositions
        : [],

    price:
      Number(
        player.price || 0
      ),

    fantasyPrice:
      Number(
        player.fantasyPrice ||
          0
      ),

    priceIncrement:
      Number(
        player.priceIncrement ||
          0
      ),

    points:
      Number(
        player.points || 0
      ),

    pointsLastSeason:
      player.pointsLastSeason ==
      null
        ? null
        : Number(
            player.pointsLastSeason
          ),

    playedHome:
      Number(
        player.playedHome ||
          0
      ),

    playedAway:
      Number(
        player.playedAway ||
          0
      ),

    pointsHome:
      Number(
        player.pointsHome ||
          0
      ),

    pointsAway:
      Number(
        player.pointsAway ||
          0
      ),

    status:
      player.status ||
      "unknown",

    statusInfo:
      player.statusInfo ||
      "",

    fitness:
      Array.isArray(
        player.fitness
      )
        ? player.fitness
            .slice(0, 3)
        : [],

    iconHero:
      player.iconHero ||
      "",

    /*
     * Biwenger usa rutas relativas
     * para algunas imágenes.
     */

    photoUrl:
      player.iconHero
        ? `https://cdn.biwenger.com/${player.iconHero}`
        : `https://cdn.biwenger.com/i/p/${id}.png`,
  };
}

/*
|--------------------------------------------------------------------------
| ANALIZADOR AUTOMÁTICO
|--------------------------------------------------------------------------
*/

function analizarJugador(
  player,
  context
) {
  const recent =
    Array.isArray(
      player.fitness
    )
      ? player.fitness
          .slice(0, 3)
      : [];

  /*
   * Null, lesión, sanción, etc.
   * cuentan como 0 para la forma.
   */

  const recentNumbers =
    [0, 1, 2].map(
      (index) => {
        const value =
          recent[index];

        return typeof value ===
          "number"
          ? value
          : 0;
      }
    );

  const recentAverage =
    recentNumbers.reduce(
      (a, b) => a + b,
      0
    ) / 3;

  /*
   * Forma reciente.
   *
   * Media de 8 puntos
   * aproximadamente = 100.
   */

  const formScore =
    clamp(
      (recentAverage /
        8) *
        100,
      0,
      100
    );

  /*
   * Puntos actuales.
   *
   * Estamos al inicio de temporada,
   * 24 puntos ya representan
   * rendimiento muy alto.
   */

  const pointsScore =
    clamp(
      (player.points /
        24) *
        100,
      0,
      100
    );

  /*
   * Tendencia relativa:
   *
   * mejor medir porcentaje
   * que cantidad absoluta.
   */

  const trendPercent =
    player.price > 0
      ? (player.priceIncrement /
          player.price) *
        100
      : 0;

  const trendScore =
    clamp(
      50 +
        trendPercent *
          18,
      0,
      100
    );

  /*
   * Puntos por millón.
   */

  const priceMillions =
    player.price /
    1_000_000;

  const pointsPerMillion =
    priceMillions > 0
      ? player.points /
        priceMillions
      : 0;

  const valueScore =
    clamp(
      (pointsPerMillion /
        6) *
        100,
      0,
      100
    );

  /*
   * Estado físico.
   */

  const statusScores = {
    ok: 100,

    doubt: 55,

    injured: 20,

    sanctioned: 25,

    discarded: 5,

    unknown: 45,
  };

  const statusScore =
    statusScores[
      player.status
    ] ?? 45;

  /*
   * Temporada anterior.
   */

  const lastSeasonScore =
    player.pointsLastSeason ==
    null
      ? 50
      : clamp(
          (player.pointsLastSeason /
            160) *
            100,
          0,
          100
        );

  /*
   * NOTA FINAL.
   */

  let score =
    Math.round(
      formScore * 0.32 +
        pointsScore *
          0.22 +
        trendScore *
          0.14 +
        valueScore *
          0.14 +
        statusScore *
          0.13 +
        lastSeasonScore *
          0.05
    );

  score =
    clamp(
      score,
      0,
      100
    );

  /*
   * Recomendación.
   */

  const recommendation =
    obtenerRecomendacion(
      player,
      score,
      context
    );

  const reasons =
    generarRazones(
      player,
      {
        recentAverage,
        trendPercent,
        pointsPerMillion,
      }
    );

  return {
    score,

    recommendation,

    recentAverage:
      Number(
        recentAverage.toFixed(
          1
        )
      ),

    trendPercent:
      Number(
        trendPercent.toFixed(
          2
        )
      ),

    pointsPerMillion:
      Number(
        pointsPerMillion.toFixed(
          2
        )
      ),

    breakdown: {
      form:
        Math.round(
          formScore
        ),

      points:
        Math.round(
          pointsScore
        ),

      trend:
        Math.round(
          trendScore
        ),

      value:
        Math.round(
          valueScore
        ),

      availability:
        Math.round(
          statusScore
        ),

      history:
        Math.round(
          lastSeasonScore
        ),
    },

    reasons,
  };
}

function obtenerRecomendacion(
  player,
  score,
  context
) {
  /*
   * Mercado
   */

  if (
    context === "market"
  ) {
    if (
      player.status !==
      "ok"
    ) {
      return "VIGILAR";
    }

    if (score >= 68) {
      return "FICHAR";
    }

    return "VIGILAR";
  }

  /*
   * Plantilla propia
   */

  if (
    player.status ===
    "discarded"
  ) {
    return "VENDER";
  }

  /*
   * No vendemos automáticamente
   * por una lesión o sanción.
   */

  if (
    [
      "injured",
      "doubt",
      "sanctioned",
    ].includes(
      player.status
    )
  ) {
    return "VIGILAR";
  }

  if (score >= 58) {
    return "MANTENER";
  }

  if (score < 35) {
    return "VENDER";
  }

  return "VIGILAR";
}

/*
|--------------------------------------------------------------------------
| RAZONES
|--------------------------------------------------------------------------
*/

function generarRazones(
  player,
  {
    recentAverage,
    trendPercent,
    pointsPerMillion,
  }
) {
  const reasons = [];

  if (
    player.status !== "ok"
  ) {
    reasons.push(
      player.statusInfo ||
        "Estado físico a vigilar"
    );
  }

  if (
    recentAverage >= 6
  ) {
    reasons.push(
      "Buena forma reciente"
    );
  } else if (
    recentAverage <= 2
  ) {
    reasons.push(
      "Forma reciente baja"
    );
  }

  if (
    trendPercent >= 1
  ) {
    reasons.push(
      "Valor de mercado subiendo"
    );
  }

  if (
    trendPercent <= -1
  ) {
    reasons.push(
      "Valor de mercado bajando"
    );
  }

  if (
    pointsPerMillion >= 4
  ) {
    reasons.push(
      "Buen rendimiento por precio"
    );
  }

  return reasons.slice(
    0,
    2
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}

function limpiarToken(
  token
) {
  return String(token)
    .trim()
    .replace(
      /^Bearer\s+/i,
      ""
    )
    .trim();
}