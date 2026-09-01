import {
  analizarJugador,
  construirRivales,
  crearFuerzaEquipos,
  enriquecerMercado,
  generarMejorXI,
} from "../analytics/index.js";

import {
  FORMATIONS,
} from "../analytics/config/formations.js";

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

import {
  ApiGuard,
} from "../guard/ApiGuard.js";

import {
  RequestScheduler,
} from "../guard/RequestScheduler.js";

import {
  ApiUsageTracker,
} from "../guard/ApiUsageTracker.js";

const API_URL =
  "https://biwenger.as.com/api/v2";

const CF_API_URL =
  "https://cf.biwenger.com/api/v2";

/*
 * Política conservadora.
 *
 * Mercado       5 min
 * Mi equipo    10 min
 * Rivales      30 min
 * Catálogo      6 h
 */
const TTL = {
  market:
    5 * 60 * 1000,

  ownUser:
    10 * 60 * 1000,

  lineup:
    15 * 60 * 1000,

  leagueUsers:
    30 * 60 * 1000,

  rivalSquad:
    30 * 60 * 1000,

  catalog:
    6 *
    60 *
    60 *
    1000,
};

/*
 * Incluso un refresh manual no salta estas ventanas.
 */
const MIN_RELOAD = {
  market:
    60 * 1000,

  ownUser:
    2 * 60 * 1000,

  lineup:
    5 * 60 * 1000,

  leagueUsers:
    10 * 60 * 1000,

  rivalSquad:
    10 * 60 * 1000,

  catalog:
    60 * 60 * 1000,
};

const REQUEST_GAP_MS =
  4000;

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

    this.token =
      limpiarToken(
        token
      );

    this.version =
      String(
        version ||
        ""
      ).trim();

    this.leagueName =
      String(
        leagueName ||
        ""
      ).trim();

    this.score =
      String(
        score ||
        "1"
      ).trim();

    this.account =
      null;

    this.league =
      null;

    this.leagueId =
      null;

    this.userId =
      null;

    this.lastDashboard =
      null;

    this.persistedDashboard =
      null;

    this.persistedDashboardLoaded =
      false;

    this.rivalsLoadedAt =
      0;

    this.guard =
      new ApiGuard();

    this.usage =
      new ApiUsageTracker();

    this.scheduler =
      new RequestScheduler({
        minGapMs:
          REQUEST_GAP_MS,

        guard:
          this.guard,
      });

    this.cache =
      new SmartCache({
        onAvoided:
          (event) =>
            this.usage.recordAvoided(
              event
            ),
      });

    this.infrastructurePromise =
      Promise.all([
        this.guard.init(),
        this.usage.init(),
      ]);
  }

  async asegurarInfraestructura() {
    await this.infrastructurePromise;
  }

  async inicializar() {
    await this.asegurarInfraestructura();

    if (
      this.account &&
      this.leagueId &&
      this.userId
    ) {
      return;
    }

    if (
      this.guard.isBlocked()
    ) {
      throw this.crearErrorRateLimit();
    }

    await this.cargarCuenta();
  }

  async cargarCuenta() {
    const {
      response,
      body,
    } =
      await this.fetchBiwenger({
        url:
          `${API_URL}/account`,

        endpoint:
          "account",

        options: {
          headers:
            this.crearHeaders(
              false
            ),
        },
      });

    if (
      response.status ===
        401 ||
      response.status ===
        403
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
      body?.data?.leagues ||
      [];

    if (
      !leagues.length
    ) {
      throw new Error(
        "No se encontraron ligas."
      );
    }

    let selectedLeague =
      leagues[0];

    if (this.leagueName) {
      const found =
        leagues.find(
          (league) =>
            String(
              league?.name ||
              ""
            )
              .trim()
              .toLowerCase() ===
            this.leagueName
              .toLowerCase()
        );

      if (found) {
        selectedLeague =
          found;
      }
    }

    this.account =
      body.data;

    this.league =
      selectedLeague;

    this.leagueId =
      Number(
        selectedLeague.id
      );

    this.userId =
      Number(
        selectedLeague
          ?.user
          ?.id
      );

    if (
      selectedLeague
        ?.scoreID
    ) {
      this.score =
        String(
          selectedLeague
            .scoreID
        );
    }

    if (
      !this.version &&
      body?.data?.version
    ) {
      this.version =
        String(
          body.data.version
        );
    }

    console.log(
      `[Biwenger] Liga: ${selectedLeague.name}`
    );

    console.log(
      `[Biwenger] League ID: ${this.leagueId}`
    );

    console.log(
      `[Biwenger] User ID: ${this.userId}`
    );

    console.log(
      `[Biwenger] Protección: ${REQUEST_GAP_MS / 1000}s entre peticiones`
    );
  }

  async fetchBiwenger({
    url,
    endpoint,
    options = {},
    kind = "read",
  }) {
    await this.asegurarInfraestructura();

    if (
      this.guard.isBlocked()
    ) {
      throw this.crearErrorRateLimit();
    }

    return this.scheduler.schedule(
      endpoint,
      async () => {
        const startedAt =
          Date.now();

        let response =
          null;

        try {
          response =
            await fetch(
              url,
              options
            );

          const body =
            await this.leerJson(
              response
            );

          const durationMs =
            Date.now() -
            startedAt;

          this.usage.recordRequest({
            endpoint,
            kind,
            status:
              response.status,
            ok:
              response.ok,
            durationMs,
          });

          if (
            esRateLimitResponse(
              response,
              body
            )
          ) {
            const retryAfterMs =
              parseRetryAfter(
                response
                  ?.headers
                  ?.get(
                    "retry-after"
                  )
              );

            await this.guard.trigger({
              retryAfterMs,

              reason:
                body?.message ||
                body?.error ||
                `Rate limit en ${endpoint}`,
            });

            const error =
              this.crearErrorRateLimit();

            this.scheduler.cancelPending(
              error
            );

            throw error;
          }

          return {
            response,
            body,
          };
        } catch (error) {
          if (
            error?.code ===
            "BIWENGER_RATE_LIMIT"
          ) {
            throw error;
          }

          if (!response) {
            this.usage.recordRequest({
              endpoint,
              kind,
              status:
                0,
              ok:
                false,
              durationMs:
                Date.now() -
                startedAt,
            });
          }

          throw error;
        }
      },
      {
        kind,
      }
    );
  }

  async request(
    path,
    {
      userId =
        this.userId,
    } = {}
  ) {
    await this.inicializar();

    const {
      response,
      body,
    } =
      await this.fetchBiwenger({
        url:
          `${API_URL}${path}`,

        endpoint:
          endpointName(
            path
          ),

        options: {
          headers:
            this.crearHeaders(
              true,
              userId
            ),
        },
      });

    if (
      response.status ===
        401 ||
      response.status ===
        403
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

  async obtenerCatalogo({
    force = false,
  } = {}) {
    return this.cache.get(
      "catalog",
      {
        ttlMs:
          TTL.catalog,

        minReloadMs:
          MIN_RELOAD.catalog,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          async () => {
            const query =
              `?lang=es&score=${encodeURIComponent(
                this.score
              )}`;

            /*
             * Primero el host CF. Si falla, el principal.
             * Ambos pasan por la misma cola de 1 petición.
             */
            const candidates = [
              {
                url:
                  `${CF_API_URL}/competitions/la-liga/data${query}`,

                endpoint:
                  "catalog-cf",
              },
              {
                url:
                  `${API_URL}/competitions/la-liga/data${query}`,

                endpoint:
                  "catalog-main",
              },
            ];

            let lastError =
              null;

            for (
              const candidate of
                candidates
            ) {
              try {
                const {
                  response,
                  body,
                } =
                  await this.fetchBiwenger({
                    url:
                      candidate.url,

                    endpoint:
                      candidate.endpoint,

                    options: {
                      headers: {
                        Accept:
                          "application/json, text/plain, */*",

                        "Accept-Language":
                          "es-ES,es;q=0.9",
                      },
                    },
                  });

                if (
                  response.ok
                ) {
                  return body;
                }

                lastError =
                  new Error(
                    `No se pudo obtener el catálogo (${response.status})`
                  );
              } catch (error) {
                lastError =
                  error;

                if (
                  error?.code ===
                  "BIWENGER_RATE_LIMIT"
                ) {
                  throw error;
                }
              }
            }

            throw (
              lastError ||
              new Error(
                "No se pudo obtener el catálogo de LaLiga."
              )
            );
          },
      }
    );
  }

  async obtenerUsuariosLiga({
    force = false,
  } = {}) {
    return this.cache.get(
      "league-users",
      {
        ttlMs:
          TTL.leagueUsers,

        minReloadMs:
          MIN_RELOAD.leagueUsers,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          async () => {
            const response =
              await this.request(
                `/league/${this.leagueId}`
              );

            const rawUsers =
              response
                ?.data
                ?.users ||
              response
                ?.data
                ?.league
                ?.users ||
              [];

            return Array.isArray(
              rawUsers
            )
              ? rawUsers
              : Object.values(
                  rawUsers ||
                  {}
                );
          },
      }
    );
  }

  async obtenerUsuarioPropio({
    force = false,
  } = {}) {
    return this.cache.get(
      "own-user",
      {
        ttlMs:
          TTL.ownUser,

        minReloadMs:
          MIN_RELOAD.ownUser,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          () =>
            this.request(
              "/user?fields=players(id,owner)"
            ),
      }
    );
  }

  async obtenerMercado({
    force = false,
  } = {}) {
    return this.cache.get(
      "market",
      {
        ttlMs:
          TTL.market,

        minReloadMs:
          MIN_RELOAD.market,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          () =>
            this.request(
              "/market"
            ),
      }
    );
  }

  async obtenerAlineacion({
    force = false,
  } = {}) {
    return this.cache.get(
      "lineup",
      {
        ttlMs:
          TTL.lineup,

        minReloadMs:
          MIN_RELOAD.lineup,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          () =>
            this.request(
              "/user?fields=lineup(date,type,captain,striker,playersID,reservesID)"
            ),
      }
    );
  }

  async obtenerPlantillaUsuario(
    userId,
    {
      force = false,
    } = {}
  ) {
    const id =
      Number(
        userId
      );

    if (!id) {
      return [];
    }

    return this.cache.get(
      `rival-squad:${id}`,
      {
        ttlMs:
          TTL.rivalSquad,

        minReloadMs:
          MIN_RELOAD.rivalSquad,

        force,

        blocked:
          this.guard.isBlocked(),

        blockedError:
          this.crearErrorRateLimit(),

        loader:
          async () => {
            try {
              const response =
                await this.request(
                  "/user?fields=players(id,owner)",
                  {
                    userId:
                      id,
                  }
                );

              return (
                response
                  ?.data
                  ?.players ||
                []
              );
            } catch (error) {
              if (
                error
                  ?.code ===
                "BIWENGER_RATE_LIMIT"
              ) {
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

  async obtenerDashboard({
    refresh = "smart",
    includeRivals = false,
    includeLineup = false,
  } = {}) {
    await this.asegurarInfraestructura();

    try {
      await this.inicializar();

      const wantsRivals =
        Boolean(
          includeRivals
        ) ||
        [
          "rivals",
          "all",
        ].includes(
          refresh
        );

      const wantsLineup =
        Boolean(
          includeLineup
        ) ||
        [
          "lineup",
          "all",
        ].includes(
          refresh
        );

      const forceMarket =
        [
          "market",
          "core",
          "action",
          "all",
        ].includes(
          refresh
        );

      const forceOwn =
        [
          "core",
          "action",
          "all",
        ].includes(
          refresh
        );

      const forceCatalog =
        refresh ===
        "all";

      /*
       * Arranque ligero:
       * - usuario
       * - mercado
       * - catálogo
       *
       * La cola global los ejecuta de uno en uno.
       * Rivales NO se cargan aquí.
       */
      const [
        ownUserResponse,
        marketResponse,
        catalogResponse,
      ] =
        await Promise.all([
          this.obtenerUsuarioPropio(
            {
              force:
                forceOwn,
            }
          ),

          this.obtenerMercado(
            {
              force:
                forceMarket,
            }
          ),

          this.obtenerCatalogo(
            {
              force:
                forceCatalog,
            }
          ),
        ]);

      const persisted =
        await this.obtenerDashboardPersistido();

      let lineup =
        this.lastDashboard
          ?.lineup ||
        persisted
          ?.lineup ||
        null;

      if (wantsLineup) {
        const lineupResponse =
          await this.obtenerAlineacion({
            force:
              refresh ===
              "all",
          });

        lineup =
          lineupResponse
            ?.data
            ?.lineup ||
          {
            type:
              null,

            playersID:
              [],

            reservesID:
              [],

            captain:
              0,

            striker:
              0,
          };
      }

      const catalogData =
        catalogResponse?.data ||
        {};

      const catalogPlayers =
        catalogData?.players ||
        {};

      const teamsMap =
        normalizarEquipos(
          catalogData
        );

      const roundsMap =
        normalizarJornadas(
          catalogData
        );

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

      const normalizedPlayersById =
        {};

      const getPlayer =
        (
          playerId,
          context = "squad"
        ) => {
          const id =
            Number(
              playerId ||
              0
            );

          if (!id) {
            return null;
          }

          if (
            !normalizedPlayersById[
              id
            ]
          ) {
            const raw =
              catalogPlayers[
                String(
                  id
                )
              ] ||
              {
                id,
              };

            const base =
              normalizarJugador(
                raw,
                normalizeContext
              );

            normalizedPlayersById[
              id
            ] = {
              ...base,

              analysis:
                analizarJugador(
                  base,
                  "squad"
                ),
            };
          }

          const base =
            normalizedPlayersById[
              id
            ];

          if (
            context ===
            "market"
          ) {
            return {
              ...base,

              analysis:
                analizarJugador(
                  base,
                  "market"
                ),
            };
          }

          return base;
        };

      const ownRows =
        ownUserResponse
          ?.data
          ?.players ||
        [];

      const squad =
        ownRows
          .map(
            (row) =>
              getPlayer(
                row?.id,
                "squad"
              )
          )
          .filter(Boolean)
          .sort(
            (a, b) =>
              Number(
                b.price ||
                0
              ) -
              Number(
                a.price ||
                0
              )
          );

      const status =
        marketResponse
          ?.data
          ?.status ||
        {};

      const balance =
        Number(
          status.balance ||
          0
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

      const finances = {
        balance,
        maximumBid,
        teamValue,
        totalAssets:
          balance +
          teamValue,
      };

      /*
       * RIVALES BAJO DEMANDA.
       *
       * Si no estamos en la pestaña Rivales, reutilizamos
       * el último análisis guardado y hacemos CERO llamadas
       * a /league y a las plantillas rivales.
       */
      let rivals =
        this.lastDashboard
          ?.rivals ||
        persisted
          ?.rivals ||
        [];

      if (wantsRivals) {
        const leagueUsers =
          await this.obtenerUsuariosLiga({
            force:
              refresh ===
              "all",
          });

        const squadsByUser =
          {};

        const usersToLoad =
          (
            leagueUsers ||
            []
          ).filter(
            (user) =>
              Number(
                user?.id ||
                0
              ) &&
              Number(
                user?.id
              ) !==
                Number(
                  this.userId
                )
          );

        /*
         * No encolamos todos los rivales de golpe.
         * Los recorremos uno por uno; el scheduler añade
         * además 4 segundos entre cada petición real.
         */
        for (
          const user of
            usersToLoad
        ) {
          if (
            this.guard.isBlocked()
          ) {
            break;
          }

          try {
            const rows =
              await this.obtenerPlantillaUsuario(
                Number(
                  user.id
                ),
                {
                  force:
                    refresh ===
                    "all",
                }
              );

            squadsByUser[
              Number(
                user.id
              )
            ] =
              (
                rows ||
                []
              )
                .map(
                  (row) =>
                    Number(
                      row?.id ||
                      0
                    )
                )
                .filter(Boolean);

            for (
              const playerId of
                squadsByUser[
                  Number(
                    user.id
                  )
                ]
            ) {
              getPlayer(
                playerId,
                "squad"
              );
            }
          } catch (error) {
            if (
              error
                ?.code ===
              "BIWENGER_RATE_LIMIT"
            ) {
              throw error;
            }

            console.warn(
              `[Rivales] ${user?.name || user?.id}: ${error?.message}`
            );
          }
        }

        const analyzedRivals =
          construirRivales({
            users:
              leagueUsers,

            squadsByUser,

            normalizedPlayersById,

            myUserId:
              this.userId,
          });

        if (
          analyzedRivals.length
        ) {
          rivals =
            analyzedRivals;

          this.rivalsLoadedAt =
            Date.now();
        }
      }

      const sales =
        marketResponse
          ?.data
          ?.sales ||
        [];

      const rawMarket =
        sales
          .map(
            (sale) => {
              const player =
                getPlayer(
                  sale
                    ?.player
                    ?.id,
                  "market"
                );

              if (!player) {
                return null;
              }

              const ownerId =
                Number(
                  sale
                    ?.user
                    ?.id ||
                  0
                );

              const sellerType =
                ownerId > 0
                  ? "user"
                  : "market";

              const sellerName =
                sellerType ===
                "market"
                  ? "Mercado Biwenger"
                  : sale
                      ?.user
                      ?.name ||
                    `Usuario ${ownerId}`;

              return {
                ...player,

                saleId:
                  Number(
                    sale?.id ||
                    0
                  ) ||
                  null,

                salePrice:
                  Number(
                    sale
                      ?.price ||
                    player.price ||
                    0
                  ),

                ownerId,

                ownerName:
                  sellerName,

                sellerType,

                seller: {
                  type:
                    sellerType,

                  id:
                    ownerId ||
                    null,

                  name:
                    sellerName,
                },

                isMine:
                  ownerId ===
                  Number(
                    this.userId
                  ),

                until:
                  normalizarTimestampSeconds(
                    sale
                      ?.until
                  ),

                date:
                  normalizarTimestampSeconds(
                    sale
                      ?.date
                  ),
              };
            }
          )
          .filter(Boolean);

      const marketMeta =
        crearResumenMercado(
          rawMarket
        );

      const market =
        enriquecerMercado(
          rawMarket,
          rivals,
          finances
        ).sort(
          (a, b) => {
            const aBid =
              a
                .marketIntelligence
                ?.shouldBid
                ? 1
                : 0;

            const bBid =
              b
                .marketIntelligence
                ?.shouldBid
                ? 1
                : 0;

            if (
              aBid !==
              bBid
            ) {
              return (
                bBid -
                aBid
              );
            }

            return (
              Number(
                b.analysis
                  ?.score ||
                0
              ) -
              Number(
                a.analysis
                  ?.score ||
                0
              )
            );
          }
        );

      /*
       * Los jugadores puestos a la venta siguen perteneciendo
       * a la plantilla hasta que se complete una venta, pero
       * ya no deben aparecer en el Mejor XI ni ser elegibles
       * en el editor de alineación.
       */
      const ownListedIds =
        new Set(
          rawMarket
            .filter(
              (player) =>
                player.isMine
            )
            .map(
              (player) =>
                Number(
                  player.id
                )
            )
        );

      const squadForView =
        squad.map(
          (player) => ({
            ...player,

            isForSale:
              ownListedIds.has(
                Number(
                  player.id
                )
              ),
          })
        );

      const bestXICandidates =
        squadForView.filter(
          (player) =>
            !player.isForSale
        );

      const bestXI =
        generarMejorXI(
          bestXICandidates,
          this.league
            ?.settings ||
            {}
        );

      const guardStatus =
        this.guard.getStatus();

      const schedulerStatus =
        this.scheduler.getStatus();

      const apiUsage =
        this.usage.getStats({
          scheduler:
            schedulerStatus,

          guard:
            guardStatus,
        });

      const rivalsAge =
        this.rivalsLoadedAt
          ? Math.max(
              0,
              Math.floor(
                (
                  Date.now() -
                  this.rivalsLoadedAt
                ) /
                1000
              )
            )
          : null;

      const dashboard = {
        syncedAt:
          new Date()
            .toISOString(),

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

          settings: {
            balanceHidden:
              this.league
                ?.settings
                ?.balance ===
              "hidden",

            lineupCaptain:
              this.league
                ?.settings
                ?.lineupCaptain !==
              false,

            lineupStriker:
              this.league
                ?.settings
                ?.lineupStriker !==
              false,

            lineupAllowExtra:
              Boolean(
                this.league
                  ?.settings
                  ?.lineupAllowExtra
              ),
          },
        },

        user: {
          id:
            this.userId,

          name:
            this.league
              ?.user
              ?.name ||
            "Mi equipo",

          points:
            Number(
              this.league
                ?.user
                ?.points ||
              0
            ),

          position:
            Number(
              this.league
                ?.user
                ?.position ||
              0
            ) ||
            null,
        },

        finances,
        squad:
          squadForView,

        market,
        marketMeta,
        bestXI,
        lineup,
        rivals,

        system: {
          refreshMode:
            refresh,

          rateLimited:
            guardStatus.blocked,

          rateLimitUntil:
            guardStatus.blockedUntil,

          apiGuard:
            guardStatus,

          apiUsage,

          scheduler:
            schedulerStatus,

          rivalsLoaded:
            Boolean(
              rivals.length
            ),

          rivalsLoadedAt:
            this.rivalsLoadedAt
              ? new Date(
                  this.rivalsLoadedAt
                ).toISOString()
              : persisted
                  ?.system
                  ?.rivalsLoadedAt ||
                null,

          cache:
            this.cache.getMeta(),

          cachePolicy: {
            marketSeconds:
              TTL.market /
              1000,

            ownUserSeconds:
              TTL.ownUser /
              1000,

            lineupSeconds:
              TTL.lineup /
              1000,

            rivalsSeconds:
              TTL.rivalSquad /
              1000,

            leagueUsersSeconds:
              TTL.leagueUsers /
              1000,

            catalogSeconds:
              TTL.catalog /
              1000,
          },

          nextRefresh: {
            marketSeconds:
              this.cache
                .getRemainingSeconds(
                  "market",
                  TTL.market
                ),

            ownUserSeconds:
              this.cache
                .getRemainingSeconds(
                  "own-user",
                  TTL.ownUser
                ),

            lineupSeconds:
              this.cache
                .getRemainingSeconds(
                  "lineup",
                  TTL.lineup
                ),

            catalogSeconds:
              this.cache
                .getRemainingSeconds(
                  "catalog",
                  TTL.catalog
                ),

            rivalsSeconds:
              rivalsAge ===
              null
                ? null
                : Math.max(
                    0,
                    Math.ceil(
                      TTL.rivalSquad /
                      1000 -
                      rivalsAge
                    )
                  ),
          },
        },
      };

      this.lastDashboard =
        dashboard;

      this.persistedDashboard =
        dashboard;

      this.persistedDashboardLoaded =
        true;

      void saveDashboardSnapshot(
        dashboard
      );

      return dashboard;
    } catch (error) {
      const fallback =
        this.lastDashboard ||
        await this.obtenerDashboardPersistido();

      if (
        fallback &&
        error?.code ===
        "BIWENGER_RATE_LIMIT"
      ) {
        const guardStatus =
          this.guard.getStatus();

        return {
          ...fallback,

          system: {
            ...fallback
              ?.system,

            rateLimited:
              true,

            rateLimitUntil:
              guardStatus.blockedUntil,

            apiGuard:
              guardStatus,

            apiUsage:
              this.usage.getStats({
                scheduler:
                  this.scheduler.getStatus(),

                guard:
                  guardStatus,
              }),

            servingStale:
              true,

            message:
              "Protección activa: se muestran los últimos datos guardados y no se harán más peticiones a Biwenger durante el cooldown.",
          },
        };
      }

      throw error;
    }
  }

  async obtenerDashboardPersistido() {
    if (
      this.persistedDashboardLoaded
    ) {
      return (
        this.persistedDashboard ||
        null
      );
    }

    this.persistedDashboardLoaded =
      true;

    this.persistedDashboard =
      await loadDashboardSnapshot();

    if (
      this.persistedDashboard
        ?.system
        ?.rivalsLoadedAt
    ) {
      const parsed =
        Date.parse(
          this.persistedDashboard
            .system
            .rivalsLoadedAt
        );

      if (
        Number.isFinite(
          parsed
        )
      ) {
        this.rivalsLoadedAt =
          parsed;
      }
    }

    return this.persistedDashboard;
  }

  invalidarCache({
    market = false,
    ownUser = false,
    lineup = false,
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
      this.cache.invalidate(
        "market"
      );
    }

    if (ownUser) {
      this.cache.invalidate(
        "own-user"
      );
    }

    if (lineup) {
      this.cache.invalidate(
        "lineup"
      );
    }

    if (leagueUsers) {
      this.cache.invalidate(
        "league-users"
      );
    }

    if (catalog) {
      this.cache.invalidate(
        "catalog"
      );
    }

    if (rivals) {
      this.cache.invalidatePrefix(
        "rival-squad:"
      );

      this.rivalsLoadedAt =
        0;
    }
  }

async guardarAlineacion({
  formation,
  playersID,
  reservesID = [],
  captain = 0,
  striker = 0,
}) {
  await this.inicializar();

  if (
    this.guard.isBlocked()
  ) {
    throw this.crearErrorRateLimit(
      "No se puede guardar la alineación mientras la protección por límite de peticiones está activa."
    );
  }

  const formationConfig =
    FORMATIONS.find(
      (item) =>
        item.name ===
        formation
    );

  if (!formationConfig) {
    throw new Error(
      "La formación seleccionada no es válida."
    );
  }

  const starters =
    (
      Array.isArray(
        playersID
      )
        ? playersID
        : []
    )
      .map(Number)
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0
      );

  if (
    starters.length !==
    11 ||
    new Set(
      starters
    ).size !==
    11
  ) {
    throw new Error(
      "La alineación debe tener exactamente 11 jugadores distintos."
    );
  }

  const ownUserResponse =
    await this.obtenerUsuarioPropio({
      force:
        false,
    });

  const ownedIds =
    new Set(
      (
        ownUserResponse
          ?.data
          ?.players ||
        []
      )
        .map(
          (item) =>
            Number(
              item?.id ||
              0
            )
        )
        .filter(Boolean)
    );

  if (
    starters.some(
      (id) =>
        !ownedIds.has(id)
    )
  ) {
    throw new Error(
      "La alineación contiene jugadores que ya no pertenecen a tu plantilla."
    );
  }

  const marketResponse =
    await this.obtenerMercado({
      force:
        false,
    });

  const listedOwnIds =
    new Set(
      (
        marketResponse
          ?.data
          ?.sales ||
        []
      )
        .filter(
          (sale) =>
            Number(
              sale
                ?.user
                ?.id ||
              0
            ) ===
            Number(
              this.userId
            )
        )
        .map(
          (sale) =>
            Number(
              sale
                ?.player
                ?.id ||
              0
            )
        )
        .filter(Boolean)
    );

  if (
    starters.some(
      (id) =>
        listedOwnIds.has(
          id
        )
    )
  ) {
    throw new Error(
      "No puedes guardar en el XI un jugador que está puesto a la venta."
    );
  }

  const catalogResponse =
    await this.obtenerCatalogo({
      force:
        false,
    });

  const catalogPlayers =
    catalogResponse
      ?.data
      ?.players ||
    {};

  const positionCounts = {
    AR: 0,
    DF: 0,
    MC: 0,
    DL: 0,
  };

  for (
    const id of
      starters
  ) {
    const raw =
      catalogPlayers[
        String(id)
      ] ||
      {};

    const position =
      {
        1: "AR",
        2: "DF",
        3: "MC",
        4: "DL",
      }[
        Number(
          raw?.position
        )
      ];

    if (
      position &&
      positionCounts[
        position
      ] !==
      undefined
    ) {
      positionCounts[
        position
      ] += 1;
    }
  }

  for (
    const position of
      [
        "AR",
        "DF",
        "MC",
        "DL",
      ]
  ) {
    if (
      positionCounts[
        position
      ] !==
      Number(
        formationConfig[
          position
        ] ||
        0
      )
    ) {
      throw new Error(
        `La formación ${formation} requiere ${formationConfig[position]} jugadores en ${position}.`
      );
    }
  }

  const sanitizedReserves =
    (
      Array.isArray(
        reservesID
      )
        ? reservesID
        : []
    )
      .map(Number)
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0 &&
          ownedIds.has(id) &&
          !starters.includes(id) &&
          !listedOwnIds.has(id)
      )
      .filter(
        (
          id,
          index,
          array
        ) =>
          array.indexOf(id) ===
          index
      )
      .slice(
        0,
        4
      );

  const captainId =
    Number(
      captain ||
      0
    );

  if (
    captainId !==
      0 &&
    !starters.includes(
      captainId
    )
  ) {
    throw new Error(
      "El capitán debe formar parte del XI titular."
    );
  }

  const strikerId =
    Number(
      striker ||
      0
    );

  if (
    strikerId !==
      0 &&
    !starters.includes(
      strikerId
    )
  ) {
    throw new Error(
      "El ariete debe formar parte del XI titular."
    );
  }

  if (
    strikerId !==
    0
  ) {
    const strikerRaw =
      catalogPlayers[
        String(
          strikerId
        )
      ] ||
      {};

    if (
      Number(
        strikerRaw
          ?.position ||
        0
      ) !==
      4
    ) {
      throw new Error(
        "El ariete debe ser un delantero."
      );
    }
  }

  const lineupPayload = {
    type:
      formation,

    playersID:
      starters,

    reservesID:
      sanitizedReserves,

    captain:
      captainId,
  };

  /*
   * Biwenger expone `striker` dentro de lineup cuando la
   * liga tiene habilitado el ariete. Enviamos 0 cuando el
   * usuario no ha seleccionado ninguno, igual que con capitán.
   */
  if (
    this.league
      ?.settings
      ?.lineupStriker !==
    false
  ) {
    lineupPayload.striker =
      strikerId;
  }

  const result =
    await this.writeRequest(
      "/user?fields=*,lineup(date)",
      {
        method:
          "PUT",

        body: {
          lineup:
            lineupPayload,
        },
      }
    );

  this.invalidarCache({
    lineup:
      true,
  });

  return {
    operation:
      "lineup",

    formation,

    playersID:
      starters,

    reservesID:
      sanitizedReserves,

    captain:
      captainId,

    striker:
      strikerId,

    biwenger:
      result,
  };
}

  async writeRequest(
    path,
    {
      method = "POST",
      body,
      userId =
        this.userId,
    } = {}
  ) {
    await this.inicializar();

    if (
      this.guard.isBlocked()
    ) {
      throw this.crearErrorRateLimit(
        "La protección de Biwenger está activa. Por seguridad no enviaremos operaciones reales durante el cooldown."
      );
    }

    const {
      response,
      body:
        result,
    } =
      await this.fetchBiwenger({
        url:
          `${API_URL}${path}`,

        endpoint:
          `write:${endpointName(
            path
          )}`,

        kind:
          "write",

        options: {
          method,

          headers:
            this.crearHeaders(
              true,
              userId
            ),

          body:
            body ===
            undefined
              ? undefined
              : JSON.stringify(
                  body
                ),
        },
      });

    if (
      response.status ===
        401 ||
      response.status ===
        403
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

    if (
      Number(
        result?.status ||
        200
      ) >= 400
    ) {
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

    if (
      this.guard.isBlocked()
    ) {
      throw this.crearErrorRateLimit(
        "No se puede pujar mientras la protección por límite de peticiones está activa."
      );
    }

    const id =
      Number(
        playerId
      );

    const bid =
      Math.round(
        Number(
          amount
        )
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      throw new Error(
        "Jugador inválido."
      );
    }

    if (
      !Number.isFinite(
        bid
      ) ||
      bid <= 0
    ) {
      throw new Error(
        "La puja debe ser mayor a 0 €."
      );
    }

    /*
     * Solo al confirmar una puja hacemos esta verificación real.
     */
    const marketResponse =
      await this.request(
        "/market"
      );

    const sales =
      marketResponse
        ?.data
        ?.sales ||
      [];

    const sale =
      sales.find(
        (item) =>
          Number(
            item
              ?.player
              ?.id ||
            0
          ) ===
          id
      );

    if (!sale) {
      throw new Error(
        "El jugador ya no está disponible en el mercado."
      );
    }

    const sellerId =
      Number(
        sale
          ?.user
          ?.id ||
        0
      );

    if (
      sellerId ===
      Number(
        this.userId
      )
    ) {
      throw new Error(
        "No puedes pujar por un jugador ofrecido por ti."
      );
    }

    const maximumBid =
      Number(
        marketResponse
          ?.data
          ?.status
          ?.maximumBid ||
        0
      );

    if (
      maximumBid > 0 &&
      bid >
      maximumBid
    ) {
      throw new Error(
        `La puja supera tu límite actual de ${maximumBid.toLocaleString("es-ES")} €.`
      );
    }

    const result =
      await this.writeRequest(
        "/offers",
        {
          method:
            "POST",

          body: {
            to:
              sellerId > 0
                ? sellerId
                : null,

            type:
              "purchase",

            amount:
              bid,

            requestedPlayers: [
              id,
            ],
          },
        }
      );

    /*
     * Tras la escritura NO tocamos rivales ni catálogo.
     */
    this.invalidarCache({
      market:
        true,

      ownUser:
        true,
    });

    return {
      operation:
        "bid",

      playerId:
        id,

      amount:
        bid,

      sellerId:
        sellerId ||
        null,

      sellerType:
        sellerId > 0
          ? "user"
          : "market",

      biwenger:
        result,
    };
  }

  async ponerJugadorVenta({
    playerId,
    price,
    rejectOffers = false,
  }) {
    await this.inicializar();

    if (
      this.guard.isBlocked()
    ) {
      throw this.crearErrorRateLimit(
        "No se puede publicar una venta mientras la protección por límite de peticiones está activa."
      );
    }

    const id =
      Number(
        playerId
      );

    const salePrice =
      Math.round(
        Number(
          price
        )
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      throw new Error(
        "Jugador inválido."
      );
    }

    if (
      !Number.isFinite(
        salePrice
      ) ||
      salePrice <= 0
    ) {
      throw new Error(
        "El precio de venta debe ser mayor a 0 €."
      );
    }

    /*
     * Solo al confirmar la venta verificamos propiedad.
     */
    const userResponse =
      await this.request(
        "/user?fields=players(id,owner)"
      );

    const ownPlayers =
      userResponse
        ?.data
        ?.players ||
      [];

    const isMine =
      ownPlayers.some(
        (item) =>
          Number(
            item?.id ||
            0
          ) ===
          id
      );

    if (!isMine) {
      throw new Error(
        "Ese jugador ya no pertenece a tu plantilla."
      );
    }

    const result =
      await this.writeRequest(
        "/market",
        {
          method:
            "POST",

          body: {
            type:
              "sell",

            player:
              id,

            price:
              salePrice,

            rejectOffers:
              Boolean(
                rejectOffers
              ),
          },
        }
      );

    this.invalidarCache({
      market:
        true,

      ownUser:
        true,
    });

    return {
      operation:
        "sell",

      playerId:
        id,

      price:
        salePrice,

      rejectOffers:
        Boolean(
          rejectOffers
        ),

      biwenger:
        result,
    };
  }

  async getSystemStatus() {
    await this.asegurarInfraestructura();

    const persisted =
      await this.obtenerDashboardPersistido();

    const guardStatus =
      this.guard.getStatus();

    return {
      leagueId:
        this.leagueId ||
        persisted
          ?.league
          ?.id ||
        null,

      userId:
        this.userId ||
        persisted
          ?.user
          ?.id ||
        null,

      leagueName:
        this.league
          ?.name ||
        persisted
          ?.league
          ?.name ||
        null,

      score:
        this.score,

      guard:
        guardStatus,

      scheduler:
        this.scheduler.getStatus(),

      apiUsage:
        this.usage.getStats({
          scheduler:
            this.scheduler.getStatus(),

          guard:
            guardStatus,
        }),
    };
  }

  crearErrorRateLimit(
    customMessage = ""
  ) {
    const status =
      this.guard.getStatus();

    const minutes =
      Math.max(
        1,
        Math.ceil(
          Number(
            status.remainingSeconds ||
            0
          ) /
          60
        )
      );

    const error =
      new Error(
        customMessage ||
        `Protección de Biwenger activa. No se harán peticiones durante aproximadamente ${minutes} min; se usarán datos guardados.`
      );

    error.code =
      "BIWENGER_RATE_LIMIT";

    error.retryAt =
      status.blockedUntil ||
      null;

    return error;
  }

  crearHeaders(
    includeLeague = false,
    userId =
      this.userId
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

    if (
      this.version
    ) {
      headers[
        "X-Version"
      ] =
        this.version;
    }

    if (
      includeLeague
    ) {
      headers[
        "X-League"
      ] =
        String(
          this.leagueId
        );

      headers[
        "X-User"
      ] =
        String(
          userId
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
        message:
          text,
      };
    }
  }
}

function esRateLimitResponse(
  response,
  body
) {
  if (
    response?.status ===
    429
  ) {
    return true;
  }

  const text =
    String(
      body?.message ||
      body?.error ||
      ""
    )
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase();

  return (
    text.includes(
      "numero maximo de peticiones"
    ) ||
    text.includes(
      "maximo de peticiones"
    ) ||
    text.includes(
      "maximum number of requests"
    ) ||
    text.includes(
      "too many requests"
    ) ||
    text.includes(
      "demasiadas peticiones"
    )
  );
}

function parseRetryAfter(
  value
) {
  if (!value) {
    return 0;
  }

  const seconds =
    Number(
      value
    );

  if (
    Number.isFinite(
      seconds
    ) &&
    seconds > 0
  ) {
    return (
      seconds *
      1000
    );
  }

  const date =
    Date.parse(
      value
    );

  if (
    Number.isFinite(
      date
    ) &&
    date >
    Date.now()
  ) {
    return (
      date -
      Date.now()
    );
  }

  return 0;
}

function endpointName(
  path
) {
  const normalized =
    String(
      path ||
      ""
    )
      .split(
        "?"
      )[0]
      .replace(
        /^\/+/,
        ""
      );

  if (
    normalized ===
    "market"
  ) {
    return "market";
  }

  if (
    normalized ===
    "user"
  ) {
    return "user";
  }

  if (
    normalized.startsWith(
      "league/"
    )
  ) {
    return "league";
  }

  if (
    normalized ===
    "offers"
  ) {
    return "offers";
  }

  return (
    normalized ||
    "api"
  );
}

function normalizarTimestampSeconds(
  value
) {
  if (
    value === null ||
    value ===
      undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value ===
      "number" ||
    /^\d+(?:\.\d+)?$/.test(
      String(
        value
      ).trim()
    )
  ) {
    const numeric =
      Number(
        value
      );

    if (
      !Number.isFinite(
        numeric
      ) ||
      numeric <= 0
    ) {
      return null;
    }

    if (
      numeric >
      10_000_000_000
    ) {
      return Math.floor(
        numeric /
        1000
      );
    }

    return Math.floor(
      numeric
    );
  }

  const parsed =
    Date.parse(
      String(
        value
      )
    );

  return Number.isFinite(
    parsed
  )
    ? Math.floor(
        parsed /
        1000
      )
    : null;
}

function crearResumenMercado(
  marketPlayers
) {
  const now =
    Math.floor(
      Date.now() /
      1000
    );

  const visible =
    (
      marketPlayers ||
      []
    ).filter(
      (player) =>
        !player.isMine
    );

  const systemListings =
    visible.filter(
      (player) =>
        player.sellerType ===
        "market"
    );

  const managerListings =
    visible.filter(
      (player) =>
        player.sellerType ===
        "user"
    );

  const futureSystemExpirations =
    systemListings
      .map(
        (player) =>
          Number(
            player.until ||
            0
          )
      )
      .filter(
        (timestamp) =>
          timestamp >
          now
      );

  const futureAllExpirations =
    visible
      .map(
        (player) =>
          Number(
            player.until ||
            0
          )
      )
      .filter(
        (timestamp) =>
          timestamp >
          now
      );

  const expirations =
    futureSystemExpirations
      .length
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
        ? Math.min(
            ...expirations
          )
        : null,

    nextMarketChangeSource:
      futureSystemExpirations
        .length
        ? "system-listing-expiry"
        : futureAllExpirations
            .length
          ? "listing-expiry"
          : "unavailable",
  };
}

function limpiarToken(
  token
) {
  return String(
    token
  )
    .trim()
    .replace(
      /^Bearer\s+/i,
      ""
    )
    .trim();
}
