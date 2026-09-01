import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const MARKET_SNAPSHOT_KEY =
  "liga-fantasy-market-snapshot-v2";

const DASHBOARD_LOCAL_CACHE_KEY =
  "liga-fantasy-dashboard-cache-v1";

const API_LEADER_KEY =
  "liga-fantasy-api-leader-v1";

const API_CHANNEL_NAME =
  "liga-fantasy-api-channel-v1";

const API_LEADER_LEASE_MS =
  20_000;

const API_LEADER_HEARTBEAT_MS =
  5_000;

const MANUAL_REFRESH_COOLDOWN_MS =
  60_000;

const NOTIFICATION_HISTORY_KEY =
  "liga-fantasy-notification-history-v1";

const SOFASCORE_PROFILE_CACHE_KEY =
  "liga-fantasy-sports-sources-v1";

function readLocalDashboardCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        DASHBOARD_LOCAL_CACHE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function createTabId() {
  return (
    `${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

function readLeaderLease() {
  try {
    const raw =
      window.localStorage.getItem(
        API_LEADER_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function writeLeaderLease(id) {
  const lease = {
    id,

    expiresAt:
      Date.now() +
      API_LEADER_LEASE_MS,
  };

  try {
    window.localStorage.setItem(
      API_LEADER_KEY,
      JSON.stringify(lease)
    );
  } catch {
    // localStorage opcional.
  }

  return lease;
}

function formatShortDuration(seconds) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return "Sin cargar";
  }

  const value =
    Math.max(
      0,
      Math.round(
        Number(seconds)
      )
    );

  if (value < 60) {
    return `${value}s`;
  }

  const minutes =
    Math.floor(value / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(minutes / 60);

  const rest =
    minutes % 60;

  return rest
    ? `${hours}h ${rest}m`
    : `${hours}h`;
}

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function formatChange(value) {
  const amount = Number(value || 0);
  if (!amount) return "0 €";
  return `${amount > 0 ? "+" : ""}${formatMoney(amount)}`;
}

function toMilliseconds(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return value > 10_000_000_000
      ? value
      : value * 1000;
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 10_000_000_000
      ? numeric
      : numeric * 1000;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value) {
  const millis = toMilliseconds(value);

  if (!millis) return "Sin fecha";

  return new Date(millis).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(target, now = Date.now()) {
  const millis = toMilliseconds(target);

  if (!millis) {
    return {
      text: "Sin límite informado",
      expired: false,
      urgency: "unknown",
    };
  }

  let remaining = millis - now;

  if (remaining <= 0) {
    return {
      text: "Finalizado",
      expired: true,
      urgency: "expired",
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const two = (number) => String(number).padStart(2, "0");

  let text;

  if (days > 0) {
    text = `${days}d ${two(hours)}h ${two(minutes)}m`;
  } else {
    text = `${two(hours)}:${two(minutes)}:${two(seconds)}`;
  }

  return {
    text,
    expired: false,
    urgency:
      remaining <= 15 * 60 * 1000
        ? "critical"
        : remaining <= 60 * 60 * 1000
          ? "soon"
          : "normal",
  };
}

function changeClass(value) {
  const number = Number(value || 0);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "neutral";
}

function statusConfig(status) {
  return (
    {
      ok: ["🟢", "Disponible", "status-ok"],
      doubt: ["🟡", "Duda", "status-warning"],
      injured: ["🔴", "Lesionado", "status-danger"],
      sanctioned: ["🔴", "Sancionado", "status-danger"],
      discarded: ["🔴", "Descartado", "status-danger"],
    }[status] || ["🟡", "Sin confirmar", "status-warning"]
  );
}

function Position({ position }) {
  return (
    <span
      className={`position position-${String(position).toLowerCase()}`}
    >
      {position}
    </span>
  );
}

function Recommendation({ value }) {
  if (!value) return null;

  return (
    <span
      className={`recommendation recommendation-${String(value).toLowerCase()}`}
    >
      {value}
    </span>
  );
}

function PlayerPhoto({ player, size = "normal" }) {
  const [failed, setFailed] = useState(false);

  if (failed || !player?.photoUrl) {
    return (
      <div
        className={`player-photo player-photo-${size} player-photo-fallback`}
      >
        {player?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      className={`player-photo player-photo-${size}`}
      src={player.photoUrl}
      alt={player.name || "Jugador"}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Status({ status, compact = false }) {
  const [dot, label, className] = statusConfig(status);

  return (
    <span
      className={`status ${className} ${compact ? "status-compact" : ""}`}
    >
      <span>{dot}</span>
      {!compact && label}
    </span>
  );
}

function Fitness({ values = [] }) {
  return (
    <div className="fitness">
      {[values[0], values[1], values[2]].map((value, index) => (
        <FitnessItem value={value} key={index} />
      ))}
    </div>
  );
}

function FitnessItem({ value }) {
  if (typeof value === "number") {
    const type =
      value >= 10
        ? "great"
        : value >= 6
          ? "good"
          : value < 0
            ? "bad"
            : "normal";

    return <span className={`fitness-item ${type}`}>{value}</span>;
  }

  const config =
    {
      injured: ["LES", "bad"],
      doubt: ["DUD", "warning"],
      sanctioned: ["SAN", "bad"],
      discarded: ["DES", "bad"],
    }[value] || ["-", "empty"];

  return (
    <span className={`fitness-item ${config[1]}`}>{config[0]}</span>
  );
}

function AnalysisScore({ analysis, compact = false }) {
  const score = Number(analysis?.score || 0);

  const level =
    score >= 70
      ? "great"
      : score >= 55
        ? "good"
        : score >= 35
          ? "medium"
          : "bad";

  if (compact) {
    return (
      <div className={`score-pill score-pill-${level}`}>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    );
  }

  return (
    <div className="analysis-score">
      <div className="score-header">
        <span>Nota Fantasy</span>
        <strong>
          {score}<small>/100</small>
        </strong>
      </div>

      <div className="score-track">
        <div
          className={`score-bar ${level}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function Countdown({ target, now, label = "Finaliza en" }) {
  const countdown = formatCountdown(target, now);

  return (
    <div className={`countdown countdown-${countdown.urgency}`}>
      <span>{countdown.expired ? "Estado" : label}</span>
      <strong>{countdown.text}</strong>
    </div>
  );
}

function Fixture({ match }) {
  if (!match) {
    return (
      <div className="fixture fixture-empty">
        Sin próximo partido disponible
      </div>
    );
  }

  return (
    <div className="fixture">
      <div className="fixture-main">
        <span className="eyebrow">{match.roundName}</span>
        <strong>
          {match.venue === "LOCAL" ? "vs" : "@"} {match.opponent?.name}
        </strong>
        <small>
          {match.venue} · {formatDate(match.date)}
        </small>
      </div>

      <div className="fixture-difficulty">
        <span>{"★".repeat(match.difficulty?.stars || 3)}</span>
        <strong>{match.difficulty?.label}</strong>
      </div>
    </div>
  );
}

function Metric({ label, value, description }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function DetailButton({ onClick, label = "Ver detalles" }) {
  return (
    <button className="detail-button" onClick={onClick}>
      {label}<span>›</span>
    </button>
  );
}

let modalScrollLockCount = 0;
let modalOriginalBodyOverflow = "";
let modalOriginalHtmlOverflow = "";
let modalOriginalBodyPaddingRight = "";

function lockPageScroll() {
  if (typeof document === "undefined") return;

  if (modalScrollLockCount === 0) {
    modalOriginalBodyOverflow = document.body.style.overflow;
    modalOriginalHtmlOverflow = document.documentElement.style.overflow;
    modalOriginalBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      const currentPadding =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight
        ) || 0;

      document.body.style.paddingRight =
        `${currentPadding + scrollbarWidth}px`;
    }
  }

  modalScrollLockCount += 1;
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

function unlockPageScroll() {
  if (typeof document === "undefined") return;

  modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);

  if (modalScrollLockCount !== 0) return;

  document.body.style.overflow = modalOriginalBodyOverflow;
  document.documentElement.style.overflow = modalOriginalHtmlOverflow;
  document.body.style.paddingRight = modalOriginalBodyPaddingRight;
}

function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;

    lockPageScroll();

    return () => {
      unlockPageScroll();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-panel ${wide ? "modal-panel-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <div>
            <span className="section-label">DETALLE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function DetailMetric({ label, value, className = "" }) {
  return (
    <div className="detail-metric">
      <span>{label}</span>
      <strong className={className}>{value}</strong>
    </div>
  );
}

function Breakdown({ label, value }) {
  const safeValue = Number(value || 0);

  return (
    <div className="breakdown-item">
      <div>
        <span>{label}</span>
        <strong>{safeValue}</strong>
      </div>

      <div className="mini-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function SellerBadge({ player }) {
  const isMarket = player?.sellerType === "market";

  return (
    <div className={`seller-badge ${isMarket ? "seller-market" : "seller-user"}`}>
      <span>{isMarket ? "🏪" : "👤"}</span>
      <div>
        <small>Ofrece</small>
        <strong>{player?.ownerName || "Mercado Biwenger"}</strong>
      </div>
    </div>
  );
}

const SPORTS_SOURCES = [
  {
    key: "sofascore",
    name: "SofaScore",
    short: "S",
    domain: "sofascore.com/football/player",
    description:
      "Valoraciones, estadísticas por partido, forma y mapas de rendimiento.",
    features: [
      "Valoraciones",
      "Estadísticas",
      "Forma",
    ],
  },
  {
    key: "fotmob",
    name: "FotMob",
    short: "F",
    domain: "fotmob.com/players",
    description:
      "Ratings, xG, xA, mapas de calor, tiros y métricas avanzadas.",
    features: [
      "xG / xA",
      "Mapa de calor",
      "Ratings",
    ],
  },
  {
    key: "flashscore",
    name: "Flashscore",
    short: "FL",
    domain: "flashscore.com/player",
    description:
      "Resultados en vivo, minutos, eventos, alineaciones y seguimiento rápido.",
    features: [
      "En vivo",
      "Eventos",
      "Alineaciones",
    ],
  },
  {
    key: "365scores",
    name: "365Scores",
    short: "365",
    domain: "365scores.com",
    description:
      "Resultados, noticias, calendarios, alineaciones y estadísticas.",
    features: [
      "Resultados",
      "Noticias",
      "Estadísticas",
    ],
  },
  {
    key: "besoccer",
    name: "BeSoccer",
    short: "B",
    domain: "besoccer.com/player",
    description:
      "Perfil, ELO, valor, forma, lesiones, transferencias y trayectoria.",
    features: [
      "ELO",
      "Lesiones",
      "Transferencias",
    ],
  },
  {
    key: "whoscored",
    name: "WhoScored",
    short: "W",
    domain: "whoscored.com/Players",
    description:
      "Valoraciones, estadísticas detalladas y análisis de rendimiento.",
    features: [
      "Ratings",
      "Rendimiento",
      "Análisis",
    ],
  },
];

function SportsSourcesButton({
  player,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    sofaState,
    setSofaState,
  ] = useState({
    status: "idle",
    profile: null,
    fallbackUrl: null,
  });

  useEffect(() => {
    if (!player?.name) {
      return undefined;
    }

    const controller =
      new AbortController();

    const cacheKey =
      String(
        player.id ||
          `${player.name}|${player.teamName}`
      );

    const load =
      async () => {
        try {
          const local =
            leerCacheSportsSource(
              cacheKey
            );

          if (
            local?.profile?.url ||
            local?.fallbackUrl
          ) {
            setSofaState({
              status:
                local?.profile?.url
                  ? "ready"
                  : "fallback",

              profile:
                local.profile ||
                null,

              fallbackUrl:
                local.fallbackUrl ||
                null,
            });

            return;
          }

          setSofaState({
            status: "loading",
            profile: null,
            fallbackUrl: null,
          });

          const params =
            new URLSearchParams({
              name:
                player.name,

              team:
                player.teamName ||
                "",
            });

          const response =
            await fetch(
              `/api/sofascore/player?${params.toString()}`,
              {
                signal:
                  controller.signal,
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
                "No se pudo buscar en SofaScore."
            );
          }

          const result =
            body?.data || {};

          const next = {
            status:
              result?.found &&
              result?.profile?.url
                ? "ready"
                : "fallback",

            profile:
              result?.profile ||
              null,

            fallbackUrl:
              result?.fallbackUrl ||
              crearBusquedaFuente(
                "sofascore",
                player
              ),
          };

          guardarCacheSportsSource(
            cacheKey,
            next
          );

          setSofaState(
            next
          );
        } catch (error) {
          if (
            error?.name ===
            "AbortError"
          ) {
            return;
          }

          setSofaState({
            status: "fallback",
            profile: null,
            fallbackUrl:
              crearBusquedaFuente(
                "sofascore",
                player
              ),
          });
        }
      };

    load();

    return () =>
      controller.abort();
  }, [
    player?.id,
    player?.name,
    player?.teamName,
  ]);

  const openSource =
    (sourceKey) => {
      let url = null;

      if (
        sourceKey ===
        "sofascore"
      ) {
        url =
          sofaState
            ?.profile
            ?.url ||
          sofaState
            ?.fallbackUrl ||
          crearBusquedaFuente(
            "sofascore",
            player
          );
      } else {
        url =
          crearBusquedaFuente(
            sourceKey,
            player
          );
      }

      if (!url) {
        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  return (
    <>
      <button
        type="button"
        className="sports-sources-button"
        onClick={() =>
          setOpen(true)
        }
        title="Abrir fuentes deportivas del jugador"
      >
        <span className="sports-sources-icon">
          ◎
        </span>

        <span className="sports-sources-copy">
          <small>
            FUENTES DEPORTIVAS
          </small>

          <strong>
            Ver estadísticas externas
          </strong>

          <em>
            6 plataformas
          </em>
        </span>

        <span className="sports-sources-arrow">
          ›
        </span>
      </button>

      <Modal
        open={open}
        onClose={() =>
          setOpen(false)
        }
        title="Fuentes deportivas"
        subtitle={`${player.name} · ${player.teamName}`}
        wide
      >
        <div className="sports-sources-intro">
          <div>
            <span className="section-label">
              PERFIL EXTERNO
            </span>

            <h3>
              Compara al jugador en varias plataformas
            </h3>

            <p>
              Cada fuente aporta datos distintos. Cuando no podemos
              resolver el perfil exacto automáticamente, abrimos una
              búsqueda restringida a esa plataforma.
            </p>
          </div>

          <PlayerPhoto
            player={player}
            size="normal"
          />
        </div>

        <div className="sports-source-grid">
          {SPORTS_SOURCES.map(
            (source) => {
              const isSofa =
                source.key ===
                "sofascore";

              const sofaDirect =
                isSofa &&
                Boolean(
                  sofaState
                    ?.profile
                    ?.url
                );

              return (
                <article
                  className={`sports-source-card sports-source-${source.key}`}
                  key={
                    source.key
                  }
                >
                  <div className="sports-source-card-head">
                    <span className="sports-source-logo">
                      {
                        source.short
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          source.name
                        }
                      </strong>

                      <small>
                        {sofaDirect
                          ? "Perfil encontrado"
                          : isSofa &&
                              sofaState.status ===
                                "loading"
                            ? "Buscando perfil..."
                            : "Buscar jugador"}
                      </small>
                    </div>
                  </div>

                  <p>
                    {
                      source.description
                    }
                  </p>

                  <div className="sports-source-features">
                    {source.features.map(
                      (feature) => (
                        <span
                          key={
                            feature
                          }
                        >
                          {
                            feature
                          }
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="sports-source-open"
                    onClick={() =>
                      openSource(
                        source.key
                      )
                    }
                  >
                    {sofaDirect
                      ? "Abrir perfil"
                      : `Buscar en ${source.name}`}

                    <span>
                      ↗
                    </span>
                  </button>
                </article>
              );
            }
          )}
        </div>

        <div className="sports-source-note">
          <strong>
            Sobre los datos externos
          </strong>

          <p>
            Estas plataformas no comparten una API pública única y estable.
            Por eso esta versión las usa como fuentes externas de consulta
            sin mezclar datos automáticamente con la nota Fantasy.
          </p>
        </div>
      </Modal>
    </>
  );
}

function leerCacheSportsSource(
  key
) {
  try {
    const raw =
      localStorage.getItem(
        SOFASCORE_PROFILE_CACHE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    const item =
      parsed?.[key];

    if (!item) {
      return null;
    }

    const ttl =
      item?.profile?.url
        ? 7 *
          24 *
          60 *
          60 *
          1000
        : 60 *
          60 *
          1000;

    if (
      Date.now() -
        Number(
          item.savedAt ||
          0
        ) >
      ttl
    ) {
      return null;
    }

    return item;
  } catch {
    return null;
  }
}

function guardarCacheSportsSource(
  key,
  value
) {
  try {
    const raw =
      localStorage.getItem(
        SOFASCORE_PROFILE_CACHE_KEY
      );

    const parsed =
      raw
        ? JSON.parse(raw)
        : {};

    parsed[key] = {
      ...value,
      savedAt:
        Date.now(),
    };

    localStorage.setItem(
      SOFASCORE_PROFILE_CACHE_KEY,
      JSON.stringify(
        parsed
      )
    );
  } catch {
    // La caché es opcional.
  }
}

function crearBusquedaFuente(
  sourceKey,
  player
) {
  const source =
    SPORTS_SOURCES.find(
      (item) =>
        item.key ===
        sourceKey
    );

  if (!source) {
    return null;
  }

  const query =
    [
      `site:${source.domain}`,
      `"${player?.name || ""}"`,
      player?.teamName
        ? `"${player.teamName}"`
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


function RealActionModal({
  action,
  finances,
  loading,
  error,
  onClose,
  onConfirm,
}) {
  const [
    amount,
    setAmount,
  ] = useState(
    () =>
      String(
        action?.defaultAmount ||
        0
      )
  );

  const [
    acknowledged,
    setAcknowledged,
  ] = useState(false);

  const [
    rejectOffers,
    setRejectOffers,
  ] = useState(false);

  useEffect(() => {
    setAmount(
      String(
        action?.defaultAmount ||
        0
      )
    );

    setAcknowledged(
      false
    );

    setRejectOffers(
      false
    );
  }, [
    action?.type,
    action?.player?.id,
    action?.defaultAmount,
  ]);

  if (!action) {
    return null;
  }

  const numericAmount =
    Math.round(
      Number(
        amount
      )
    );

  const validAmount =
    Number.isFinite(
      numericAmount
    ) &&
    numericAmount > 0;

  const isBid =
    action.type ===
    "bid";

  const exceedsMaxBid =
    isBid &&
    Number(
      finances
        ?.maximumBid ||
      0
    ) > 0 &&
    numericAmount >
      Number(
        finances
          ?.maximumBid
      );

  const listedPrice =
    Number(
      action
        ?.player
        ?.marketIntelligence
        ?.listedPrice ||
      action
        ?.player
        ?.salePrice ||
      0
    );

  const belowListing =
    isBid &&
    listedPrice > 0 &&
    numericAmount <
      listedPrice;

  const canConfirm =
    validAmount &&
    acknowledged &&
    !exceedsMaxBid &&
    !loading;

  const submit =
    () => {
      if (!canConfirm) {
        return;
      }

      onConfirm({
        amount:
          numericAmount,

        rejectOffers:
          Boolean(
            rejectOffers
          ),
      });
    };

  return (
    <Modal
      open={Boolean(action)}
      onClose={() => {
        if (!loading) {
          onClose();
        }
      }}
      title={
        isBid
          ? `Confirmar puja · ${action.player.name}`
          : `Poner a la venta · ${action.player.name}`
      }
      subtitle="Esta operación modifica tu liga real de Biwenger."
      wide
    >
      <div className="real-action-warning">
        <span>
          ⚠
        </span>

        <div>
          <strong>
            Operación real
          </strong>

          <p>
            No se enviará nada a Biwenger hasta que marques
            la confirmación y pulses el botón final.
          </p>
        </div>
      </div>

      <div className="real-action-player">
        <PlayerPhoto
          player={
            action.player
          }
          size="normal"
        />

        <div>
          <div className="modal-badges">
            <Position
              position={
                action
                  .player
                  .position
              }
            />

            {isBid ? (
              <SellerBadge
                player={
                  action.player
                }
              />
            ) : (
              <Recommendation
                value={
                  action
                    .player
                    .analysis
                    ?.recommendation
                }
              />
            )}
          </div>

          <h3>
            {
              action
                .player
                .name
            }
          </h3>

          <span>
            {
              action
                .player
                .teamName
            }
          </span>
        </div>
      </div>

      <div className="real-action-grid">
        <DetailMetric
          label={
            isBid
              ? "Precio pedido"
              : "Valor Biwenger"
          }
          value={
            formatMoney(
              isBid
                ? listedPrice
                : action
                    .player
                    .price
            )
          }
        />

        <DetailMetric
          label={
            isBid
              ? "Puja máxima"
              : "Saldo actual"
          }
          value={
            formatMoney(
              isBid
                ? finances
                    ?.maximumBid
                : finances
                    ?.balance
            )
          }
        />

        <DetailMetric
          label={
            isBid
              ? "Saldo"
              : "Puntos"
          }
          value={
            isBid
              ? formatMoney(
                  finances
                    ?.balance
                )
              : `${action.player.points || 0} pts`
          }
        />
      </div>

      <label className="real-action-amount">
        <span>
          {isBid
            ? "Importe de la puja"
            : "Precio de venta"}
        </span>

        <div className="real-action-input-wrap">
          <input
            type="number"
            min="1"
            step="10000"
            inputMode="numeric"
            value={
              amount
            }
            onChange={
              (event) =>
                setAmount(
                  event.target.value
                )
            }
            disabled={
              loading
            }
          />

          <b>
            €
          </b>
        </div>

        <small>
          {validAmount
            ? formatMoney(
                numericAmount
              )
            : "Introduce un importe válido"}
        </small>
      </label>

      {belowListing && (
        <div className="real-action-note warning">
          La puja está por debajo del precio publicado.
          Biwenger decidirá si es válida para ese vendedor.
        </div>
      )}

      {exceedsMaxBid && (
        <div className="real-action-note danger">
          El importe supera tu puja máxima actual de{" "}
          {formatMoney(
            finances
              ?.maximumBid
          )}.
        </div>
      )}

      {!isBid && (
        <label className="real-action-checkbox secondary-check">
          <input
            type="checkbox"
            checked={
              rejectOffers
            }
            onChange={
              (event) =>
                setRejectOffers(
                  event
                    .target
                    .checked
                )
            }
            disabled={
              loading
            }
          />

          <span>
            <strong>
              Rechazar ofertas existentes
            </strong>

            <small>
              Está desactivado por defecto. Actívalo solo si
              quieres descartar las ofertas ya recibidas.
            </small>
          </span>
        </label>
      )}

      <label className="real-action-checkbox">
        <input
          type="checkbox"
          checked={
            acknowledged
          }
          onChange={
            (event) =>
              setAcknowledged(
                event
                  .target
                  .checked
              )
          }
          disabled={
            loading
          }
        />

        <span>
          <strong>
            Confirmo que he revisado el jugador y el importe.
          </strong>

          <small>
            Esta casilla es obligatoria para ejecutar la operación.
          </small>
        </span>
      </label>

      {error && (
        <div className="real-action-error">
          {error}
        </div>
      )}

      <div className="real-action-footer">
        <button
          type="button"
          className="real-action-cancel"
          onClick={
            onClose
          }
          disabled={
            loading
          }
        >
          Cancelar
        </button>

        <button
          type="button"
          className={
            isBid
              ? "real-action-confirm bid"
              : "real-action-confirm sell"
          }
          onClick={
            submit
          }
          disabled={
            !canConfirm
          }
        >
          {loading
            ? "Enviando..."
            : isBid
              ? `Confirmar puja · ${validAmount ? formatMoney(numericAmount) : "-"}`
              : `Confirmar venta · ${validAmount ? formatMoney(numericAmount) : "-"}`}
        </button>
      </div>
    </Modal>
  );
}

function PlayerDetailModal({
  player,
  onClose,
  context = "team",
  now,
  onSell,
  onBid,
}) {
  if (!player) return null;

  const intel = player.marketIntelligence || null;
  const [, statusLabel, statusClass] = statusConfig(player.status);
  const breakdown = player.analysis?.breakdown || {};

  return (
    <Modal
      open={Boolean(player)}
      onClose={onClose}
      title={player.name}
      subtitle={`${player.teamName} · ${player.position}`}
      wide
    >
      <div className="player-modal-hero">
        <div className="player-modal-identity">
          <PlayerPhoto player={player} size="large" />

          <div>
            <div className="modal-badges">
              <Position position={player.position} />
              <Recommendation value={player.analysis?.recommendation} />
            </div>

            <h3>{player.name}</h3>
            <p>{player.teamName}</p>

            <span className={`status ${statusClass}`}>
              {statusConfig(player.status)[0]} {statusLabel}
            </span>
          </div>
        </div>

        <SportsSourcesButton
          player={player}
        />

        <AnalysisScore
          analysis={player.analysis}
          compact
        />
      </div>

      <div className="player-detail-actions">
        {context === "team" && onSell && (
          <button
            type="button"
            className="operation-button sell"
            onClick={() =>
              onSell(
                player
              )
            }
          >
            <span>🏷</span>
            Poner a la venta
          </button>
        )}

        {context === "market" && onBid && !player.isMine && (
          <button
            type="button"
            className="operation-button bid"
            onClick={() =>
              onBid(
                player
              )
            }
          >
            <span>💰</span>
            Pujar por {player.name}
          </button>
        )}
      </div>

      {context === "market" && (
        <div className="market-modal-seller-row">
          <SellerBadge player={player} />
          <Countdown target={player.until} now={now} />
        </div>
      )}

      {player.statusInfo && (
        <div className="detail-alert">
          <strong>Estado / novedad</strong>
          <p>{player.statusInfo}</p>
        </div>
      )}

      <div className="detail-metrics-grid">
        <DetailMetric label="Valor actual" value={formatMoney(player.price)} />

        {context === "market" && intel ? (
          <DetailMetric label="Precio pedido" value={formatMoney(intel.listedPrice)} />
        ) : (
          <DetailMetric label="Puntos" value={`${player.points || 0} pts`} />
        )}

        <DetailMetric
          label="Cambio diario"
          value={formatChange(player.priceIncrement)}
          className={changeClass(player.priceIncrement)}
        />

        <DetailMetric
          label="Puntos / millón"
          value={`${player.analysis?.pointsPerMillion ?? intel?.pointsPerMillion ?? 0} pts/M€`}
        />

        <DetailMetric
          label="Media actual"
          value={`${player.analysis?.ppg ?? 0} pts/partido`}
        />

        <div className="detail-metric">
          <span>Últimas 3</span>
          <Fitness values={player.fitness} />
        </div>
      </div>

      {context === "market" && intel && (
        <section className="modal-section">
          <div className="modal-section-title">
            <div>
              <span className="section-label">MERCADO</span>
              <h3>Recomendación de compra</h3>
            </div>

            <span
              className={`price-tag price-${String(intel.priceTag || "JUSTO")
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {intel.priceTag || "JUSTO"}
            </span>
          </div>

          <div className="bid-highlight">
            <div>
              <span>Puja máxima recomendada</span>
              <strong>{formatMoney(intel.recommendedMaxBid)}</strong>
            </div>

            <b
              className={
                intel.shouldBid
                  ? "bid-decision bid-decision-yes"
                  : "bid-decision bid-decision-no"
              }
            >
              {intel.shouldBid ? "PUJAR" : "NO PUJAR"}
            </b>
          </div>
        </section>
      )}

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">PRÓXIMA JORNADA</span>
            <h3>Próximo partido</h3>
          </div>
        </div>

        <Fixture match={player.nextMatch} />
      </section>

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">ANÁLISIS</span>
            <h3>Desglose de la nota</h3>
          </div>
        </div>

        <AnalysisScore analysis={player.analysis} />

        <div className="breakdown-grid">
          <Breakdown label="Forma" value={breakdown.form} />
          <Breakdown label="Puntos" value={breakdown.points} />
          <Breakdown label="Tendencia" value={breakdown.trend} />
          <Breakdown label="Valor" value={breakdown.value} />
          <Breakdown label="Disponibilidad" value={breakdown.availability} />
          <Breakdown label="Histórico" value={breakdown.history} />
          <Breakdown label="Próximo rival" value={breakdown.fixture} />
        </div>
      </section>

      {context === "market" && intel?.competitors?.length > 0 && (
        <section className="modal-section">
          <div className="modal-section-title">
            <div>
              <span className="section-label">COMPETENCIA</span>
              <h3>Rivales que podrían pujar</h3>
            </div>

            <strong>
              {intel.competitionLabel} · {intel.competitionScore}/100
            </strong>
          </div>

          <div className="competitor-modal-list">
            {intel.competitors.map((rival) => (
              <div className="competitor-modal-row" key={rival.userId}>
                <div>
                  <strong>{rival.name}</strong>
                  <span>{rival.reason}</span>
                </div>
                <b>{rival.threatScore}/100</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </Modal>
  );
}

function TeamChip({ player, onDetails, onSell }) {
  return (
    <article className="player-chip">
      <div className="chip-photo-wrap">
        <PlayerPhoto player={player} size="chip" />
        <Status status={player.status} compact />
      </div>

      <div className="chip-main">
        <div className="chip-title-row">
          <div className="chip-name">
            <Position position={player.position} />
            <strong>{player.name}</strong>
          </div>
          <Recommendation value={player.analysis?.recommendation} />
        </div>

        <span className="chip-club">{player.teamName}</span>

        <div className="chip-stats">
          <span><small>Valor</small><strong>{formatMoney(player.price)}</strong></span>
          <span><small>Puntos</small><strong>{player.points || 0}</strong></span>
          <span><small>Nota</small><strong>{player.analysis?.score || 0}/100</strong></span>
          <span>
            <small>Hoy</small>
            <strong className={changeClass(player.priceIncrement)}>
              {formatChange(player.priceIncrement)}
            </strong>
          </span>
        </div>

        <div className="chip-action-row">
          <DetailButton
            onClick={() =>
              onDetails(
                player
              )
            }
          />

          <button
            type="button"
            className="chip-operation-button sell"
            onClick={() =>
              onSell(
                player
              )
            }
          >
            🏷 Vender
          </button>
        </div>
      </div>
    </article>
  );
}

function MarketChip({ player, onDetails, onBid, now }) {
  const intel = player.marketIntelligence || {};

  return (
    <article className={`market-chip ${intel.shouldBid ? "market-chip-highlight" : ""}`}>
      <div className="market-chip-left">
        <PlayerPhoto player={player} size="chip" />

        <div className="market-chip-identity">
          <div className="chip-name">
            <Position position={player.position} />
            <strong>{player.name}</strong>
          </div>

          <span>{player.teamName}</span>

          <div className="market-labels">
            <span
              className={`price-tag price-${String(intel.priceTag || "JUSTO")
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {intel.priceTag || "JUSTO"}
            </span>
            <Recommendation value={player.analysis?.recommendation} />
          </div>
        </div>
      </div>

      <div className="market-chip-seller">
        <SellerBadge player={player} />
        <Countdown target={player.until} now={now} />
      </div>

      <div className="market-chip-stats market-chip-stats-v2">
        <div>
          <span>Precio</span>
          <strong>{formatMoney(intel.listedPrice)}</strong>
        </div>
        <div>
          <span>Valor</span>
          <strong>{formatMoney(intel.marketValue)}</strong>
        </div>
        <div>
          <span>Rendimiento</span>
          <strong>{intel.pointsPerMillion || 0} pts/M€</strong>
        </div>
        <div className="market-chip-bid">
          <span>Puja máxima</span>
          <strong>{formatMoney(intel.recommendedMaxBid)}</strong>
        </div>
      </div>

      <div className="market-chip-action">
        <b
          className={
            intel.shouldBid
              ? "bid-decision bid-decision-yes"
              : "bid-decision bid-decision-no"
          }
        >
          {intel.shouldBid ? "RECOMENDADO" : "NO RECOMENDADO"}
        </b>

        <button
          type="button"
          className="chip-operation-button bid"
          onClick={() =>
            onBid(
              player
            )
          }
        >
          💰 Pujar
        </button>

        <DetailButton
          onClick={() =>
            onDetails(
              player
            )
          }
        />
      </div>
    </article>
  );
}

function MarketStatusBar({
  meta,
  market,
  now,
  notificationPermission,
  onEnableNotifications,
  historyCount,
  onOpenHistory,
}) {
  const systemCount = market.filter(
    (player) => player.sellerType === "market"
  ).length;

  const usersCount = market.filter(
    (player) => player.sellerType === "user"
  ).length;

  const fallbackNext = useMemo(() => {
    const systemDeadlines = market
      .filter((player) => player.sellerType === "market")
      .map((player) => toMilliseconds(player.until))
      .filter((value) => value && value > now);

    const allDeadlines = market
      .map((player) => toMilliseconds(player.until))
      .filter((value) => value && value > now);

    const values = systemDeadlines.length
      ? systemDeadlines
      : allDeadlines;

    return values.length ? Math.min(...values) : null;
  }, [market, now]);

  const nextChange = meta?.nextMarketChangeAt || fallbackNext;

  return (
    <section className="market-status-bar">
      <div className="market-clock-card">
        <div className="market-clock-icon">⏱</div>
        <div>
          <span>Próximo cambio de mercado</span>
          <Countdown target={nextChange} now={now} label="Tiempo restante" />
          <small>
            Estimado por el vencimiento de las ofertas del mercado.
          </small>
        </div>
      </div>

      <div className="market-status-stats">
        <div>
          <span>Mercado Biwenger</span>
          <strong>{systemCount}</strong>
        </div>
        <div>
          <span>Otros jugadores</span>
          <strong>{usersCount}</strong>
        </div>
        <div>
          <span>Actualización</span>
          <strong>60 s</strong>
        </div>
      </div>

      <div className="notification-actions">
        <button
          className={`notification-button permission-${notificationPermission}`}
          onClick={onEnableNotifications}
        >
          <span>🔔</span>
          <div>
            <strong>
              {notificationPermission === "granted"
                ? "Notificaciones activas"
                : notificationPermission === "denied"
                  ? "Notificaciones bloqueadas"
                  : notificationPermission === "unsupported"
                    ? "Solo avisos en pantalla"
                    : "Activar notificaciones"}
            </strong>
            <small>
              {notificationPermission === "granted"
                ? "Te avisaremos cuando detectemos cambios."
                : "Los avisos internos siempre están activos."}
            </small>
          </div>
        </button>

        <button className="notification-history-button" onClick={onOpenHistory}>
          <span>🕘</span>
          <div>
            <strong>Historial de avisos</strong>
            <small>Ver cambios detectados</small>
          </div>
          <b>{historyCount}</b>
        </button>
      </div>
    </section>
  );
}

function MarketFilters({ value, onChange, counts }) {
  const filters = [
    ["all", "Todos", counts.all],
    ["market", "Mercado", counts.market],
    ["users", "Jugadores", counts.users],
  ];

  return (
    <div className="market-filters">
      {filters.map(([key, label, count]) => (
        <button
          key={key}
          className={value === key ? "active" : ""}
          onClick={() => onChange(key)}
        >
          {label}<span>{count}</span>
        </button>
      ))}
    </div>
  );
}

const MARKET_POSITIONS = [
  {
    key: "all",
    label: "Todas",
    description:
      "Mostrar todas las posiciones",
    icon: "⚽",
  },
  {
    key: "AR",
    label: "Porteros",
    description:
      "Arqueros y porteros",
    icon: "🧤",
  },
  {
    key: "DF",
    label: "Defensas",
    description:
      "Laterales y defensores",
    icon: "🛡️",
  },
  {
    key: "MC",
    label: "Centrocampistas",
    description:
      "Mediocampistas",
    icon: "🎯",
  },
  {
    key: "DL",
    label: "Delanteros",
    description:
      "Atacantes",
    icon: "⚡",
  },
];

function MarketPositionFilterButton({
  value,
  counts,
  onClick,
}) {
  const current =
    MARKET_POSITIONS.find(
      (item) =>
        item.key ===
        value
    ) ||
    MARKET_POSITIONS[0];

  return (
    <button
      type="button"
      className={`market-position-filter-button ${
        value !== "all"
          ? "active"
          : ""
      }`}
      onClick={onClick}
    >
      <span className="market-position-filter-icon">
        {current.icon}
      </span>

      <span className="market-position-filter-copy">
        <small>
          Posición
        </small>

        <strong>
          {current.label}
        </strong>
      </span>

      <span className="market-position-filter-count">
        {counts?.[
          value
        ] ??
          counts?.all ??
          0}
      </span>

      <span className="market-position-filter-chevron">
        ⌄
      </span>
    </button>
  );
}

function MarketPositionFilterModal({
  open,
  value,
  counts,
  onSelect,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filtrar por posición"
      subtitle="Elige qué posición quieres ver en el mercado."
    >
      <div className="position-filter-list">
        {MARKET_POSITIONS.map(
          (item) => {
            const active =
              value ===
              item.key;

            return (
              <button
                type="button"
                key={
                  item.key
                }
                className={`position-filter-option ${
                  active
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  onSelect(
                    item.key
                  );

                  onClose();
                }}
              >
                <span className="position-filter-option-icon">
                  {item.icon}
                </span>

                <span className="position-filter-option-copy">
                  <strong>
                    {item.label}
                  </strong>

                  <small>
                    {
                      item.description
                    }
                  </small>
                </span>

                {item.key !==
                  "all" && (
                  <Position
                    position={
                      item.key
                    }
                  />
                )}

                <span className="position-filter-option-count">
                  {counts?.[
                    item.key
                  ] || 0}
                </span>

                <span className="position-filter-check">
                  {active
                    ? "✓"
                    : ""}
                </span>
              </button>
            );
          }
        )}
      </div>
    </Modal>
  );
}

function BestXI({ bestXI, onPlayerDetails }) {
  if (!bestXI?.players?.length) {
    return <div className="empty-state">No se pudo generar un XI con la plantilla actual.</div>;
  }

  const groups = {
    DL: bestXI.players.filter((player) => player.position === "DL"),
    MC: bestXI.players.filter((player) => player.position === "MC"),
    DF: bestXI.players.filter((player) => player.position === "DF"),
    AR: bestXI.players.filter((player) => player.position === "AR"),
  };

  return (
    <main>
      <div className="xi-topbar">
        <div>
          <span className="section-label">MEJOR XI AUTOMÁTICO</span>
          <h2>Formación {bestXI.formation}</h2>
          <p>Proyección base: <strong>{bestXI.totalProjection} pts</strong></p>
        </div>

        <div className="xi-specials">
          <div><span>👑 Capitán</span><strong>{bestXI.captain?.name || "-"}</strong></div>
          <div><span>🎯 Delantero especial</span><strong>{bestXI.striker?.name || "-"}</strong></div>
        </div>
      </div>

      <section className="football-pitch">
        <div className="pitch-border" />
        <div className="pitch-half-line" />
        <div className="pitch-center-circle" />
        <div className="pitch-center-dot" />
        <div className="penalty-box penalty-box-top" />
        <div className="goal-box goal-box-top" />
        <div className="penalty-box penalty-box-bottom" />
        <div className="goal-box goal-box-bottom" />

        <PitchLine className="pitch-line-forwards" players={groups.DL} bestXI={bestXI} onPlayerDetails={onPlayerDetails} />
        <PitchLine className="pitch-line-midfield" players={groups.MC} bestXI={bestXI} onPlayerDetails={onPlayerDetails} />
        <PitchLine className="pitch-line-defense" players={groups.DF} bestXI={bestXI} onPlayerDetails={onPlayerDetails} />
        <PitchLine className="pitch-line-goalkeeper" players={groups.AR} bestXI={bestXI} onPlayerDetails={onPlayerDetails} />
      </section>

      <p className="read-only-note">Esta alineación es solo una recomendación y no modifica Biwenger.</p>
    </main>
  );
}

function PitchLine({ players, className, bestXI, onPlayerDetails }) {
  return (
    <div className={`pitch-line ${className}`}>
      {players.map((player) => {
        const isCaptain = Number(bestXI.captain?.id) === Number(player.id);
        const isStriker = Number(bestXI.striker?.id) === Number(player.id);

        return (
          <button className="pitch-player" key={player.id} onClick={() => onPlayerDetails(player)}>
            <div className="pitch-player-photo">
              <PlayerPhoto player={player} size="pitch" />
              {isCaptain && <span className="pitch-role pitch-role-captain">C</span>}
              {isStriker && <span className="pitch-role pitch-role-striker">9</span>}
            </div>
            <strong>{player.name}</strong>
            <span>{player.projectedPoints} pts</span>
          </button>
        );
      })}
    </div>
  );
}

function RivalLeagueTable({ rivals, onDetails }) {
  if (!rivals?.length) {
    return <div className="empty-state">No hay información de rivales disponible.</div>;
  }

  return (
    <div className="league-table-wrap">
      <table className="league-table">
        <thead>
          <tr>
            <th>Pos.</th><th>Equipo</th><th>Puntos</th><th>Fuerza</th><th>Jugadores</th><th>Valor plantilla</th><th>Necesidad</th><th />
          </tr>
        </thead>
        <tbody>
          {rivals.map((rival, index) => (
            <tr key={rival.id}>
              <td><span className="league-position">{rival.position || index + 1}</span></td>
              <td>
                <div className="league-team">
                  <div className="league-team-icon">{rival.name?.charAt(0)?.toUpperCase() || "?"}</div>
                  <div>
                    <strong>{rival.name}</strong>
                    <span>{rival.balanceVisible ? `Saldo ${formatMoney(rival.balance)}` : "Saldo oculto"}</span>
                  </div>
                </div>
              </td>
              <td><strong>{rival.points || 0}</strong></td>
              <td><div className="strength-cell"><strong>{rival.strength}</strong><span>/100</span></div></td>
              <td>{rival.playerCount}</td>
              <td><strong>{formatMoney(rival.teamValue)}</strong></td>
              <td>
                {rival.needs?.[0] ? (
                  <span className="need-pill">{rival.needs[0].position} · faltan {rival.needs[0].missing}</span>
                ) : (
                  <span className="balanced-pill">Equilibrado</span>
                )}
              </td>
              <td><button className="table-detail-button" onClick={() => onDetails(rival)}>Ver detalle</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RivalDetailModal({ rival, onClose, balanceHidden }) {
  if (!rival) return null;

  const sortedPlayers = [...(rival.players || [])].sort(
    (a, b) => Number(b.analysisScore || 0) - Number(a.analysisScore || 0)
  );

  return (
    <Modal open={Boolean(rival)} onClose={onClose} title={rival.name} subtitle="Detalle del rival" wide>
      <div className="rival-modal-summary">
        <DetailMetric label="Posición" value={rival.position ? `#${rival.position}` : "-"} />
        <DetailMetric label="Fuerza" value={`${rival.strength}/100`} />
        <DetailMetric label="Jugadores" value={rival.playerCount} />
        <DetailMetric label="Valor plantilla" value={formatMoney(rival.teamValue)} />
        <DetailMetric label="Puntos" value={rival.points || 0} />
        <DetailMetric label="Saldo" value={rival.balanceVisible ? formatMoney(rival.balance) : balanceHidden ? "Oculto" : "No disponible"} />
      </div>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">PLANTILLA</span><h3>Distribución por posición</h3></div></div>
        <div className="position-summary">
          {Object.entries(rival.positions || {}).map(([position, count]) => (
            <div key={position}><Position position={position} /><strong>{count}</strong><span>jugadores</span></div>
          ))}
        </div>
      </section>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">NECESIDADES</span><h3>Posiciones que podría reforzar</h3></div></div>
        {rival.needs?.length ? (
          <div className="needs-list">
            {rival.needs.map((need) => (
              <div className="need-card" key={need.position}>
                <Position position={need.position} />
                <div><strong>Le faltan {need.missing}</strong><span>Tiene {need.current} · objetivo {need.target}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-alert detail-alert-success">Plantilla equilibrada según nuestro modelo.</div>
        )}
      </section>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">JUGADORES</span><h3>Jugadores detectados</h3></div></div>
        {sortedPlayers.length ? (
          <div className="rival-player-list">
            {sortedPlayers.map((player) => (
              <div className="rival-player-row" key={player.id}>
                <Position position={player.position} /><strong>{player.name}</strong><span>{formatMoney(player.price)}</span><b>{player.analysisScore}/100</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="fixture-empty">Biwenger no devolvió la plantilla completa de este rival.</div>
        )}
      </section>
    </Modal>
  );
}

function SectionHeader({ label, title, description, children }) {
  return (
    <div className="section-header">
      <div><span className="section-label">{label}</span><h2>{title}</h2></div>
      <div className="section-header-right"><p>{description}</p>{children}</div>
    </div>
  );
}

function createMarketSnapshot(market) {
  const snapshot = {};

  for (const player of market || []) {
    if (player.isMine) continue;

    const key = `${player.id}:${player.ownerId || 0}`;

    snapshot[key] = {
      id: Number(player.id),
      name: player.name,
      ownerId: Number(player.ownerId || 0),
      ownerName: player.ownerName || "Mercado Biwenger",
      sellerType:
        player.sellerType || (player.ownerId ? "user" : "market"),
      salePrice: Number(
        player.salePrice || player.marketIntelligence?.listedPrice || 0
      ),
      until: Number(player.until || 0) || null,
    };
  }

  return snapshot;
}

function marketSellerName(item) {
  if (item?.sellerType === "market") return "Mercado Biwenger";
  return item?.ownerName || "Otro participante";
}

function marketEventIcon(eventType) {
  return {
    added: "➕",
    removed: "↩",
    price: "💰",
    deadline: "⏱",
    refresh: "🔄",
  }[eventType] || "🔔";
}

function compareMarketSnapshots(previous, next) {
  const previousKeys = Object.keys(previous || {});
  const nextKeys = Object.keys(next || {});

  if (!previousKeys.length) return [];

  const previousSet = new Set(previousKeys);
  const nextSet = new Set(nextKeys);
  const events = [];

  for (const key of nextKeys) {
    if (previousSet.has(key)) continue;

    const item = next[key];
    const seller = marketSellerName(item);

    events.push({
      eventType: "added",
      type: "market",
      icon: marketEventIcon("added"),
      playerId: item?.id,
      playerName: item?.name,
      actorName: seller,
      title: `${item?.name || "Un jugador"} entró al mercado`,
      message:
        `${seller} puso a ${item?.name || "este jugador"} en venta por ` +
        `${formatMoney(item?.salePrice)}.`,
    });
  }

  for (const key of previousKeys) {
    if (nextSet.has(key)) continue;

    const item = previous[key];
    const seller = marketSellerName(item);
    const isSystem = item?.sellerType === "market";

    events.push({
      eventType: "removed",
      type: "market",
      icon: marketEventIcon("removed"),
      playerId: item?.id,
      playerName: item?.name,
      actorName: seller,
      title: `${item?.name || "Un jugador"} salió del mercado`,
      message: isSystem
        ? `La oferta de ${item?.name || "este jugador"} del Mercado Biwenger terminó o fue retirada. Precio anterior: ${formatMoney(item?.salePrice)}.`
        : `${item?.name || "Este jugador"} ya no está disponible. Último oferente: ${seller}. Precio anterior: ${formatMoney(item?.salePrice)}.`,
    });
  }

  for (const key of nextKeys) {
    if (!previousSet.has(key)) continue;

    const before = previous[key];
    const after = next[key];
    const seller = marketSellerName(after);

    if (Number(before?.salePrice) !== Number(after?.salePrice)) {
      events.push({
        eventType: "price",
        type: "market",
        icon: marketEventIcon("price"),
        playerId: after?.id,
        playerName: after?.name,
        actorName: seller,
        title: `Cambió el precio de ${after?.name || "un jugador"}`,
        message:
          `${seller}: ${formatMoney(before?.salePrice)} → ` +
          `${formatMoney(after?.salePrice)}.`,
      });
    }

    if (
      Number(before?.until || 0) !==
      Number(after?.until || 0)
    ) {
      events.push({
        eventType: "deadline",
        type: "market",
        icon: marketEventIcon("deadline"),
        playerId: after?.id,
        playerName: after?.name,
        actorName: seller,
        title: `Se actualizó el tiempo de ${after?.name || "una oferta"}`,
        message:
          `${seller}. Nuevo vencimiento: ${formatDate(after?.until)}.`,
      });
    }
  }

  return events;
}

function readNotificationHistory() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotificationHistory(history) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      NOTIFICATION_HISTORY_KEY,
      JSON.stringify(history)
    );
  } catch {
    // localStorage es opcional.
  }
}

function formatNotificationDate(value) {
  if (!value) return "-";

  return new Date(Number(value)).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Toasts({ items, onClose }) {
  return (
    <div className="toast-stack">
      {items.map((item) => (
        <article className={`toast toast-${item.type || "info"}`} key={item.id}>
          <div className="toast-icon">
            {item.icon || (item.type === "market" ? "🔔" : "ℹ️")}
          </div>

          <div className="toast-content">
            <span className="toast-kicker">
              {item.eventType === "removed"
                ? "SALIDA DEL MERCADO"
                : item.eventType === "added"
                  ? "NUEVA OFERTA"
                  : item.eventType === "price"
                    ? "CAMBIO DE PRECIO"
                    : item.eventType === "deadline"
                      ? "TIEMPO ACTUALIZADO"
                      : "NOTIFICACIÓN"}
            </span>

            <strong>{item.title}</strong>
            <p>{item.message}</p>

            {(item.playerName || item.actorName) && (
              <div className="toast-meta">
                {item.playerName && <span>⚽ {item.playerName}</span>}
                {item.actorName && <span>👤 {item.actorName}</span>}
              </div>
            )}
          </div>

          <button onClick={() => onClose(item.id)} aria-label="Cerrar aviso">
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

function NotificationHistoryModal({
  open,
  items,
  onClose,
  onClear,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Historial de notificaciones"
      subtitle="Cambios de mercado detectados por Liga Fantasy"
      wide
    >
      <div className="notification-history-toolbar">
        <div>
          <span>Registros guardados</span>
          <strong>{items.length}</strong>
        </div>

        {items.length > 0 && (
          <button className="notification-history-clear" onClick={onClear}>
            Limpiar historial
          </button>
        )}
      </div>

      {items.length ? (
        <div className="notification-history-list">
          {items.map((item) => (
            <article
              className={`notification-history-item event-${item.eventType || "info"}`}
              key={item.id}
            >
              <div className="notification-history-icon">
                {item.icon || marketEventIcon(item.eventType)}
              </div>

              <div className="notification-history-content">
                <div className="notification-history-title-row">
                  <strong>{item.title}</strong>
                  <time>{formatNotificationDate(item.createdAt)}</time>
                </div>

                <p>{item.message}</p>

                {(item.playerName || item.actorName) && (
                  <div className="notification-history-meta">
                    {item.playerName && (
                      <span>
                        Jugador: <b>{item.playerName}</b>
                      </span>
                    )}

                    {item.actorName && (
                      <span>
                        Oferente: <b>{item.actorName}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          Todavía no hay notificaciones guardadas.
        </div>
      )}
    </Modal>
  );
}

function ApiProtectionPanel({
  system,
  isLeader,
  now,
}) {
  if (!system) {
    return null;
  }

  const usage =
    system.apiUsage ||
    {};

  const next =
    system.nextRefresh ||
    {};

  const level =
    usage.level ||
    (
      system.rateLimited
        ? "blocked"
        : "safe"
    );

  const lastRequestMs =
    usage.lastRequestAt
      ? Date.parse(
          usage.lastRequestAt
        )
      : null;

  const lastRequestText =
    lastRequestMs
      ? `${formatShortDuration(
          Math.max(
            0,
            Math.floor(
              (
                now -
                lastRequestMs
              ) /
              1000
            )
          )
        )} atrás`
      : "Ninguna todavía";

  const endpointRows =
    usage.endpointsLastHour ||
    [];

  return (
    <section
      className={`api-protection-panel api-level-${level}`}
    >
      <div className="api-protection-head">
        <div>
          <span className="section-label">
            PROTECCIÓN BIWENGER
          </span>

          <h3>
            {level === "blocked"
              ? "Cooldown activo"
              : level === "high"
                ? "Uso elevado"
                : level === "controlled"
                  ? "Uso controlado"
                  : "Estado seguro"}
          </h3>

          <p>
            {isLeader
              ? "Esta pestaña es la única que realiza actualizaciones automáticas."
              : "Otra pestaña controla las actualizaciones. Esta recibe los datos compartidos."}
          </p>
        </div>

        <span
          className={`api-role ${
            isLeader
              ? "leader"
              : "follower"
          }`}
        >
          {isLeader
            ? "● Pestaña líder"
            : "○ Pestaña secundaria"}
        </span>
      </div>

      <div className="api-protection-metrics">
        <div>
          <span>Última hora</span>
          <strong>{usage.requestsLastHour ?? 0}</strong>
          <small>peticiones reales</small>
        </div>

        <div>
          <span>Hoy</span>
          <strong>{usage.requestsToday ?? 0}</strong>
          <small>peticiones reales</small>
        </div>

        <div>
          <span>Evitadas</span>
          <strong>{usage.avoidedLastHour ?? 0}</strong>
          <small>por caché · última hora</small>
        </div>

        <div>
          <span>Cola</span>
          <strong>{usage.queue?.queued ?? 0}</strong>
          <small>1 petición cada 4s</small>
        </div>

        <div>
          <span>Última petición</span>
          <strong className="api-small-value">
            {lastRequestText}
          </strong>
          <small>Biwenger</small>
        </div>
      </div>

      <div className="api-next-refresh">
        <div>
          <span>Mercado</span>
          <strong>{formatShortDuration(next.marketSeconds)}</strong>
        </div>

        <div>
          <span>Mi equipo</span>
          <strong>{formatShortDuration(next.ownUserSeconds)}</strong>
        </div>

        <div>
          <span>Rivales</span>
          <strong>{formatShortDuration(next.rivalsSeconds)}</strong>
        </div>

        <div>
          <span>Catálogo</span>
          <strong>{formatShortDuration(next.catalogSeconds)}</strong>
        </div>
      </div>

      {endpointRows.length > 0 && (
        <details className="api-endpoint-details">
          <summary>Ver uso por endpoint</summary>

          <div>
            {endpointRows.map((item) => (
              <span key={item.endpoint}>
                <b>{item.endpoint}</b>
                {item.count}
              </span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

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

  const [tab, setTab] = useState("team");
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
    } = {}) => {
      if (
        apiLeaderRef.current
      ) {
        return loadData({
          silent,
          refresh,
          includeRivals,
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
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const market = useMemo(
    () => (data?.market || []).filter((player) => !player.isMine),
    [data]
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
    <div className="app">
      <Toasts items={toasts} onClose={removeToast} />

      <header className="header">
        <div>
          <span className="brand">⚽ LIGA FANTASY</span>
          <h1>{data?.league?.name || "Mi Liga"}</h1>
          <p>
            {data?.user?.name}
            {data?.user?.position ? ` · #${data.user.position}` : ""}
          </p>
        </div>

        <button
          className="refresh-button"
          disabled={
            refreshing ||
            manualRefreshRemaining > 0 ||
            data?.system?.rateLimited
          }
          onClick={handleManualRefresh}
        >
          {data?.system?.rateLimited
            ? "Protección activa"
            : refreshing
              ? "Actualizando..."
              : manualRefreshRemaining > 0
                ? `Actualizar en ${manualRefreshRemaining}s`
                : "Actualizar datos"}
        </button>
      </header>

      {error && <div className="warning">{error}</div>}

      {data?.system && (
        <div
          className={`cache-status ${
            data.system.rateLimited
              ? "rate-limited"
              : "healthy"
          }`}
        >
          <div>
            <strong>
              {data.system.rateLimited
                ? "🛡 Protección de API activa"
                : "⚡ Caché inteligente activa"}
            </strong>

            <span>
              Mercado 5 min · Tu equipo 10 min · Rivales 30 min bajo demanda · Catálogo 6 h
            </span>
          </div>

          {data.system.rateLimitUntil && (
            <small>
              Cooldown hasta{" "}
              {new Date(
                data.system.rateLimitUntil
              ).toLocaleTimeString(
                "es-BO",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </small>
          )}
        </div>
      )}

      <ApiProtectionPanel
        system={data?.system}
        isLeader={isApiLeader}
        now={now}
      />

      <section className="metrics">
        <Metric label="Jugadores" value={data?.squad?.length || 0} description="Plantilla" />
        <Metric label="Valor equipo" value={formatMoney(data?.finances?.teamValue)} description="Valor actual" />
        <Metric label="Saldo" value={formatMoney(data?.finances?.balance)} description="Disponible" />
        <Metric label="Puja máxima" value={formatMoney(data?.finances?.maximumBid)} description="Límite Biwenger" />
        <Metric label="Patrimonio" value={formatMoney(data?.finances?.totalAssets)} description="Saldo + equipo" />
      </section>

      <nav className="tabs">
        <button className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Mi equipo<span>{data?.squad?.length || 0}</span></button>
        <button className={tab === "market" ? "active" : ""} onClick={() => setTab("market")}>Mercado<span>{market.length}</span></button>
        <button className={tab === "xi" ? "active" : ""} onClick={() => setTab("xi")}>Mejor XI</button>
        <button className={tab === "rivals" ? "active" : ""} onClick={() => setTab("rivals")}>Rivales<span>{data?.rivals?.length || 0}</span></button>
      </nav>

      {tab === "team" && (
        <main>
          <SectionHeader
            label="MI EQUIPO"
            title="Plantilla"
            description="Vista compacta. Abre un jugador para ver partido, forma y análisis."
          />

          <section className="team-chip-grid">
            {(data?.squad || []).map((player) => (
              <TeamChip
                player={player}
                key={player.id}
                onDetails={setSelectedTeamPlayer}
                onSell={openSellAction}
              />
            ))}
          </section>
        </main>
      )}

      {tab === "market" && (
        <main>
          <SectionHeader
            label="MERCADO INTELIGENTE"
            title="Mercado actual"
            description="Protección máxima: mercado cada 5 min, equipo cada 10 min, rivales solo al abrir su pestaña y catálogo cada 6 h. Los contadores funcionan localmente."
          >
            <div className="market-filter-controls">
  <MarketFilters
    value={marketFilter}
    onChange={setMarketFilter}
    counts={marketCounts}
  />

  <MarketPositionFilterButton
    value={marketPosition}
    counts={marketPositionCounts}
    onClick={() =>
      setPositionFilterOpen(
        true
      )
    }
  />
</div>
          </SectionHeader>

          <MarketStatusBar
            meta={data?.marketMeta}
            market={market}
            now={now}
            notificationPermission={notificationPermission}
            onEnableNotifications={enableNotifications}
            historyCount={notificationHistory.length}
            onOpenHistory={() => setNotificationHistoryOpen(true)}
          />

          <section className="market-list market-list-v2">
            {filteredMarket.length ? (
              filteredMarket.map((player) => (
                <MarketChip
                  player={player}
                  key={`${player.id}-${player.ownerId}`}
                  onDetails={setSelectedMarketPlayer}
                  onBid={openBidAction}
                  now={now}
                />
              ))
            ) : (
              <div className="empty-state">No hay jugadores que coincidan con los filtros seleccionados.</div>
            )}
          </section>
        </main>
      )}

      {tab === "xi" && (
        <BestXI bestXI={data?.bestXI} onPlayerDetails={setSelectedXIPlayer} />
      )}

      {tab === "rivals" && (
        <main>
          <SectionHeader
            label="CLASIFICACIÓN DE RIVALES"
            title="Tabla de tu liga"
            description="Comparación rápida de fuerza, plantilla y necesidades."
          />
          {rivalsLoading &&
            !(data?.rivals || []).length ? (
            <div className="rivals-loading-card">
              <div className="loader small" />

              <div>
                <strong>
                  Cargando rivales de forma segura…
                </strong>

                <p>
                  Se consulta una plantilla cada vez con una separación mínima de 4 segundos. Puede tardar un poco, pero evita ráfagas contra Biwenger.
                </p>
              </div>
            </div>
          ) : (
            <RivalLeagueTable
              rivals={data?.rivals || []}
              onDetails={setSelectedRival}
            />
          )}
        </main>
      )}

      <footer>
        <span>Operaciones reales activadas · Siempre requieren confirmación</span>
        <span>
          Última sincronización: {data?.syncedAt ? new Date(data.syncedAt).toLocaleString("es-BO") : "-"}
        </span>
      </footer>



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
