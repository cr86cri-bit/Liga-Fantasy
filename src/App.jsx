import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_CHANNEL_NAME, API_LEADER_HEARTBEAT_MS, API_LEADER_KEY, API_LEADER_LEASE_MS, MANUAL_REFRESH_COOLDOWN_MS, MARKET_SNAPSHOT_KEY, NOTIFICATION_HISTORY_KEY, DASHBOARD_LOCAL_CACHE_KEY, createTabId, readLeaderLease, readLocalDashboardCache, writeLeaderLease, formatMoney, toMilliseconds } from "./utils/app.js";
import { createMarketSnapshot, compareMarketSnapshots, readNotificationHistory, saveNotificationHistory } from "./utils/marketNotifications.js";
import { PlayerDetailModal } from "./components/players/PlayerDetailModal.jsx";
import { RealActionModal } from "./components/actions/RealActionModal.jsx";
import { MarketPositionFilterModal } from "./components/market/MarketComponents.jsx";
import { RivalDetailModal } from "./components/rivals/Rivals.jsx";
import { Toasts, NotificationHistoryModal } from "./components/notifications/Notifications.jsx";
import TeamScreen from "./screens/Team/TeamScreen.jsx";
import MarketScreen from "./screens/Market/MarketScreen.jsx";
import RivalsScreen from "./screens/Rivals/RivalsScreen.jsx";
import ProtectionScreen from "./screens/Protection/ProtectionScreen.jsx";
import MovementsScreen from "./screens/Movements/MovementsScreen.jsx";
import BestXIScreen from "./screens/BestXI/BestXIScreen.jsx";
import DashboardShell from "./components/layout/DashboardShell.jsx";
import HomeScreen from "./screens/Home/HomeScreen.jsx";

export default function App() {
  const initialDashboardRef =
    useRef(
      readLocalDashboardCache()
    );

  const [
    data,
    setData,
  ] = useState(
    () =>
      initialDashboardRef
        .current
        ?.data ||
      null
  );

  const [tab, setTab] = useState("home");
  const [marketFilter, setMarketFilter] = useState("all");
  const [marketPosition, setMarketPosition] = useState("all");
  const [positionFilterOpen, setPositionFilterOpen] = useState(false);
  const [
    loading,
    setLoading,
  ] = useState(
    () =>
      !initialDashboardRef
        .current
        ?.data
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [toasts, setToasts] = useState([]);

  const [
    notificationHistory,
    setNotificationHistory,
  ] = useState(() => readNotificationHistory());

  const [
    notificationHistoryOpen,
    setNotificationHistoryOpen,
  ] = useState(false);

  const [selectedTeamPlayer, setSelectedTeamPlayer] = useState(null);
  const [selectedMarketPlayer, setSelectedMarketPlayer] = useState(null);
  const [selectedXIPlayer, setSelectedXIPlayer] = useState(null);
  const [selectedRival, setSelectedRival] = useState(null);

  const [
    realAction,
    setRealAction,
  ] = useState(null);

  const [
    realActionLoading,
    setRealActionLoading,
  ] = useState(false);

  const [
    realActionError,
    setRealActionError,
  ] = useState("");

const [
  isApiLeader,
  setIsApiLeader,
] = useState(false);

const [
  manualRefreshCooldownUntil,
  setManualRefreshCooldownUntil,
] = useState(0);

const [
  rivalsLoading,
  setRivalsLoading,
] = useState(false);

const [
  lineupSaving,
  setLineupSaving,
] = useState(false);

const [
  lineupError,
  setLineupError,
] = useState("");

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return window.Notification.permission;
  });

  const marketSnapshotRef = useRef(null);
  const marketDeadlineRefreshRef = useRef(null);

const apiChannelRef =
  useRef(null);

const apiLeaderRef =
  useRef(false);

const tabIdRef =
  useRef(
    createTabId()
  );

const loadDataRef =
  useRef(null);

const removeToast = useCallback((id) => {
  setToasts((current) =>
    current.filter((item) => item.id !== id)
  );
}, []);

const clearNotificationHistory = useCallback(() => {
  setNotificationHistory([]);

  try {
    window.localStorage.removeItem(NOTIFICATION_HISTORY_KEY);
  } catch {
    // localStorage opcional.
  }
}, []);

const pushToast = useCallback(
  (title, message, type = "info", meta = {}) => {
    const item = {
      id: `${Date.now()}-${Math.random()}`,
      createdAt: Date.now(),
      title,
      message,
      type,
      icon: meta.icon || (type === "market" ? "🔔" : "ℹ️"),
      eventType: meta.eventType || "info",
      playerId: meta.playerId || null,
      playerName: meta.playerName || null,
      actorName: meta.actorName || null,
    };

    setToasts((current) => [
      ...current.slice(-2),
      item,
    ]);

    setNotificationHistory((current) => {
      const next = [item, ...current].slice(0, 120);
      saveNotificationHistory(next);
      return next;
    });

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((currentItem) => currentItem.id !== item.id)
      );
    }, 12_000);

    return item;
  },
  []
);

const sendMarketNotifications = useCallback(
  (changes) => {
    for (const change of changes || []) {
      const item = pushToast(
        change.title,
        change.message,
        "market",
        change
      );

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(change.title, {
            body: change.message,
            tag:
              `liga-fantasy-${change.eventType || "market"}-` +
              `${change.playerId || item.id}`,
            renotify: true,
          });
        } catch {
          // El aviso interno y el historial siguen funcionando.
        }
      }
    }
  },
  [pushToast]
);

const loadData = useCallback(
  async ({
    silent = false,
    refresh = "smart",
    includeRivals = false,
    includeLineup = false,
  } = {}) => {
    try {
      if (!silent) {
        setRefreshing(true);
      }

      setError("");

      const params =
        new URLSearchParams({
          refresh,

          includeRivals:
            includeRivals
              ? "1"
              : "0",

          includeLineup:
            includeLineup
              ? "1"
              : "0",
        });

      const response =
        await fetch(
          `/api/dashboard?${params.toString()}`
        );

      const body =
        await response.json();

      if (
        !response.ok ||
        !body.ok
      ) {
        throw new Error(
          body?.message ||
          "No se pudo cargar Biwenger."
        );
      }

      const nextSnapshot =
        createMarketSnapshot(
          body.data?.market || []
        );

      let previousSnapshot =
        marketSnapshotRef.current;

      if (!previousSnapshot) {
        try {
          const stored =
            window.localStorage.getItem(
              MARKET_SNAPSHOT_KEY
            );

          previousSnapshot =
            stored
              ? JSON.parse(stored)
              : null;
        } catch {
          previousSnapshot = null;
        }
      }

      const marketChanges =
        previousSnapshot
          ? compareMarketSnapshots(
              previousSnapshot,
              nextSnapshot
            )
          : [];

      marketSnapshotRef.current =
        nextSnapshot;

      try {
        window.localStorage.setItem(
          MARKET_SNAPSHOT_KEY,
          JSON.stringify(nextSnapshot)
        );

        window.localStorage.setItem(
          DASHBOARD_LOCAL_CACHE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            data: body.data,
          })
        );
      } catch {
        // localStorage es opcional.
      }

      setData(body.data);
      setNow(Date.now());

      if (
        body.data
          ?.system
          ?.rateLimited
      ) {
        const until =
          body.data
            ?.system
            ?.rateLimitUntil;

        setError(
          until
            ? `Biwenger limitó temporalmente las peticiones. Se usarán datos en caché sin insistir hasta aproximadamente ${new Date(
                until
              ).toLocaleTimeString(
                "es-BO",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}.`
            : "Biwenger limitó temporalmente las peticiones. Se muestran datos guardados."
        );
      }      if (
        marketChanges.length &&
        apiLeaderRef.current
      ) {
        sendMarketNotifications(
          marketChanges
        );
      }

      if (
        apiLeaderRef.current &&
        apiChannelRef.current
      ) {
        try {
          apiChannelRef.current.postMessage({
            type: "dashboard-data",
            data: body.data,
            error:
              body.data?.system?.rateLimited
                ? "Protección de API activa"
                : "",
          });
        } catch {
          // BroadcastChannel opcional.
        }
      }
    } catch (err) {
      let localFallback = null;

      try {
        const raw =
          window.localStorage.getItem(
            DASHBOARD_LOCAL_CACHE_KEY
          );

        localFallback =
          raw
            ? JSON.parse(raw)
            : null;
      } catch {
        localFallback = null;
      }

      if (localFallback?.data) {
        setData((current) =>
          current ||
          {
            ...localFallback.data,

            system: {
              ...localFallback.data?.system,
              servingLocalCache: true,
            },
          }
        );

        setError(
          `${err?.message || "No se pudo actualizar"}. Se muestran los últimos datos guardados en este navegador.`
        );
      } else {
        setError(
          err?.message ||
          "Error desconocido."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);

      if (
        refresh ===
        "rivals"
      ) {
        setRivalsLoading(false);
      }
    }
  },
  [sendMarketNotifications]
);

loadDataRef.current =
  loadData;

useEffect(() => {
  const tabId =
    tabIdRef.current;

  let channel =
    null;

  if (
    typeof BroadcastChannel !==
    "undefined"
  ) {
    channel =
      new BroadcastChannel(
        API_CHANNEL_NAME
      );

    apiChannelRef.current =
      channel;
  }

  const setLeader =
    (value) => {
      apiLeaderRef.current =
        value;

      setIsApiLeader(value);
    };

  const tryClaim =
    () => {
      const lease =
        readLeaderLease();

      const available =
        !lease ||
        !lease.id ||
        Number(
          lease.expiresAt ||
          0
        ) <=
          Date.now() ||
        lease.id ===
          tabId;

      if (available) {
        writeLeaderLease(tabId);
        setLeader(true);
        return true;
      }

      setLeader(false);
      return false;
    };

  const hydrate =
    (dashboard) => {
      if (!dashboard) {
        return;
      }

      setData(dashboard);
      setLoading(false);
      setNow(Date.now());

      if (
        dashboard
          ?.rivals
          ?.length
      ) {
        setRivalsLoading(false);
      }
    };

  if (channel) {
    channel.onmessage =
      (event) => {
        const message =
          event.data ||
          {};

        if (
          message.type ===
            "dashboard-data" &&
          !apiLeaderRef.current
        ) {
          hydrate(
            message.data
          );

          if (
            message.error
          ) {
            setError(
              message.error
            );
          }
        }

        if (
          message.type ===
            "refresh-request" &&
          apiLeaderRef.current
        ) {
          void loadDataRef
            .current?.({
              silent:
                message.silent !==
                false,

              refresh:
                message.refresh ||
                "smart",

              includeRivals:
                Boolean(
                  message.includeRivals
                ),

              includeLineup:
                Boolean(
                  message.includeLineup
                ),
            });
        }
      };
  }

  const onStorage =
    (event) => {
      if (
        event.key ===
        API_LEADER_KEY
      ) {
        tryClaim();
      }

      if (
        event.key ===
          DASHBOARD_LOCAL_CACHE_KEY &&
        !apiLeaderRef.current &&
        event.newValue
      ) {
        try {
          const parsed =
            JSON.parse(
              event.newValue
            );

          hydrate(
            parsed?.data
          );
        } catch {
          // Caché inválida.
        }
      }
    };

  window.addEventListener(
    "storage",
    onStorage
  );

  tryClaim();

  const heartbeat =
    window.setInterval(
      () => {
        if (
          apiLeaderRef.current
        ) {
          writeLeaderLease(
            tabId
          );
        } else {
          tryClaim();
        }
      },
      API_LEADER_HEARTBEAT_MS
    );

  const release =
    () => {
      const lease =
        readLeaderLease();

      if (
        lease?.id ===
        tabId
      ) {
        try {
          window.localStorage.removeItem(
            API_LEADER_KEY
          );
        } catch {
          // Ignorar.
        }
      }
    };

  window.addEventListener(
    "beforeunload",
    release
  );

  return () => {
    window.clearInterval(
      heartbeat
    );

    window.removeEventListener(
      "storage",
      onStorage
    );

    window.removeEventListener(
      "beforeunload",
      release
    );

    channel?.close();

    if (
      apiChannelRef.current ===
      channel
    ) {
      apiChannelRef.current =
        null;
    }

    release();
  };
}, []);

const requestRefresh =
  useCallback(
    ({
      silent = true,
      refresh = "smart",
      includeRivals = false,
      includeLineup = false,
    } = {}) => {
      if (
        apiLeaderRef.current
      ) {
        return loadData({
          silent,
          refresh,
          includeRivals,
          includeLineup,
        });
      }

      if (
        apiChannelRef.current
      ) {
        apiChannelRef.current.postMessage({
          type: "refresh-request",
          silent,
          refresh,
          includeRivals,
          includeLineup,
        });
      }

      return Promise.resolve();
    },
    [loadData]
  );

useEffect(() => {
  if (!isApiLeader) {
    return undefined;
  }

  const refreshIfVisible =
    () => {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      void loadData({
        silent: Boolean(data),
        refresh: "smart",
      });
    };

  refreshIfVisible();

  const interval =
    window.setInterval(
      refreshIfVisible,
      5 * 60 * 1000
    );

  return () =>
    window.clearInterval(
      interval
    );
}, [
  isApiLeader,
  loadData,
]);

useEffect(() => {
  if (
    tab !==
    "rivals"
  ) {
    return;
  }

  setRivalsLoading(true);

  void requestRefresh({
    silent: true,
    refresh: "rivals",
    includeRivals: true,
  });
}, [
  tab,
  requestRefresh,
]);

useEffect(() => {
  if (
    tab !==
    "xi"
  ) {
    return;
  }

  void requestRefresh({
    silent: true,
    refresh: "lineup",
    includeLineup: true,
  });
}, [
  tab,
  requestRefresh,
]);


useEffect(() => {
  if (
    ![
      "market",
      "moves",
    ].includes(
      tab
    )
  ) {
    return undefined;
  }

  const refreshMarketActivity =
    () => {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      void requestRefresh({
        silent:
          true,

        refresh:
          "market",
      });
    };

  refreshMarketActivity();

  const interval =
    window.setInterval(
      refreshMarketActivity,
      5 * 60 * 1000
    );

  return () =>
    window.clearInterval(
      interval
    );
}, [
  tab,
  requestRefresh,
]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const marketListings =
    useMemo(
      () =>
        data?.market ||
        [],
      [
        data,
      ]
    );

  const myBids =
    useMemo(
      () =>
        (
          data?.myBids ||
          []
        ).filter(
          (bid) =>
            bid.isActiveOffer
        ),
      [
        data,
      ]
    );

  const activeBidIds =
    useMemo(
      () =>
        new Set(
          myBids.map(
            (bid) =>
              Number(
                bid.id
              )
          )
        ),
      [
        myBids,
      ]
    );

  /*
   * MERCADO DISPONIBLE:
   * - no muestra nuestras propias ventas;
   * - no muestra jugadores por los que ya tenemos una puja activa.
   * Esos jugadores pasan a la pestaña "Movimientos".
   */
  const market =
    useMemo(
      () =>
        marketListings.filter(
          (player) =>
            !player.isMine &&
            !activeBidIds.has(
              Number(
                player.id
              )
            )
        ),
      [
        marketListings,
        activeBidIds,
      ]
    );

  const mySales =
    useMemo(
      () =>
        marketListings.filter(
          (player) =>
            player.isMine
        ),
      [
        marketListings,
      ]
    );

const marketCounts = useMemo(
  () => ({
    all:
      market.length,

    market:
      market.filter(
        (player) =>
          player.sellerType ===
          "market"
      ).length,

    users:
      market.filter(
        (player) =>
          player.sellerType ===
          "user"
      ).length,
  }),
  [market]
);

const sellerFilteredMarket =
  useMemo(() => {
    if (
      marketFilter ===
      "market"
    ) {
      return market.filter(
        (player) =>
          player.sellerType ===
          "market"
      );
    }

    if (
      marketFilter ===
      "users"
    ) {
      return market.filter(
        (player) =>
          player.sellerType ===
          "user"
      );
    }

    return market;
  }, [
    market,
    marketFilter,
  ]);

const marketPositionCounts =
  useMemo(
    () => ({
      all:
        sellerFilteredMarket.length,

      AR:
        sellerFilteredMarket.filter(
          (player) =>
            player.position ===
            "AR"
        ).length,

      DF:
        sellerFilteredMarket.filter(
          (player) =>
            player.position ===
            "DF"
        ).length,

      MC:
        sellerFilteredMarket.filter(
          (player) =>
            player.position ===
            "MC"
        ).length,

      DL:
        sellerFilteredMarket.filter(
          (player) =>
            player.position ===
            "DL"
        ).length,
    }),
    [
      sellerFilteredMarket,
    ]
  );

const filteredMarket =
  useMemo(() => {
    if (
      marketPosition ===
      "all"
    ) {
      return sellerFilteredMarket;
    }

    return sellerFilteredMarket.filter(
      (player) =>
        player.position ===
        marketPosition
    );
  }, [
    sellerFilteredMarket,
    marketPosition,
  ]);

  const xiPlayerFull = useMemo(() => {
    if (!selectedXIPlayer) return null;

    return (
      data?.squad?.find(
        (player) => Number(player.id) === Number(selectedXIPlayer.id)
      ) || selectedXIPlayer
    );
  }, [selectedXIPlayer, data]);

  const nextMarketChangeAt = useMemo(() => {
    if (data?.marketMeta?.nextMarketChangeAt) {
      return data.marketMeta.nextMarketChangeAt;
    }

    const system = market
      .filter((player) => player.sellerType === "market")
      .map((player) => toMilliseconds(player.until))
      .filter((value) => value && value > Date.now());

    const all = market
      .map((player) => toMilliseconds(player.until))
      .filter((value) => value && value > Date.now());

    const values = system.length ? system : all;
    return values.length ? Math.min(...values) : null;
  }, [data, market]);

  useEffect(() => {
    const deadlineMs = toMilliseconds(nextMarketChangeAt);

    if (!deadlineMs || deadlineMs <= Date.now()) return undefined;

    const wait = deadlineMs - Date.now() + 2500;

    if (wait > 24 * 60 * 60 * 1000) return undefined;

    if (marketDeadlineRefreshRef.current) {
      window.clearTimeout(marketDeadlineRefreshRef.current);
    }

    marketDeadlineRefreshRef.current = window.setTimeout(() => {
      pushToast(
        "Cambio de mercado",
        "El contador llegó a cero. Comprobando el mercado ahora…",
        "market"
      );
      if (
        !apiLeaderRef.current ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      void requestRefresh({
        silent: true,
        refresh: "market",
      });
    }, Math.max(1000, wait));

    return () => {
      if (marketDeadlineRefreshRef.current) {
        window.clearTimeout(marketDeadlineRefreshRef.current);
      }
    };
  }, [
    nextMarketChangeAt,
    requestRefresh,
    pushToast,
  ]);


const openSellAction =
  useCallback(
    (player) => {
      setSelectedTeamPlayer(
        null
      );

      setSelectedXIPlayer(
        null
      );

      setRealActionError(
        ""
      );

      setRealAction({
        type:
          "sell",

        player,

        defaultAmount:
          Number(
            player?.price ||
            0
          ),
      });
    },
    []
  );

const openBidAction =
  useCallback(
    (player) => {
      setSelectedMarketPlayer(
        null
      );

      const listed =
        Number(
          player
            ?.marketIntelligence
            ?.listedPrice ||
          player
            ?.salePrice ||
          player
            ?.price ||
          0
        );

      const recommended =
        Number(
          player
            ?.marketIntelligence
            ?.recommendedMaxBid ||
          listed
        );

      const maxBid =
        Number(
          data
            ?.finances
            ?.maximumBid ||
          0
        );

      let defaultAmount =
        Math.max(
          listed,
          recommended
        );

      if (
        maxBid > 0
      ) {
        defaultAmount =
          Math.min(
            defaultAmount,
            maxBid
          );
      }

      setRealActionError(
        ""
      );

      setRealAction({
        type:
          "bid",

        player,

        defaultAmount:
          Math.max(
            1,
            Math.round(
              defaultAmount
            )
          ),
      });
    },
    [
      data
        ?.finances
        ?.maximumBid,
    ]
  );

const executeRealAction =
  useCallback(
    async ({
      amount,
      rejectOffers,
    }) => {
      if (
        !realAction ||
        realActionLoading
      ) {
        return;
      }

      setRealActionLoading(
        true
      );

      setRealActionError(
        ""
      );

      try {
        const isBid =
          realAction.type ===
          "bid";

        const endpoint =
          isBid
            ? "/api/actions/bid"
            : "/api/actions/sell";

        const payload =
          isBid
            ? {
                confirm:
                  true,

                playerId:
                  realAction
                    .player
                    .id,

                amount:
                  Math.round(
                    Number(
                      amount
                    )
                  ),
              }
            : {
                confirm:
                  true,

                playerId:
                  realAction
                    .player
                    .id,

                price:
                  Math.round(
                    Number(
                      amount
                    )
                  ),

                rejectOffers:
                  Boolean(
                    rejectOffers
                  ),
              };

        /*
         * Una única petición por confirmación.
         * No reintentamos automáticamente acciones reales.
         */
        const response =
          await fetch(
            endpoint,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const body =
          await response.json();

        if (
          !response.ok ||
          !body?.ok
        ) {
          throw new Error(
            body?.message ||
            "Biwenger rechazó la operación."
          );
        }

        const playerName =
          realAction
            .player
            .name;

        if (isBid) {
          pushToast(
            `Puja enviada · ${playerName}`,
            `Has enviado una puja real de ${formatMoney(
              amount
            )} a Biwenger.`,
            "market",
            {
              eventType:
                "action",

              icon:
                "💰",

              playerId:
                realAction
                  .player
                  .id,

              playerName,

              actorName:
                data
                  ?.user
                  ?.name ||
                "Tú",
            }
          );
        } else {
          pushToast(
            `Jugador puesto a la venta · ${playerName}`,
            `${playerName} se ha enviado al mercado por ${formatMoney(
              amount
            )}.`,
            "market",
            {
              eventType:
                "action",

              icon:
                "🏷",

              playerId:
                realAction
                  .player
                  .id,

              playerName,

              actorName:
                data
                  ?.user
                  ?.name ||
                "Tú",
            }
          );
        }

        setRealAction(
          null
        );

        await requestRefresh({
          silent:
            true,

          refresh:
            "action",
        });
      } catch (error) {
        setRealActionError(
          error?.message ||
          "No se pudo completar la operación."
        );
      } finally {
        setRealActionLoading(
          false
        );
      }
    },
    [
      realAction,
      realActionLoading,
      data,
      pushToast,
      requestRefresh,
    ]
  );


const saveLineup =
  useCallback(
    async ({
      formation,
      playersID,
      reservesID,
      captain,
      striker,
    }) => {
      if (
        lineupSaving
      ) {
        return false;
      }

      setLineupSaving(true);
      setLineupError("");

      try {
        const response =
          await fetch(
            "/api/actions/lineup",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  confirm: true,
                  formation,
                  playersID,
                  reservesID,
                  captain,
                  striker,
                }),
            }
          );

        const body =
          await response.json();

        if (
          !response.ok ||
          !body?.ok
        ) {
          throw new Error(
            body?.message ||
            "Biwenger rechazó la alineación."
          );
        }

        pushToast(
          "Alineación guardada",
          `Tu XI ${formation} se guardó correctamente en Biwenger.`,
          "market",
          {
            eventType: "action",
            icon: "🧩",
            actorName:
              data?.user?.name ||
              "Tú",
          }
        );

        await requestRefresh({
          silent: true,
          refresh: "lineup",
          includeLineup: true,
        });

        return true;
      } catch (error) {
        setLineupError(
          error?.message ||
          "No se pudo guardar la alineación."
        );

        return false;
      } finally {
        setLineupSaving(false);
      }
    },
    [
      lineupSaving,
      pushToast,
      data,
      requestRefresh,
    ]
  );

  const enableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      pushToast(
        "Avisos en pantalla activos",
        "Este navegador no admite notificaciones del sistema, pero los avisos dentro de la web seguirán funcionando."
      );
      return;
    }

    if (window.Notification.permission === "granted") {
      setNotificationPermission("granted");
      pushToast("Notificaciones activas", "Ya recibirás avisos cuando detectemos cambios del mercado.");
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      pushToast("Notificaciones activadas", "Te avisaremos cuando cambie el mercado.", "market");
    } else {
      pushToast("Permiso no concedido", "Los avisos dentro de la página seguirán funcionando.");
    }
  }, [pushToast]);

const manualRefreshRemaining =
  Math.max(
    0,
    Math.ceil(
      (
        manualRefreshCooldownUntil -
        now
      ) /
      1000
    )
  );

const handleManualRefresh =
  useCallback(
    () => {
      if (
        Date.now() <
        manualRefreshCooldownUntil
      ) {
        return;
      }

      setManualRefreshCooldownUntil(
        Date.now() +
        MANUAL_REFRESH_COOLDOWN_MS
      );

      void requestRefresh({
        silent: false,
        refresh: "core",
      });
    },
    [
      manualRefreshCooldownUntil,
      requestRefresh,
    ]
  );

  if (loading) {
    return (
      <main className="center">
        <div className="loader" />
        <h2>Analizando tu liga...</h2>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="center">
        <div className="error-icon">!</div>
        <h1>No se pudo conectar</h1>
        <p className="error-text">{error}</p>
        <button
          className="primary-button"
          onClick={handleManualRefresh}
          disabled={manualRefreshRemaining > 0}
        >
          {manualRefreshRemaining > 0
            ? `Reintentar en ${manualRefreshRemaining}s`
            : "Reintentar"}
        </button>
      </main>
    );
  }

  return (
    <div className="app dashboard-app">
      <Toasts
        items={toasts}
        onClose={removeToast}
      />

      <DashboardShell
        tab={tab}
        onNavigate={setTab}
        data={data}
        marketCount={market.length}
        movesCount={
          myBids.length +
          mySales.length
        }
        notificationCount={
          notificationHistory.length
        }
        refreshing={refreshing}
        manualRefreshRemaining={
          manualRefreshRemaining
        }
        onRefresh={
          handleManualRefresh
        }
      >
        {error && (
          <div className="warning">
            {error}
          </div>
        )}

        {tab ===
          "home" && (
          <HomeScreen
            data={data}
            market={market}
            onNavigate={setTab}
            onTeamDetails={
              setSelectedTeamPlayer
            }
            onMarketDetails={
              setSelectedMarketPlayer
            }
          />
        )}

        {tab ===
          "team" && (
          <TeamScreen
            squad={
              data?.squad ||
              []
            }
            onDetails={
              setSelectedTeamPlayer
            }
            onSell={
              openSellAction
            }
          />
        )}

        {tab ===
          "market" && (
          <MarketScreen
            marketFilter={
              marketFilter
            }
            setMarketFilter={
              setMarketFilter
            }
            marketPosition={
              marketPosition
            }
            setPositionFilterOpen={
              setPositionFilterOpen
            }
            marketCounts={
              marketCounts
            }
            marketPositionCounts={
              marketPositionCounts
            }
            data={
              data
            }
            market={
              market
            }
            filteredMarket={
              filteredMarket
            }
            now={
              now
            }
            notificationPermission={
              notificationPermission
            }
            onEnableNotifications={
              enableNotifications
            }
            historyCount={
              notificationHistory.length
            }
            onOpenHistory={() =>
              setNotificationHistoryOpen(
                true
              )
            }
            onDetails={
              setSelectedMarketPlayer
            }
            onBid={
              openBidAction
            }
          />
        )}

        {tab ===
          "moves" && (
          <MovementsScreen
            bids={
              myBids
            }
            sales={
              mySales
            }
            now={
              now
            }
            onDetails={
              setSelectedMarketPlayer
            }
          />
        )}

        {tab ===
          "xi" && (
          <BestXIScreen
            bestXI={
              data?.bestXI
            }
            squad={
              data?.squad ||
              []
            }
            savedLineup={
              data?.lineup
            }
            lineupSettings={
              data
                ?.league
                ?.settings
            }
            onPlayerDetails={
              setSelectedXIPlayer
            }
            onSaveLineup={
              saveLineup
            }
            saving={
              lineupSaving
            }
            saveError={
              lineupError
            }
          />
        )}

        {tab ===
          "rivals" && (
          <RivalsScreen
            rivals={
              data?.rivals ||
              []
            }
            loading={
              rivalsLoading
            }
            onDetails={
              setSelectedRival
            }
          />
        )}

        {tab ===
          "protection" && (
          <ProtectionScreen
            system={
              data?.system
            }
            isLeader={
              isApiLeader
            }
            now={
              now
            }
          />
        )}
      </DashboardShell>


<NotificationHistoryModal
  open={notificationHistoryOpen}
  items={notificationHistory}
  onClose={() => setNotificationHistoryOpen(false)}
  onClear={clearNotificationHistory}
/>

<MarketPositionFilterModal
  open={positionFilterOpen}
  value={marketPosition}
  counts={marketPositionCounts}
  onSelect={setMarketPosition}
  onClose={() =>
    setPositionFilterOpen(
      false
    )
  }
/>

      <PlayerDetailModal
        player={selectedTeamPlayer}
        context="team"
        now={now}
        onSell={openSellAction}
        onClose={() =>
          setSelectedTeamPlayer(
            null
          )
        }
      />
      <PlayerDetailModal
        player={selectedMarketPlayer}
        context="market"
        now={now}
        onBid={openBidAction}
        onClose={() =>
          setSelectedMarketPlayer(
            null
          )
        }
      />
      <PlayerDetailModal
        player={xiPlayerFull}
        context="team"
        now={now}
        onSell={openSellAction}
        onClose={() =>
          setSelectedXIPlayer(
            null
          )
        }
      />

<RealActionModal
  action={
    realAction
  }
  finances={
    data?.finances
  }
  loading={
    realActionLoading
  }
  error={
    realActionError
  }
  onClose={() => {
    if (
      !realActionLoading
    ) {
      setRealAction(
        null
      );

      setRealActionError(
        ""
      );
    }
  }}
  onConfirm={
    executeRealAction
  }
/>

      <RivalDetailModal rival={selectedRival} balanceHidden={data?.league?.settings?.balanceHidden} onClose={() => setSelectedRival(null)} />
    </div>
  );
}
