import {
  analizarJugador,
  construirRivales,
  crearFuerzaEquipos,
  enriquecerMercado,
  generarMejorXI,
} from "../analytics/index.js";

import {
  normalizarJugador,
} from "../normalizers/playerNormalizer.js";

import {
  normalizarEquipos,
} from "../normalizers/teamNormalizer.js";

import {
  normalizarJornadas,
} from "../normalizers/roundNormalizer.js";

import {
  SmartCache,
} from "../cache/SmartCache.js";

import {
  loadDashboardSnapshot,
  saveDashboardSnapshot,
} from "../cache/dashboardStore.js";

const API_URL =
  "https://biwenger.as.com/api/v2";

const CF_API_URL =
  "https://cf.biwenger.com/api/v2";

const TTL = {
  market: 3 * 60 * 1000,
  ownUser: 5 * 60 * 1000,
  leagueUsers: 15 * 60 * 1000,
  rivalSquad: 15 * 60 * 1000,
  catalog: 60 * 60 * 1000,
};

const MIN_RELOAD = {
  market: 30 * 1000,
  ownUser: 60 * 1000,
  leagueUsers: 5 * 60 * 1000,
  rivalSquad: 5 * 60 * 1000,
  catalog: 10 * 60 * 1000,
};

const DEFAULT_RATE_LIMIT_COOLDOWN =
  30 * 60 * 1000;

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
    this.score = String(score || "1").trim();

    this.account = null;
    this.league = null;
    this.leagueId = null;
    this.userId = null;

    this.cache = new SmartCache();
    this.rateLimitUntil = 0;

    this.lastDashboard = null;
    this.persistedDashboard = null;
    this.persistedDashboardLoaded = false;
  }

  async inicializar() {
    if (this.account && this.leagueId && this.userId) {
      return;
    }

    if (this.estaEnCooldown()) {
      throw this.crearErrorRateLimit();
    }

    await this.cargarCuenta();
  }

  async cargarCuenta() {
    const response = await fetch(
      `${API_URL}/account`,
      {
        headers: this.crearHeaders(false),
      }
    );

    const body = await this.leerJson(response);

    this.comprobarRateLimit(
      response,
      body,
      "/account"
    );

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

    const leagues = body?.data?.leagues || [];

    if (!leagues.length) {
      throw new Error("No se encontraron ligas.");
    }

    let selectedLeague = leagues[0];

    if (this.leagueName) {
      const found = leagues.find(
        (league) =>
          String(league?.name || "")
            .trim()
            .toLowerCase() ===
          this.leagueName.toLowerCase()
      );

      if (found) selectedLeague = found;
    }

    this.account = body.data;
    this.league = selectedLeague;
    this.leagueId = Number(selectedLeague.id);
    this.userId = Number(selectedLeague?.user?.id);

    if (selectedLeague?.scoreID) {
      this.score = String(selectedLeague.scoreID);
    }

    if (!this.version && body?.data?.version) {
      this.version = String(body.data.version);
    }

    console.log(`[Biwenger] Liga: ${selectedLeague.name}`);
    console.log(`[Biwenger] League ID: ${this.leagueId}`);
    console.log(`[Biwenger] User ID: ${this.userId}`);
    console.log(`[Biwenger] Score: ${this.score}`);
  }

  async request(path, { userId = this.userId } = {}) {
    await this.inicializar();

    if (this.estaEnCooldown()) {
      throw this.crearErrorRateLimit();
    }

    const response = await fetch(
      `${API_URL}${path}`,
      {
        headers: this.crearHeaders(true, userId),
      }
    );

    const body = await this.leerJson(response);

    this.comprobarRateLimit(
      response,
      body,
      path
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

  async obtenerCatalogo({ force = false } = {}) {
    return this.cache.get(
      "catalog",
      {
        ttlMs: TTL.catalog,
        minReloadMs: MIN_RELOAD.catalog,
        force,
        blocked: this.estaEnCooldown(),
        blockedError: this.crearErrorRateLimit(),

        loader: async () => {
          const query =
            `?lang=es&score=${encodeURIComponent(this.score)}`;

          /*
           * El catálogo no necesita sesión.
           * Preferimos el host CF para quitar carga del API principal.
           */
          const urls = [
            `${CF_API_URL}/competitions/la-liga/data${query}`,
            `${API_URL}/competitions/la-liga/data${query}`,
          ];

          let lastError = null;

          for (const url of urls) {
            try {
              const response = await fetch(
                url,
                {
                  headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "es-ES,es;q=0.9",
                  },
                }
              );

              const body = await this.leerJson(response);

              this.comprobarRateLimit(
                response,
                body,
                "/competitions/la-liga/data"
              );

              if (response.ok) {
                return body;
              }

              lastError = new Error(
                `No se pudo obtener el catálogo (${response.status})`
              );
            } catch (error) {
              lastError = error;

              if (error?.code === "BIWENGER_RATE_LIMIT") {
                throw error;
              }
            }
          }

          throw (
            lastError ||
            new Error("No se pudo obtener el catálogo de LaLiga.")
          );
        },
      }
    );
  }

  async obtenerUsuariosLiga({ force = false } = {}) {
    return this.cache.get(
      "league-users",
      {
        ttlMs: TTL.leagueUsers,
        minReloadMs: MIN_RELOAD.leagueUsers,
        force,
        blocked: this.estaEnCooldown(),
        blockedError: this.crearErrorRateLimit(),

        loader: async () => {
          const response = await this.request(
            `/league/${this.leagueId}`
          );

          const rawUsers =
            response?.data?.users ||
            response?.data?.league?.users ||
            [];

          return Array.isArray(rawUsers)
            ? rawUsers
            : Object.values(rawUsers || {});
        },
      }
    );
  }

  async obtenerUsuarioPropio({ force = false } = {}) {
    return this.cache.get(
      "own-user",
      {
        ttlMs: TTL.ownUser,
        minReloadMs: MIN_RELOAD.ownUser,
        force,
        blocked: this.estaEnCooldown(),
        blockedError: this.crearErrorRateLimit(),

        loader: () =>
          this.request("/user?fields=players(id,owner)"),
      }
    );
  }

  async obtenerMercado({ force = false } = {}) {
    return this.cache.get(
      "market",
      {
        ttlMs: TTL.market,
        minReloadMs: MIN_RELOAD.market,
        force,
        blocked: this.estaEnCooldown(),
        blockedError: this.crearErrorRateLimit(),

        loader: () =>
          this.request("/market"),
      }
    );
  }

  async obtenerPlantillaUsuario(
    userId,
    { force = false } = {}
  ) {
    const id = Number(userId);

    if (!id) {
      return [];
    }

    return this.cache.get(
      `rival-squad:${id}`,
      {
        ttlMs: TTL.rivalSquad,
        minReloadMs: MIN_RELOAD.rivalSquad,
        force,
        blocked: this.estaEnCooldown(),
        blockedError: this.crearErrorRateLimit(),

        loader: async () => {
          try {
            const response = await this.request(
              "/user?fields=players(id,owner)",
              {
                userId: id,
              }
            );

            return response?.data?.players || [];
          } catch (error) {
            if (error?.code === "BIWENGER_RATE_LIMIT") {
              throw error;
            }

            console.warn(
              `[Biwenger] No se pudo cargar plantilla de usuario ${id}:`,
              error.message
            );

            return [];
          }
        },
      }
    );
  }

  async obtenerDashboard({ refresh = "smart" } = {}) {
    try {
      await this.inicializar();

      const forceMarket =
        ["market", "core", "action", "all"].includes(refresh);

      const forceOwn =
        ["core", "action", "all"].includes(refresh);

      const forceUsers =
        refresh === "all";

      const forceRivals =
        refresh === "all";

      const forceCatalog =
        refresh === "all";

      const [
        ownUserResponse,
        marketResponse,
        catalogResponse,
        leagueUsers,
      ] = await Promise.all([
        this.obtenerUsuarioPropio({
          force: forceOwn,
        }),
        this.obtenerMercado({
          force: forceMarket,
        }),
        this.obtenerCatalogo({
          force: forceCatalog,
        }),
        this.obtenerUsuariosLiga({
          force: forceUsers,
        }),
      ]);

      const catalogData =
        catalogResponse?.data || {};

      const catalogPlayers =
        catalogData?.players || {};

      const teamsMap =
        normalizarEquipos(catalogData);

      const roundsMap =
        normalizarJornadas(catalogData);

      const teamStrengths =
        crearFuerzaEquipos(
          catalogPlayers,
          teamsMap
        );

      const normalizeContext = {
        teamsMap,
        roundsMap,
        teamStrengths,
      };

      const normalizedPlayersById = {};

      const getPlayer = (
        playerId,
        context = "squad"
      ) => {
        const id = Number(playerId || 0);

        if (!id) return null;

        if (!normalizedPlayersById[id]) {
          const raw =
            catalogPlayers[String(id)] || { id };

          const base =
            normalizarJugador(
              raw,
              normalizeContext
            );

          normalizedPlayersById[id] = {
            ...base,
            analysis: analizarJugador(base, "squad"),
          };
        }

        const base =
          normalizedPlayersById[id];

        if (context === "market") {
          return {
            ...base,
            analysis: analizarJugador(base, "market"),
          };
        }

        return base;
      };

      /*
       * MI EQUIPO
       */
      const ownRows =
        ownUserResponse?.data?.players || [];

      const squad = ownRows
        .map((row) =>
          getPlayer(row?.id, "squad")
        )
        .filter(Boolean)
        .sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        );

      /*
       * FINANZAS
       */
      const status =
        marketResponse?.data?.status || {};

      const balance =
        Number(status.balance || 0);

      const maximumBid =
        Number(status.maximumBid || 0);

      const teamValue =
        squad.reduce(
          (total, player) =>
            total + Number(player.price || 0),
          0
        );

      const finances = {
        balance,
        maximumBid,
        teamValue,
        totalAssets: balance + teamValue,
      };

      /*
       * RIVALES
       *
       * Se cargan con concurrencia máxima 2 para evitar
       * una ráfaga de 7-10 llamadas simultáneas al iniciar.
       */
      const rivalsToLoad =
        (leagueUsers || []).filter(
          (user) =>
            Number(user?.id || 0) &&
            Number(user?.id) !== Number(this.userId)
        );

      const rivalSquadResults =
        await mapWithConcurrencySettled(
          rivalsToLoad,
          2,
          async (user) => ({
            userId: Number(user.id),
            rows: await this.obtenerPlantillaUsuario(
              Number(user.id),
              {
                force: forceRivals,
              }
            ),
          })
        );

      const squadsByUser = {};

      for (const result of rivalSquadResults) {
        if (result.status !== "fulfilled") {
          continue;
        }

        const { userId, rows } = result.value;

        squadsByUser[userId] =
          (rows || [])
            .map((row) => Number(row?.id || 0))
            .filter(Boolean);

        for (const playerId of squadsByUser[userId]) {
          getPlayer(playerId, "squad");
        }
      }

      const rivals =
        construirRivales({
          users: leagueUsers,
          squadsByUser,
          normalizedPlayersById,
          myUserId: this.userId,
        });

      /*
       * MERCADO
       */
      const sales =
        marketResponse?.data?.sales || [];

      const rawMarket =
        sales
          .map((sale) => {
            const player =
              getPlayer(
                sale?.player?.id,
                "market"
              );

            if (!player) return null;

            const ownerId =
              Number(sale?.user?.id || 0);

            const sellerType =
              ownerId > 0
                ? "user"
                : "market";

            const sellerName =
              sellerType === "market"
                ? "Mercado Biwenger"
                : sale?.user?.name ||
                  `Usuario ${ownerId}`;

            return {
              ...player,

              saleId:
                Number(sale?.id || 0) || null,

              salePrice:
                Number(
                  sale?.price ||
                  player.price ||
                  0
                ),

              ownerId,
              ownerName: sellerName,
              sellerType,

              seller: {
                type: sellerType,
                id: ownerId || null,
                name: sellerName,
              },

              isMine:
                ownerId === Number(this.userId),

              until:
                normalizarTimestampSeconds(
                  sale?.until
                ),

              date:
                normalizarTimestampSeconds(
                  sale?.date
                ),
            };
          })
          .filter(Boolean);

      const marketMeta =
        crearResumenMercado(rawMarket);

      const market =
        enriquecerMercado(
          rawMarket,
          rivals,
          finances
        ).sort((a, b) => {
          const aBid =
            a.marketIntelligence?.shouldBid ? 1 : 0;

          const bBid =
            b.marketIntelligence?.shouldBid ? 1 : 0;

          if (aBid !== bBid) {
            return bBid - aBid;
          }

          return (
            Number(b.analysis?.score || 0) -
            Number(a.analysis?.score || 0)
          );
        });

      const bestXI =
        generarMejorXI(
          squad,
          this.league?.settings || {}
        );

      const dashboard = {
        syncedAt: new Date().toISOString(),

        league: {
          id: this.leagueId,
          name: this.league?.name || "Mi Liga",
          scoreID: Number(this.score),

          settings: {
            balanceHidden:
              this.league?.settings?.balance === "hidden",

            lineupCaptain:
              this.league?.settings?.lineupCaptain !== false,

            lineupStriker:
              this.league?.settings?.lineupStriker !== false,

            lineupAllowExtra:
              Boolean(
                this.league?.settings?.lineupAllowExtra
              ),
          },
        },

        user: {
          id: this.userId,

          name:
            this.league?.user?.name ||
            "Mi equipo",

          points:
            Number(
              this.league?.user?.points || 0
            ),

          position:
            Number(
              this.league?.user?.position || 0
            ) || null,
        },

        finances,
        squad,
        market,
        marketMeta,
        bestXI,
        rivals,

        system: {
          refreshMode: refresh,

          rateLimited:
            this.estaEnCooldown(),

          rateLimitUntil:
            this.rateLimitUntil
              ? new Date(this.rateLimitUntil).toISOString()
              : null,

          cache:
            this.cache.getMeta(),

          cachePolicy: {
            marketSeconds:
              TTL.market / 1000,

            ownUserSeconds:
              TTL.ownUser / 1000,

            rivalsSeconds:
              TTL.rivalSquad / 1000,

            leagueUsersSeconds:
              TTL.leagueUsers / 1000,

            catalogSeconds:
              TTL.catalog / 1000,
          },
        },
      };

      this.lastDashboard = dashboard;
      this.persistedDashboard = dashboard;
      this.persistedDashboardLoaded = true;

      /*
       * No esperamos la escritura del archivo para responder.
       */
      void saveDashboardSnapshot(dashboard);

      return dashboard;
    } catch (error) {
      const fallback =
        this.lastDashboard ||
        await this.obtenerDashboardPersistido();

      if (
        fallback &&
        error?.code === "BIWENGER_RATE_LIMIT"
      ) {
        return {
          ...fallback,

          system: {
            ...fallback?.system,

            rateLimited: true,

            rateLimitUntil:
              this.rateLimitUntil
                ? new Date(this.rateLimitUntil).toISOString()
                : null,

            servingStale: true,

            message:
              "Biwenger limitó temporalmente las peticiones. Se muestran los últimos datos guardados y no se seguirá insistiendo contra la API.",
          },
        };
      }

      throw error;
    }
  }

  async obtenerDashboardPersistido() {
    if (this.persistedDashboardLoaded) {
      return this.persistedDashboard || null;
    }

    this.persistedDashboardLoaded = true;

    this.persistedDashboard =
      await loadDashboardSnapshot();

    return this.persistedDashboard;
  }

  invalidarCache({
    market = false,
    ownUser = false,
    rivals = false,
    catalog = false,
    leagueUsers = false,
    all = false,
  } = {}) {
    if (all) {
      this.cache.clear();
      return;
    }

    if (market) {
      this.cache.invalidate("market");
    }

    if (ownUser) {
      this.cache.invalidate("own-user");
    }

    if (leagueUsers) {
      this.cache.invalidate("league-users");
    }

    if (catalog) {
      this.cache.invalidate("catalog");
    }

    if (rivals) {
      this.cache.invalidatePrefix("rival-squad:");
    }
  }

  async writeRequest(
    path,
    {
      method = "POST",
      body,
      userId = this.userId,
    } = {}
  ) {
    await this.inicializar();

    if (this.estaEnCooldown()) {
      throw this.crearErrorRateLimit(
        "Biwenger tiene activo un límite temporal de peticiones. Por seguridad no enviaremos operaciones reales hasta que termine."
      );
    }

    /*
     * Escrituras sin retry automático.
     */
    const response = await fetch(
      `${API_URL}${path}`,
      {
        method,
        headers: this.crearHeaders(true, userId),
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      }
    );

    const result =
      await this.leerJson(response);

    this.comprobarRateLimit(
      response,
      result,
      path
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
        result?.message ||
        result?.error ||
        `Biwenger rechazó la operación (${response.status}).`
      );
    }

    if (Number(result?.status || 200) >= 400) {
      throw new Error(
        result?.message ||
        "Biwenger rechazó la operación."
      );
    }

    return result;
  }

  async pujarJugador({
    playerId,
    amount,
  }) {
    await this.inicializar();

    if (this.estaEnCooldown()) {
      throw this.crearErrorRateLimit(
        "No se puede pujar mientras Biwenger mantiene el límite temporal."
      );
    }

    const id = Number(playerId);
    const bid =
      Math.round(Number(amount));

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Jugador inválido.");
    }

    if (!Number.isFinite(bid) || bid <= 0) {
      throw new Error(
        "La puja debe ser mayor a 0 €."
      );
    }

    /*
     * Verificación puntual justo al confirmar.
     */
    const marketResponse =
      await this.request("/market");

    const sales =
      marketResponse?.data?.sales || [];

    const sale = sales.find(
      (item) =>
        Number(item?.player?.id || 0) === id
    );

    if (!sale) {
      throw new Error(
        "El jugador ya no está disponible en el mercado."
      );
    }

    const sellerId =
      Number(sale?.user?.id || 0);

    if (sellerId === Number(this.userId)) {
      throw new Error(
        "No puedes pujar por un jugador ofrecido por ti."
      );
    }

    const maximumBid =
      Number(
        marketResponse?.data?.status?.maximumBid || 0
      );

    if (
      maximumBid > 0 &&
      bid > maximumBid
    ) {
      throw new Error(
        `La puja supera tu límite actual de ${maximumBid.toLocaleString("es-ES")} €.`
      );
    }

    const body = {
      to:
        sellerId > 0
          ? sellerId
          : null,

      type: "purchase",
      amount: bid,
      requestedPlayers: [id],
    };

    const result =
      await this.writeRequest(
        "/offers",
        {
          method: "POST",
          body,
        }
      );

    /*
     * Solo estos módulos pueden haber cambiado.
     */
    this.invalidarCache({
      market: true,
      ownUser: true,
    });

    return {
      operation: "bid",
      playerId: id,
      amount: bid,
      sellerId: sellerId || null,
      sellerType:
        sellerId > 0
          ? "user"
          : "market",
      biwenger: result,
    };
  }

  async ponerJugadorVenta({
    playerId,
    price,
    rejectOffers = false,
  }) {
    await this.inicializar();

    if (this.estaEnCooldown()) {
      throw this.crearErrorRateLimit(
        "No se puede publicar una venta mientras Biwenger mantiene el límite temporal."
      );
    }

    const id = Number(playerId);

    const salePrice =
      Math.round(Number(price));

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Jugador inválido.");
    }

    if (
      !Number.isFinite(salePrice) ||
      salePrice <= 0
    ) {
      throw new Error(
        "El precio de venta debe ser mayor a 0 €."
      );
    }

    /*
     * Verificación puntual justo al confirmar.
     */
    const userResponse =
      await this.request(
        "/user?fields=players(id,owner)"
      );

    const ownPlayers =
      userResponse?.data?.players || [];

    const isMine =
      ownPlayers.some(
        (item) =>
          Number(item?.id || 0) === id
      );

    if (!isMine) {
      throw new Error(
        "Ese jugador ya no pertenece a tu plantilla."
      );
    }

    const body = {
      type: "sell",
      player: id,
      price: salePrice,
      rejectOffers:
        Boolean(rejectOffers),
    };

    const result =
      await this.writeRequest(
        "/market",
        {
          method: "POST",
          body,
        }
      );

    this.invalidarCache({
      market: true,
      ownUser: true,
    });

    return {
      operation: "sell",
      playerId: id,
      price: salePrice,
      rejectOffers:
        Boolean(rejectOffers),
      biwenger: result,
    };
  }

  estaEnCooldown() {
    return (
      Number(this.rateLimitUntil || 0) >
      Date.now()
    );
  }

  comprobarRateLimit(
    response,
    body,
    path
  ) {
    if (
      !esRateLimitResponse(
        response,
        body
      )
    ) {
      return;
    }

    const retryAfter =
      parseRetryAfter(
        response?.headers?.get("retry-after")
      );

    const cooldown =
      retryAfter ||
      DEFAULT_RATE_LIMIT_COOLDOWN;

    this.rateLimitUntil =
      Math.max(
        this.rateLimitUntil,
        Date.now() + cooldown
      );

    console.warn(
      `[Biwenger] Rate limit en ${path}. Cooldown hasta ${new Date(
        this.rateLimitUntil
      ).toLocaleString()}.`
    );

    throw this.crearErrorRateLimit();
  }

  crearErrorRateLimit(
    customMessage = ""
  ) {
    const remaining =
      Math.max(
        0,
        this.rateLimitUntil - Date.now()
      );

    const minutes =
      Math.max(
        1,
        Math.ceil(remaining / 60_000)
      );

    const error = new Error(
      customMessage ||
      `Biwenger limitó temporalmente las peticiones. El sistema no volverá a consultar la API durante aproximadamente ${minutes} min y usará datos en caché.`
    );

    error.code =
      "BIWENGER_RATE_LIMIT";

    error.retryAt =
      this.rateLimitUntil || null;

    return error;
  }

  crearHeaders(
    includeLeague = false,
    userId = this.userId
  ) {
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "X-Lang": "es",
      Authorization: `Bearer ${this.token}`,
    };

    if (this.version) {
      headers["X-Version"] =
        this.version;
    }

    if (includeLeague) {
      headers["X-League"] =
        String(this.leagueId);

      headers["X-User"] =
        String(userId);
    }

    return headers;
  }

  async leerJson(response) {
    const text =
      await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  }
}

function esRateLimitResponse(
  response,
  body
) {
  if (response?.status === 429) {
    return true;
  }

  const text =
    String(
      body?.message ||
      body?.error ||
      ""
    )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase();

  return (
    text.includes("numero maximo de peticiones") ||
    text.includes("maximo de peticiones") ||
    text.includes("maximum number of requests") ||
    text.includes("too many requests") ||
    text.includes("demasiadas peticiones")
  );
}

function parseRetryAfter(value) {
  if (!value) return 0;

  const seconds = Number(value);

  if (
    Number.isFinite(seconds) &&
    seconds > 0
  ) {
    return seconds * 1000;
  }

  const date = Date.parse(value);

  if (
    Number.isFinite(date) &&
    date > Date.now()
  ) {
    return date - Date.now();
  }

  return 0;
}

async function mapWithConcurrencySettled(
  items,
  limit,
  mapper
) {
  const results =
    new Array(items.length);

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        results[index] = {
          status: "fulfilled",
          value:
            await mapper(
              items[index],
              index
            ),
        };
      } catch (reason) {
        results[index] = {
          status: "rejected",
          reason,
        };
      }
    }
  }

  const workers =
    Array.from(
      {
        length:
          Math.min(
            Math.max(1, limit),
            items.length || 1
          ),
      },
      () => worker()
    );

  await Promise.all(workers);

  return results;
}

function normalizarTimestampSeconds(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" ||
    /^\d+(?:\.\d+)?$/.test(
      String(value).trim()
    )
  ) {
    const numeric = Number(value);

    if (
      !Number.isFinite(numeric) ||
      numeric <= 0
    ) {
      return null;
    }

    if (numeric > 10_000_000_000) {
      return Math.floor(numeric / 1000);
    }

    return Math.floor(numeric);
  }

  const parsed =
    Date.parse(String(value));

  return Number.isFinite(parsed)
    ? Math.floor(parsed / 1000)
    : null;
}

function crearResumenMercado(marketPlayers) {
  const now =
    Math.floor(Date.now() / 1000);

  const visible =
    (marketPlayers || []).filter(
      (player) => !player.isMine
    );

  const systemListings =
    visible.filter(
      (player) =>
        player.sellerType === "market"
    );

  const managerListings =
    visible.filter(
      (player) =>
        player.sellerType === "user"
    );

  const futureSystemExpirations =
    systemListings
      .map((player) =>
        Number(player.until || 0)
      )
      .filter(
        (timestamp) =>
          timestamp > now
      );

  const futureAllExpirations =
    visible
      .map((player) =>
        Number(player.until || 0)
      )
      .filter(
        (timestamp) =>
          timestamp > now
      );

  const expirations =
    futureSystemExpirations.length
      ? futureSystemExpirations
      : futureAllExpirations;

  return {
    totalListings:
      visible.length,

    systemListings:
      systemListings.length,

    managerListings:
      managerListings.length,

    nextMarketChangeAt:
      expirations.length
        ? Math.min(...expirations)
        : null,

    nextMarketChangeSource:
      futureSystemExpirations.length
        ? "system-listing-expiry"
        : futureAllExpirations.length
          ? "listing-expiry"
          : "unavailable",
  };
}

function limpiarToken(token) {
  return String(token)
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}
