import { formatMoney, formatChange, changeClass, statusConfig } from "../../utils/app.js";
import { Position, Recommendation, PlayerPhoto, Fitness, AnalysisScore, Countdown, Fixture, Modal, DetailMetric, Breakdown, SellerBadge } from "../ui/PlayerUI.jsx";
import { SportsSourcesButton } from "../sports/SportsSourcesButton.jsx";

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
        {context === "team" && onSell && !player.isForSale && (
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

        {context === "team" && player.isForSale && (
          <span className="detail-for-sale-state">
            🏷 Este jugador ya está en venta
          </span>
        )}

        {context === "market" &&
          onBid &&
          !player.isMine &&
          !player.myBid?.isActiveOffer && (
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

        {context === "market" &&
          player.myBid?.isActiveOffer && (
          <div className="active-bid-modal-badge">
            ✓ Ya tienes una puja activa de{" "}
            <strong>
              {formatMoney(
                player.myBid.offerAmount
              )}
            </strong>
          </div>
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


export { PlayerDetailModal };
