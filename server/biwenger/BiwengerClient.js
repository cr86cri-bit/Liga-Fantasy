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

const API_URL = "https://biwenger.as.com/api/v2";

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
  }

  async inicializar() {
    if (this.account && this.leagueId && this.userId) return;
    await this.cargarCuenta();
  }

  async cargarCuenta() {
    const response = await fetch(`${API_URL}/account`, {
      headers: this.crearHeaders(false),
    });

    const body = await this.leerJson(response);

    if (response.status === 401 || response.status === 403) {
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

    const response = await fetch(`${API_URL}${path}`, {
      headers: this.crearHeaders(true, userId),
    });

    const body = await this.leerJson(response);

    if (response.status === 401 || response.status === 403) {
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
      `${API_URL}/competitions/la-liga/data` +
      `?lang=es&score=${encodeURIComponent(this.score)}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    const body = await this.leerJson(response);

    if (!response.ok) {
      throw new Error(
        `No se pudo obtener el catálogo de LaLiga (${response.status})`
      );
    }

    return body;
  }

  async obtenerUsuariosLiga() {
    try {
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
    } catch (error) {
      console.warn(
        "[Biwenger] No se pudieron cargar usuarios de liga:",
        error.message
      );

      return [];
    }
  }

  async obtenerPlantillaUsuario(userId) {
    try {
      const response = await this.request(
        "/user?fields=players(id,owner)",
        { userId }
      );

      return response?.data?.players || [];
    } catch (error) {
      console.warn(
        `[Biwenger] No se pudo cargar plantilla de usuario ${userId}:`,
        error.message
      );

      return [];
    }
  }

  async obtenerDashboard() {
    await this.inicializar();

    const [
      ownUserResponse,
      marketResponse,
      catalogResponse,
      leagueUsers,
    ] = await Promise.all([
      this.request("/user?fields=players(id,owner)"),
      this.request("/market"),
      this.obtenerCatalogo(),
      this.obtenerUsuariosLiga(),
    ]);

    const catalogData = catalogResponse?.data || {};
    const catalogPlayers = catalogData?.players || {};

    const teamsMap = normalizarEquipos(catalogData);
    const roundsMap = normalizarJornadas(catalogData);

    const teamStrengths =
      crearFuerzaEquipos(catalogPlayers, teamsMap);

    const normalizeContext = {
      teamsMap,
      roundsMap,
      teamStrengths,
    };

    const normalizedPlayersById = {};

    const getPlayer = (playerId, context = "squad") => {
      const id = Number(playerId || 0);
      if (!id) return null;

      if (!normalizedPlayersById[id]) {
        const raw =
          catalogPlayers[String(id)] || { id };

        const base =
          normalizarJugador(raw, normalizeContext);

        normalizedPlayersById[id] = {
          ...base,
          analysis: analizarJugador(base, "squad"),
        };
      }

      const base = normalizedPlayersById[id];

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
      .map((row) => getPlayer(row?.id, "squad"))
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
     * Si Biwenger permite consultar cada X-User,
     * cargamos las plantillas. Si no, el módulo
     * simplemente mostrará información parcial.
     */
    const rivalsToLoad = (leagueUsers || []).filter(
      (user) =>
        Number(user?.id || 0) &&
        Number(user?.id) !== Number(this.userId)
    );

    const rivalSquadResults = await Promise.allSettled(
      rivalsToLoad.map(async (user) => ({
        userId: Number(user.id),
        rows: await this.obtenerPlantillaUsuario(
          Number(user.id)
        ),
      }))
    );

    const squadsByUser = {};

    for (const result of rivalSquadResults) {
      if (result.status !== "fulfilled") continue;

      const { userId, rows } = result.value;

      squadsByUser[userId] = (rows || [])
        .map((row) => Number(row?.id || 0))
        .filter(Boolean);

      for (const playerId of squadsByUser[userId]) {
        getPlayer(playerId, "squad");
      }
    }

    const rivals = construirRivales({
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

    const rawMarket = sales
      .map((sale) => {
        const player = getPlayer(
          sale?.player?.id,
          "market"
        );

        if (!player) return null;

        const ownerId =
          Number(sale?.user?.id || 0);

        return {
          ...player,
          salePrice: Number(
            sale?.price ||
              player.price ||
              0
          ),
          ownerId,
          ownerName:
            sale?.user?.name ||
            "Mercado",
          isMine:
            ownerId === Number(this.userId),
          until:
            sale?.until || null,
          date:
            sale?.date || null,
        };
      })
      .filter(Boolean);

    const market = enriquecerMercado(
      rawMarket,
      rivals,
      finances
    ).sort((a, b) => {
      const aBid =
        a.marketIntelligence?.shouldBid ? 1 : 0;
      const bBid =
        b.marketIntelligence?.shouldBid ? 1 : 0;

      if (aBid !== bBid) return bBid - aBid;

      return (
        Number(b.analysis?.score || 0) -
        Number(a.analysis?.score || 0)
      );
    });

    /*
     * MEJOR XI
     */
    const bestXI = generarMejorXI(
      squad,
      this.league?.settings || {}
    );

    return {
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
            Boolean(this.league?.settings?.lineupAllowExtra),
        },
      },
      user: {
        id: this.userId,
        name:
          this.league?.user?.name ||
          "Mi equipo",
        points:
          Number(this.league?.user?.points || 0),
        position:
          Number(this.league?.user?.position || 0) || null,
      },
      finances,
      squad,
      market,
      bestXI,
      rivals,
    };
  }

  crearHeaders(includeLeague = false, userId = this.userId) {
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "X-Lang": "es",
      Authorization: `Bearer ${this.token}`,
    };

    if (this.version) {
      headers["X-Version"] = this.version;
    }

    if (includeLeague) {
      headers["X-League"] = String(this.leagueId);
      headers["X-User"] = String(userId);
    }

    return headers;
  }

  async leerJson(response) {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
}

function limpiarToken(token) {
  return String(token)
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}
