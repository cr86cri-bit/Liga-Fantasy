import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function formatChange(value) {
  const amount = Number(value || 0);
  if (!amount) return "0 €";
  return `${amount > 0 ? "+" : ""}${formatMoney(amount)}`;
}

function formatDate(unix) {
  if (!unix) return "Sin fecha";

  return new Date(Number(unix) * 1000).toLocaleString(
    "es-BO",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
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
      ok: {
        dot: "🟢",
        label: "Disponible",
        className: "status-ok",
      },
      doubt: {
        dot: "🟡",
        label: "Duda",
        className: "status-warning",
      },
      injured: {
        dot: "🔴",
        label: "Lesionado",
        className: "status-danger",
      },
      sanctioned: {
        dot: "🔴",
        label: "Sancionado",
        className: "status-danger",
      },
      discarded: {
        dot: "🔴",
        label: "Descartado",
        className: "status-danger",
      },
    }[status] || {
      dot: "🟡",
      label: "Sin confirmar",
      className: "status-warning",
    }
  );
}

function Position({ position }) {
  return (
    <span
      className={`position position-${String(
        position
      ).toLowerCase()}`}
    >
      {position}
    </span>
  );
}

function Recommendation({ value }) {
  if (!value) return null;

  return (
    <span
      className={`recommendation recommendation-${String(
        value
      ).toLowerCase()}`}
    >
      {value}
    </span>
  );
}

function PlayerPhoto({
  player,
  size = "normal",
}) {
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
  const config = statusConfig(status);

  return (
    <span
      className={`status ${config.className} ${
        compact ? "status-compact" : ""
      }`}
    >
      <span>{config.dot}</span>
      {!compact && config.label}
    </span>
  );
}

function Fitness({ values = [] }) {
  return (
    <div className="fitness">
      {[values[0], values[1], values[2]].map(
        (value, index) => (
          <FitnessItem value={value} key={index} />
        )
      )}
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

    return (
      <span className={`fitness-item ${type}`}>
        {value}
      </span>
    );
  }

  const config =
    {
      injured: ["LES", "bad"],
      doubt: ["DUD", "warning"],
      sanctioned: ["SAN", "bad"],
      discarded: ["DES", "bad"],
    }[value] || ["-", "empty"];

  return (
    <span className={`fitness-item ${config[1]}`}>
      {config[0]}
    </span>
  );
}

function AnalysisScore({
  analysis,
  compact = false,
}) {
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
          {score}
          <small>/100</small>
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
          {match.venue === "LOCAL" ? "vs" : "@"}{" "}
          {match.opponent?.name}
        </strong>

        <small>
          {match.venue} · {formatDate(match.date)}
        </small>
      </div>

      <div className="fixture-difficulty">
        <span>
          {"★".repeat(match.difficulty?.stars || 3)}
        </span>
        <strong>{match.difficulty?.label}</strong>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  description,
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function DetailButton({
  onClick,
  label = "Ver detalles",
}) {
  return (
    <button className="detail-button" onClick={onClick}>
      {label}
      <span>›</span>
    </button>
  );
}

function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`modal-panel ${
          wide ? "modal-panel-wide" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <div>
            <span className="section-label">
              DETALLE
            </span>

            <h2>{title}</h2>

            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function PlayerDetailModal({
  player,
  onClose,
  context = "team",
}) {
  if (!player) return null;

  const intel =
    player.marketIntelligence || null;

  const status =
    statusConfig(player.status);

  const breakdown =
    player.analysis?.breakdown || {};

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
              <Recommendation
                value={player.analysis?.recommendation}
              />
            </div>

            <h3>{player.name}</h3>
            <p>{player.teamName}</p>

            <span className={`status ${status.className}`}>
              {status.dot} {status.label}
            </span>
          </div>
        </div>

        <div className="hero-score">
          <AnalysisScore
            analysis={player.analysis}
            compact
          />
        </div>
      </div>

      {player.statusInfo && (
        <div className="detail-alert">
          <strong>Estado / novedad</strong>
          <p>{player.statusInfo}</p>
        </div>
      )}

      <div className="detail-metrics-grid">
        <DetailMetric
          label="Valor actual"
          value={formatMoney(player.price)}
        />

        {context === "market" && intel ? (
          <DetailMetric
            label="Precio pedido"
            value={formatMoney(intel.listedPrice)}
          />
        ) : (
          <DetailMetric
            label="Puntos"
            value={`${player.points || 0} pts`}
          />
        )}

        <DetailMetric
          label="Cambio diario"
          value={formatChange(player.priceIncrement)}
          className={changeClass(player.priceIncrement)}
        />

        <DetailMetric
          label="Puntos / millón"
          value={`${
            player.analysis?.pointsPerMillion ??
            intel?.pointsPerMillion ??
            0
          } pts/M€`}
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
              <span className="section-label">
                MERCADO
              </span>
              <h3>Recomendación de compra</h3>
            </div>

            <span
              className={`price-tag price-${String(
                intel.priceTag || "JUSTO"
              )
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {intel.priceTag || "JUSTO"}
            </span>
          </div>

          <div className="bid-highlight">
            <div>
              <span>Puja máxima recomendada</span>
              <strong>
                {formatMoney(intel.recommendedMaxBid)}
              </strong>
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
            <span className="section-label">
              PRÓXIMA JORNADA
            </span>
            <h3>Próximo partido</h3>
          </div>
        </div>

        <Fixture match={player.nextMatch} />
      </section>

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">
              ANÁLISIS
            </span>
            <h3>Desglose de la nota</h3>
          </div>
        </div>

        <AnalysisScore analysis={player.analysis} />

        <div className="breakdown-grid">
          <Breakdown
            label="Forma"
            value={breakdown.form}
          />
          <Breakdown
            label="Puntos"
            value={breakdown.points}
          />
          <Breakdown
            label="Tendencia"
            value={breakdown.trend}
          />
          <Breakdown
            label="Valor"
            value={breakdown.value}
          />
          <Breakdown
            label="Disponibilidad"
            value={breakdown.availability}
          />
          <Breakdown
            label="Histórico"
            value={breakdown.history}
          />
          <Breakdown
            label="Próximo rival"
            value={breakdown.fixture}
          />
        </div>
      </section>

      {context === "market" &&
        intel?.competitors?.length > 0 && (
          <section className="modal-section">
            <div className="modal-section-title">
              <div>
                <span className="section-label">
                  COMPETENCIA
                </span>
                <h3>
                  Rivales que podrían pujar
                </h3>
              </div>

              <strong>
                {intel.competitionLabel} ·{" "}
                {intel.competitionScore}/100
              </strong>
            </div>

            <div className="competitor-modal-list">
              {intel.competitors.map((rival) => (
                <div
                  className="competitor-modal-row"
                  key={rival.userId}
                >
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

function DetailMetric({
  label,
  value,
  className = "",
}) {
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

function TeamChip({
  player,
  onDetails,
}) {
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

          <Recommendation
            value={player.analysis?.recommendation}
          />
        </div>

        <span className="chip-club">{player.teamName}</span>

        <div className="chip-stats">
          <span>
            <small>Valor</small>
            <strong>{formatMoney(player.price)}</strong>
          </span>

          <span>
            <small>Puntos</small>
            <strong>{player.points || 0}</strong>
          </span>

          <span>
            <small>Nota</small>
            <strong>{player.analysis?.score || 0}/100</strong>
          </span>

          <span>
            <small>Hoy</small>
            <strong className={changeClass(player.priceIncrement)}>
              {formatChange(player.priceIncrement)}
            </strong>
          </span>
        </div>

        <DetailButton onClick={() => onDetails(player)} />
      </div>
    </article>
  );
}

function MarketChip({
  player,
  onDetails,
}) {
  const intel =
    player.marketIntelligence || {};

  return (
    <article
      className={`market-chip ${
        intel.shouldBid ? "market-chip-highlight" : ""
      }`}
    >
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
              className={`price-tag price-${String(
                intel.priceTag || "JUSTO"
              )
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {intel.priceTag || "JUSTO"}
            </span>

            <Recommendation
              value={player.analysis?.recommendation}
            />
          </div>
        </div>
      </div>

      <div className="market-chip-stats">
        <div>
          <span>Precio</span>
          <strong>
            {formatMoney(intel.listedPrice)}
          </strong>
        </div>

        <div>
          <span>Valor</span>
          <strong>
            {formatMoney(intel.marketValue)}
          </strong>
        </div>

        <div>
          <span>Rendimiento</span>
          <strong>
            {intel.pointsPerMillion || 0} pts/M€
          </strong>
        </div>

        <div className="market-chip-bid">
          <span>Puja máxima</span>
          <strong>
            {formatMoney(intel.recommendedMaxBid)}
          </strong>
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
          {intel.shouldBid ? "PUJAR" : "NO PUJAR"}
        </b>

        <DetailButton onClick={() => onDetails(player)} />
      </div>
    </article>
  );
}

function BestXI({
  bestXI,
  onPlayerDetails,
}) {
  if (!bestXI?.players?.length) {
    return (
      <div className="empty-state">
        No se pudo generar un XI con la plantilla actual.
      </div>
    );
  }

  const groups = {
    DL: bestXI.players.filter(
      (player) => player.position === "DL"
    ),
    MC: bestXI.players.filter(
      (player) => player.position === "MC"
    ),
    DF: bestXI.players.filter(
      (player) => player.position === "DF"
    ),
    AR: bestXI.players.filter(
      (player) => player.position === "AR"
    ),
  };

  return (
    <main>
      <div className="xi-topbar">
        <div>
          <span className="section-label">
            MEJOR XI AUTOMÁTICO
          </span>
          <h2>
            Formación {bestXI.formation}
          </h2>
          <p>
            Proyección base:{" "}
            <strong>
              {bestXI.totalProjection} pts
            </strong>
          </p>
        </div>

        <div className="xi-specials">
          <div>
            <span>👑 Capitán</span>
            <strong>
              {bestXI.captain?.name || "-"}
            </strong>
          </div>

          <div>
            <span>🎯 Delantero especial</span>
            <strong>
              {bestXI.striker?.name || "-"}
            </strong>
          </div>
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

        <PitchLine
          className="pitch-line-forwards"
          players={groups.DL}
          bestXI={bestXI}
          onPlayerDetails={onPlayerDetails}
        />

        <PitchLine
          className="pitch-line-midfield"
          players={groups.MC}
          bestXI={bestXI}
          onPlayerDetails={onPlayerDetails}
        />

        <PitchLine
          className="pitch-line-defense"
          players={groups.DF}
          bestXI={bestXI}
          onPlayerDetails={onPlayerDetails}
        />

        <PitchLine
          className="pitch-line-goalkeeper"
          players={groups.AR}
          bestXI={bestXI}
          onPlayerDetails={onPlayerDetails}
        />
      </section>

      <p className="read-only-note">
        Esta alineación es solo una recomendación y no modifica
        Biwenger.
      </p>
    </main>
  );
}

function PitchLine({
  players,
  className,
  bestXI,
  onPlayerDetails,
}) {
  return (
    <div className={`pitch-line ${className}`}>
      {players.map((player) => {
        const isCaptain =
          Number(bestXI.captain?.id) === Number(player.id);

        const isStriker =
          Number(bestXI.striker?.id) === Number(player.id);

        return (
          <button
            className="pitch-player"
            key={player.id}
            onClick={() => onPlayerDetails(player)}
          >
            <div className="pitch-player-photo">
              <PlayerPhoto player={player} size="pitch" />

              {isCaptain && (
                <span className="pitch-role pitch-role-captain">
                  C
                </span>
              )}

              {isStriker && (
                <span className="pitch-role pitch-role-striker">
                  9
                </span>
              )}
            </div>

            <strong>{player.name}</strong>

            <span>
              {player.projectedPoints} pts
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RivalLeagueTable({
  rivals,
  onDetails,
}) {
  if (!rivals?.length) {
    return (
      <div className="empty-state">
        No hay información de rivales disponible.
      </div>
    );
  }

  return (
    <div className="league-table-wrap">
      <table className="league-table">
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Equipo</th>
            <th>Puntos</th>
            <th>Fuerza</th>
            <th>Jugadores</th>
            <th>Valor plantilla</th>
            <th>Necesidad</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {rivals.map((rival, index) => (
            <tr key={rival.id}>
              <td>
                <span className="league-position">
                  {rival.position || index + 1}
                </span>
              </td>

              <td>
                <div className="league-team">
                  <div className="league-team-icon">
                    {rival.name
                      ?.charAt(0)
                      ?.toUpperCase() || "?"}
                  </div>

                  <div>
                    <strong>{rival.name}</strong>
                    <span>
                      {rival.balanceVisible
                        ? `Saldo ${formatMoney(
                            rival.balance
                          )}`
                        : "Saldo oculto"}
                    </span>
                  </div>
                </div>
              </td>

              <td>
                <strong>{rival.points || 0}</strong>
              </td>

              <td>
                <div className="strength-cell">
                  <strong>{rival.strength}</strong>
                  <span>/100</span>
                </div>
              </td>

              <td>{rival.playerCount}</td>

              <td>
                <strong>
                  {formatMoney(rival.teamValue)}
                </strong>
              </td>

              <td>
                {rival.needs?.[0] ? (
                  <span className="need-pill">
                    {rival.needs[0].position} · faltan{" "}
                    {rival.needs[0].missing}
                  </span>
                ) : (
                  <span className="balanced-pill">
                    Equilibrado
                  </span>
                )}
              </td>

              <td>
                <button
                  className="table-detail-button"
                  onClick={() => onDetails(rival)}
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RivalDetailModal({
  rival,
  onClose,
  balanceHidden,
}) {
  if (!rival) return null;

  const sortedPlayers =
    [...(rival.players || [])].sort(
      (a, b) =>
        Number(b.analysisScore || 0) -
        Number(a.analysisScore || 0)
    );

  return (
    <Modal
      open={Boolean(rival)}
      onClose={onClose}
      title={rival.name}
      subtitle="Detalle del rival"
      wide
    >
      <div className="rival-modal-summary">
        <DetailMetric
          label="Posición"
          value={
            rival.position
              ? `#${rival.position}`
              : "-"
          }
        />

        <DetailMetric
          label="Fuerza"
          value={`${rival.strength}/100`}
        />

        <DetailMetric
          label="Jugadores"
          value={rival.playerCount}
        />

        <DetailMetric
          label="Valor plantilla"
          value={formatMoney(rival.teamValue)}
        />

        <DetailMetric
          label="Puntos"
          value={rival.points || 0}
        />

        <DetailMetric
          label="Saldo"
          value={
            rival.balanceVisible
              ? formatMoney(rival.balance)
              : balanceHidden
                ? "Oculto"
                : "No disponible"
          }
        />
      </div>

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">
              PLANTILLA
            </span>
            <h3>Distribución por posición</h3>
          </div>
        </div>

        <div className="position-summary">
          {Object.entries(
            rival.positions || {}
          ).map(([position, count]) => (
            <div key={position}>
              <Position position={position} />
              <strong>{count}</strong>
              <span>jugadores</span>
            </div>
          ))}
        </div>
      </section>

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">
              NECESIDADES
            </span>
            <h3>Posiciones que podría reforzar</h3>
          </div>
        </div>

        {rival.needs?.length ? (
          <div className="needs-list">
            {rival.needs.map((need) => (
              <div className="need-card" key={need.position}>
                <Position position={need.position} />
                <div>
                  <strong>
                    Le faltan {need.missing}
                  </strong>
                  <span>
                    Tiene {need.current} · objetivo {need.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-alert detail-alert-success">
            Plantilla equilibrada según nuestro modelo.
          </div>
        )}
      </section>

      <section className="modal-section">
        <div className="modal-section-title">
          <div>
            <span className="section-label">
              JUGADORES
            </span>
            <h3>Jugadores detectados</h3>
          </div>
        </div>

        {sortedPlayers.length ? (
          <div className="rival-player-list">
            {sortedPlayers.map((player) => (
              <div
                className="rival-player-row"
                key={player.id}
              >
                <Position position={player.position} />

                <strong>{player.name}</strong>

                <span>{formatMoney(player.price)}</span>

                <b>{player.analysisScore}/100</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="fixture-empty">
            Biwenger no devolvió la plantilla completa de este
            rival.
          </div>
        )}
      </section>
    </Modal>
  );
}

function SectionHeader({
  label,
  title,
  description,
}) {
  return (
    <div className="section-header">
      <div>
        <span className="section-label">{label}</span>
        <h2>{title}</h2>
      </div>

      <p>{description}</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("team");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [
    selectedTeamPlayer,
    setSelectedTeamPlayer,
  ] = useState(null);

  const [
    selectedMarketPlayer,
    setSelectedMarketPlayer,
  ] = useState(null);

  const [
    selectedXIPlayer,
    setSelectedXIPlayer,
  ] = useState(null);

  const [
    selectedRival,
    setSelectedRival,
  ] = useState(null);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setRefreshing(true);

        setError("");

        const response = await fetch(
          "/api/dashboard"
        );

        const body = await response.json();

        if (!response.ok || !body.ok) {
          throw new Error(
            body?.message ||
              "No se pudo cargar Biwenger."
          );
        }

        setData(body.data);
      } catch (err) {
        setError(
          err?.message ||
            "Error desconocido."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData();

    const interval = window.setInterval(
      () =>
        loadData({
          silent: true,
        }),
      60_000
    );

    return () =>
      window.clearInterval(interval);
  }, [loadData]);

  const market = useMemo(
    () =>
      (data?.market || []).filter(
        (player) => !player.isMine
      ),
    [data]
  );

  const xiPlayerFull = useMemo(() => {
    if (!selectedXIPlayer) return null;

    return (
      data?.squad?.find(
        (player) =>
          Number(player.id) ===
          Number(selectedXIPlayer.id)
      ) || selectedXIPlayer
    );
  }, [selectedXIPlayer, data]);

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
          onClick={() => loadData()}
        >
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <span className="brand">
            ⚽ LIGA FANTASY
          </span>

          <h1>
            {data?.league?.name || "Mi Liga"}
          </h1>

          <p>
            {data?.user?.name}
            {data?.user?.position
              ? ` · #${data.user.position}`
              : ""}
          </p>
        </div>

        <button
          className="refresh-button"
          disabled={refreshing}
          onClick={() => loadData()}
        >
          {refreshing
            ? "Actualizando..."
            : "Actualizar datos"}
        </button>
      </header>

      {error && (
        <div className="warning">
          {error}
        </div>
      )}

      <section className="metrics">
        <Metric
          label="Jugadores"
          value={data?.squad?.length || 0}
          description="Plantilla"
        />

        <Metric
          label="Valor equipo"
          value={formatMoney(
            data?.finances?.teamValue
          )}
          description="Valor actual"
        />

        <Metric
          label="Saldo"
          value={formatMoney(
            data?.finances?.balance
          )}
          description="Disponible"
        />

        <Metric
          label="Puja máxima"
          value={formatMoney(
            data?.finances?.maximumBid
          )}
          description="Límite Biwenger"
        />

        <Metric
          label="Patrimonio"
          value={formatMoney(
            data?.finances?.totalAssets
          )}
          description="Saldo + equipo"
        />
      </section>

      <nav className="tabs">
        <button
          className={tab === "team" ? "active" : ""}
          onClick={() => setTab("team")}
        >
          Mi equipo
          <span>{data?.squad?.length || 0}</span>
        </button>

        <button
          className={
            tab === "market" ? "active" : ""
          }
          onClick={() => setTab("market")}
        >
          Mercado
          <span>{market.length}</span>
        </button>

        <button
          className={tab === "xi" ? "active" : ""}
          onClick={() => setTab("xi")}
        >
          Mejor XI
        </button>

        <button
          className={
            tab === "rivals" ? "active" : ""
          }
          onClick={() => setTab("rivals")}
        >
          Rivales
          <span>{data?.rivals?.length || 0}</span>
        </button>
      </nav>

      {tab === "team" && (
        <main>
          <SectionHeader
            label="MI EQUIPO"
            title="Plantilla"
            description="Vista compacta. Abre un jugador para ver partido, forma y análisis."
          />

          <section className="team-chip-grid">
            {(data?.squad || []).map(
              (player) => (
                <TeamChip
                  player={player}
                  key={player.id}
                  onDetails={
                    setSelectedTeamPlayer
                  }
                />
              )
            )}
          </section>
        </main>
      )}

      {tab === "market" && (
        <main>
          <SectionHeader
            label="MERCADO INTELIGENTE"
            title="Mercado actual"
            description="Precio, rendimiento y puja recomendada sin saturar la pantalla."
          />

          <section className="market-list">
            {market.map((player) => (
              <MarketChip
                player={player}
                key={`${player.id}-${player.ownerId}`}
                onDetails={
                  setSelectedMarketPlayer
                }
              />
            ))}
          </section>
        </main>
      )}

      {tab === "xi" && (
        <BestXI
          bestXI={data?.bestXI}
          onPlayerDetails={
            setSelectedXIPlayer
          }
        />
      )}

      {tab === "rivals" && (
        <main>
          <SectionHeader
            label="CLASIFICACIÓN DE RIVALES"
            title="Tabla de tu liga"
            description="Comparación rápida de fuerza, plantilla y necesidades."
          />

          <RivalLeagueTable
            rivals={data?.rivals || []}
            onDetails={setSelectedRival}
          />
        </main>
      )}

      <footer>
        <span>
          Modo solo lectura · No realiza operaciones en
          Biwenger
        </span>

        <span>
          Última sincronización:{" "}
          {data?.syncedAt
            ? new Date(
                data.syncedAt
              ).toLocaleString("es-BO")
            : "-"}
        </span>
      </footer>

      <PlayerDetailModal
        player={selectedTeamPlayer}
        context="team"
        onClose={() =>
          setSelectedTeamPlayer(null)
        }
      />

      <PlayerDetailModal
        player={selectedMarketPlayer}
        context="market"
        onClose={() =>
          setSelectedMarketPlayer(null)
        }
      />

      <PlayerDetailModal
        player={xiPlayerFull}
        context="team"
        onClose={() =>
          setSelectedXIPlayer(null)
        }
      />

      <RivalDetailModal
        rival={selectedRival}
        balanceHidden={
          data?.league?.settings
            ?.balanceHidden
        }
        onClose={() =>
          setSelectedRival(null)
        }
      />
    </div>
  );
}
