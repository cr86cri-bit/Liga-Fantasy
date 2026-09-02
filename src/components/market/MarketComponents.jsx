import { useMemo } from "react";
import { formatMoney, toMilliseconds } from "../../utils/app.js";
import { Position, Recommendation, PlayerPhoto, ClubIdentity, Status, Countdown, DetailButton, Modal, SellerBadge } from "../ui/PlayerUI.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";

function offerStatusInfo(status) {
  const normalized =
    String(
      status ||
      "waiting"
    ).toLowerCase();

  const map = {
    waiting: {
      label:
        "Puja activa",
      className:
        "active",
    },

    accepted: {
      label:
        "Aceptada",
      className:
        "success",
    },

    processed: {
      label:
        "Procesada",
      className:
        "success",
    },

    rejected: {
      label:
        "Rechazada",
      className:
        "danger",
    },

    expired: {
      label:
        "Expirada",
      className:
        "muted",
    },
  };

  return (
    map[normalized] || {
      label:
        normalized ||
        "Desconocido",
      className:
        "muted",
    }
  );
}

function MyBidCard({
  bid,
  now,
  onDetails,
}) {
  const status =
    offerStatusInfo(
      bid.offerStatus
    );

  const recommendedMaxBid =
    Number(
      bid
        ?.bidRecommendation
        ?.recommendedMaxBid ||
      bid
        ?.marketIntelligence
        ?.recommendedMaxBid ||
      0
    );

  const currentOffer =
    Number(
      bid.offerAmount ||
      0
    );

  const bidDifference =
    recommendedMaxBid -
    currentOffer;

  const hasRecommendation =
    recommendedMaxBid >
    0;

  const exceedsRecommendation =
    hasRecommendation &&
    currentOffer >
    recommendedMaxBid;

  const remainingRecommendedRoom =
    hasRecommendation
      ? Math.max(
          0,
          bidDifference
        )
      : 0;

  return (
    <article
      className={`my-market-move-card my-bid-card ${
        exceedsRecommendation
          ? "my-bid-over-recommended"
          : ""
      }`}
    >
      <div className="my-market-move-main">
        <PlayerPhoto
          player={
            bid
          }
          size="chip"
        />

        <div>
          <div className="my-market-move-name">
            <Position
              position={
                bid.position
              }
            />

            <strong>
              {bid.name}
            </strong>
          </div>

          <ClubIdentity
            player={
              bid
            }
            compact
          />
        </div>
      </div>

      <div className="my-market-move-status-row">
        <b
          className={`my-offer-status status-${status.className}`}
        >
          {status.label}
        </b>

        <span>
          {bid.offerType ===
          "clause"
            ? "Cláusula"
            : "Puja"}
        </span>
      </div>

      <div className="my-market-move-metrics my-bid-metrics">
        <div>
          <span>
            Tu oferta
          </span>

          <strong>
            {formatMoney(
              currentOffer
            )}
          </strong>
        </div>

        <div className="recommended-bid-metric">
          <span>
            Puja máxima recomendada
          </span>

          <strong>
            {hasRecommendation
              ? formatMoney(
                  recommendedMaxBid
                )
              : "Sin cálculo"}
          </strong>
        </div>

        <div>
          <span>
            Valor actual
          </span>

          <strong>
            {formatMoney(
              bid.price
            )}
          </strong>
        </div>
      </div>

      {hasRecommendation && (
        <div
          className={`bid-recommendation-status ${
            exceedsRecommendation
              ? "over"
              : "within"
          }`}
        >
          <span>
            {exceedsRecommendation
              ? "⚠"
              : "✓"}
          </span>

          <div>
            <strong>
              {exceedsRecommendation
                ? "Tu puja supera nuestra recomendación"
                : "Tu puja está dentro del límite recomendado"}
            </strong>

            <small>
              {exceedsRecommendation
                ? `Supera la recomendación en ${formatMoney(
                    Math.abs(
                      bidDifference
                    )
                  )}.`
                : remainingRecommendedRoom >
                    0
                  ? `Aún tendrías un margen recomendado de ${formatMoney(
                      remainingRecommendedRoom
                    )}.`
                  : "Estás justo en la puja máxima que recomendamos."}
            </small>
          </div>
        </div>
      )}

      <div className="my-market-move-bottom">
        <div>
          <small>
            {bid.offerToName
              ? `Enviada a ${bid.offerToName}`
              : "Enviada al Mercado Biwenger"}
          </small>

          {bid.offerUntil && (
            <Countdown
              target={
                bid.offerUntil
              }
              now={
                now
              }
            />
          )}
        </div>

        <DetailButton
          onClick={() =>
            onDetails(
              bid
            )
          }
        />
      </div>

      <p className="recommended-bid-disclaimer">
        Puja máxima recomendada por el análisis de Liga Fantasy;
        no es un límite oficial de Biwenger.
      </p>
    </article>
  );
}

function MySaleCard({
  player,
  now,
  onDetails,
}) {
  return (
    <article className="my-market-move-card my-sale-card">
      <div className="my-market-move-main">
        <PlayerPhoto
          player={
            player
          }
          size="chip"
        />

        <div>
          <div className="my-market-move-name">
            <Position
              position={
                player.position
              }
            />

            <strong>
              {player.name}
            </strong>
          </div>

          <ClubIdentity
            player={
              player
            }
            compact
          />
        </div>
      </div>

      <div className="my-market-move-status-row">
        <b className="my-offer-status status-sale">
          En venta
        </b>

        <span>
          Detectado en Biwenger
        </span>
      </div>

      <div className="my-market-move-metrics">
        <div>
          <span>
            Precio publicado
          </span>

          <strong>
            {formatMoney(
              player.salePrice
            )}
          </strong>
        </div>

        <div>
          <span>
            Valor
          </span>

          <strong>
            {formatMoney(
              player.price
            )}
          </strong>
        </div>
      </div>

      <div className="my-market-move-bottom">
        <div>
          <small>
            Tu jugador está publicado en el mercado
          </small>

          {player.until && (
            <Countdown
              target={
                player.until
              }
              now={
                now
              }
            />
          )}
        </div>

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

function MarketMovementsView({
  bids,
  sales,
  now,
  onDetails,
}) {
  const activeBids =
    (
      bids ||
      []
    ).filter(
      (bid) =>
        bid.isActiveOffer
    );

  return (
    <main>
      <SectionHeader
        label="MIS MOVIMIENTOS"
        title="Pujas y jugadores en venta"
        description="Esta vista usa la misma respuesta del Mercado de Biwenger. Por eso detecta también cambios hechos desde la web o app oficial sin añadir una petición extra."
      >
        <div className="my-market-activity-counts movements-tab-counts">
          <span>
            <b>
              {activeBids.length}
            </b>
            puja(s) activa(s)
          </span>

          <span>
            <b>
              {sales.length}
            </b>
            jugador(es) en venta
          </span>
        </div>
      </SectionHeader>

      {!activeBids.length &&
      !sales.length ? (
        <div className="my-market-empty movements-empty">
          <span>
            ✓
          </span>

          <div>
            <strong>
              No tienes movimientos activos
            </strong>

            <p>
              Las pujas que hagas y los jugadores que pongas a la venta aparecerán aquí en la siguiente sincronización del mercado.
            </p>
          </div>
        </div>
      ) : (
        <section className="movements-sections">
          <div className="movements-group">
            <div className="movements-group-head">
              <div>
                <span className="section-label">
                  PUJAS ACTIVAS
                </span>
                <h3>
                  Jugadores por los que ya pujaste
                </h3>
              </div>
              <b>
                {activeBids.length}
              </b>
            </div>

            {activeBids.length ? (
              <div className="my-market-activity-grid">
                {activeBids.map(
                  (bid) => (
                    <MyBidCard
                      key={`bid-${bid.offerId}-${bid.id}`}
                      bid={bid}
                      now={now}
                      onDetails={onDetails}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="movement-subempty">
                No tienes pujas activas.
              </div>
            )}
          </div>

          <div className="movements-group">
            <div className="movements-group-head">
              <div>
                <span className="section-label">
                  EN VENTA
                </span>
                <h3>
                  Tus jugadores publicados
                </h3>
              </div>
              <b>
                {sales.length}
              </b>
            </div>

            {sales.length ? (
              <div className="my-market-activity-grid">
                {sales.map(
                  (player) => (
                    <MySaleCard
                      key={`sale-${player.saleId}-${player.id}`}
                      player={player}
                      now={now}
                      onDetails={onDetails}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="movement-subempty">
                No tienes jugadores en venta.
              </div>
            )}
          </div>
        </section>
      )}
    </main>
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

          <ClubIdentity
            player={
              player
            }
            compact
          />

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

        {player.myBid?.isActiveOffer ? (
          <button
            type="button"
            className="chip-operation-button bid active-bid-button"
            disabled
          >
            ✓ Puja activa · {formatMoney(
              player.myBid.offerAmount
            )}
          </button>
        ) : (
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
        )}

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


export { offerStatusInfo, MyBidCard, MySaleCard, MarketMovementsView, MarketChip, MarketStatusBar, MarketFilters, MARKET_POSITIONS, MarketPositionFilterButton, MarketPositionFilterModal };
