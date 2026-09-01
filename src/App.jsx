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

function PlayerPhoto({ player, small = false }) {
  const [failed, setFailed] = useState(false);

  if (failed || !player?.photoUrl) {
    return (
      <div
        className={`player-photo fallback ${
          small ? "small" : ""
        }`}
      >
        {player?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      className={`player-photo ${small ? "small" : ""}`}
      src={player.photoUrl}
      alt={player.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Status({ status }) {
  const config =
    {
      ok: ["🟢", "Disponible", "status-ok"],
      doubt: ["🟡", "Duda", "status-warning"],
      injured: ["🔴", "Lesionado", "status-danger"],
      sanctioned: ["🔴", "Sancionado", "status-danger"],
      discarded: ["🔴", "Descartado", "status-danger"],
      unknown: ["🟡", "Sin confirmar", "status-warning"],
    }[status] || ["🟡", "Sin confirmar", "status-warning"];

  return (
    <span className={`status ${config[2]}`}>
      {config[0]} {config[1]}
    </span>
  );
}

function Fitness({ values = [] }) {
  return (
    <div className="fitness">
      {[values[0], values[1], values[2]].map(
        (value, index) => {
          if (typeof value === "number") {
            const type =
              value >= 10
                ? "great"
                : value >= 6
                  ? "good"
                  : "normal";

            return (
              <span
                className={`fitness-item ${type}`}
                key={index}
              >
                {value}
              </span>
            );
          }

          const label =
            value === "injured"
              ? "LES"
              : value === "doubt"
                ? "DUD"
                : value === "sanctioned"
                  ? "SAN"
                  : "-";

          return (
            <span
              className="fitness-item empty"
              key={index}
            >
              {label}
            </span>
          );
        }
      )}
    </div>
  );
}

function AnalysisScore({ analysis }) {
  const score = Number(analysis?.score || 0);

  const level =
    score >= 70
      ? "great"
      : score >= 55
        ? "good"
        : score >= 35
          ? "medium"
          : "bad";

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
      <div className="fixture muted">
        Sin próximo partido
      </div>
    );
  }

  return (
    <div className="fixture">
      <div>
        <span>{match.roundName}</span>
        <strong>
          {match.venue === "LOCAL" ? "vs" : "@"}{" "}
          {match.opponent?.name}
        </strong>
        <small>
          {match.venue} · {formatDate(match.date)}
        </small>
      </div>

      <b>
        {"★".repeat(match.difficulty?.stars || 3)}{" "}
        {match.difficulty?.label}
      </b>
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

function TeamCard({ player }) {
  return (
    <article className="card">
      <div className="card-head">
        <div className="player-profile">
          <PlayerPhoto player={player} />

          <div>
            <div className="player-title">
              <Position position={player.position} />
              <h3>{player.name}</h3>
            </div>
            <span className="club">{player.teamName}</span>
          </div>
        </div>

        <Recommendation
          value={player.analysis?.recommendation}
        />
      </div>

      <div className="status-row">
        <Status status={player.status} />

        <span className={changeClass(player.priceIncrement)}>
          {formatChange(player.priceIncrement)} / día
        </span>
      </div>

      {player.statusInfo && (
        <div className="status-info">
          {player.statusInfo}
        </div>
      )}

      <div className="stats">
        <div>
          <span>Valor</span>
          <strong>{formatMoney(player.price)}</strong>
        </div>

        <div>
          <span>Puntos</span>
          <strong>{player.points}</strong>
        </div>

        <div>
          <span>Últimas 3</span>
          <Fitness values={player.fitness} />
        </div>
      </div>

      <Fixture match={player.nextMatch} />
      <AnalysisScore analysis={player.analysis} />
    </article>
  );
}

function MarketCard({ player }) {
  const intel = player.marketIntelligence || {};

  return (
    <article className="card market-card">
      <div className="card-head">
        <div className="player-profile">
          <PlayerPhoto player={player} />

          <div>
            <div className="player-title">
              <Position position={player.position} />
              <h3>{player.name}</h3>
            </div>

            <span className="club">
              {player.teamName} · {player.ownerName}
            </span>
          </div>
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

      <div className="stats market-stats">
        <div>
          <span>Precio pedido</span>
          <strong>{formatMoney(intel.listedPrice)}</strong>
          <small>
            {intel.priceDifferencePercent > 0 ? "+" : ""}
            {intel.priceDifferencePercent}% vs valor
          </small>
        </div>

        <div>
          <span>Valor Biwenger</span>
          <strong>{formatMoney(intel.marketValue)}</strong>
          <small className={changeClass(player.priceIncrement)}>
            {formatChange(player.priceIncrement)} / día
          </small>
        </div>

        <div>
          <span>Rendimiento</span>
          <strong>{intel.pointsPerMillion} pts/M€</strong>
          <small>{player.points} pts totales</small>
        </div>
      </div>

      <Fixture match={player.nextMatch} />

      <div className="bid-box">
        <div>
          <span>Puja máxima recomendada</span>
          <strong>
            {formatMoney(intel.recommendedMaxBid)}
          </strong>
        </div>

        <b className={intel.shouldBid ? "bid-yes" : "bid-no"}>
          {intel.shouldBid ? "PUJAR" : "NO PUJAR"}
        </b>
      </div>

      <div className="competition">
        <div className="competition-title">
          <span>Competencia estimada</span>
          <strong>
            {intel.competitionLabel || "BAJA"} ·{" "}
            {intel.competitionScore || 0}/100
          </strong>
        </div>

        {(intel.competitors || []).length ? (
          (intel.competitors || []).map((rival) => (
            <div className="competitor" key={rival.userId}>
              <span>{rival.name}</span>
              <small>{rival.reason}</small>
              <b>{rival.threatScore}</b>
            </div>
          ))
        ) : (
          <small className="muted">
            Sin rival claro detectado.
          </small>
        )}
      </div>

      <AnalysisScore analysis={player.analysis} />
    </article>
  );
}

function BestXI({ bestXI }) {
  if (!bestXI?.players?.length) {
    return (
      <div className="empty-state">
        No se pudo generar un XI.
      </div>
    );
  }

  return (
    <section className="best-xi">
      <aside className="xi-summary">
        <span className="section-label">
          ALINEACIÓN ÓPTIMA
        </span>

        <h2>{bestXI.formation}</h2>

        <div className="xi-pick">
          <span>Proyección base</span>
          <strong>{bestXI.totalProjection} pts</strong>
        </div>

        <div className="xi-pick">
          <span>👑 Capitán</span>
          <strong>{bestXI.captain?.name || "-"}</strong>
        </div>

        <div className="xi-pick">
          <span>🎯 Delantero especial</span>
          <strong>{bestXI.striker?.name || "-"}</strong>
        </div>

        <p className="muted">
          Solo es una recomendación. No cambia tu
          alineación real.
        </p>
      </aside>

      <div className="pitch">
        {["DL", "MC", "DF", "AR"].map((position) => (
          <div className="xi-line" key={position}>
            {bestXI.players
              .filter(
                (player) => player.position === position
              )
              .map((player) => {
                const captain =
                  Number(bestXI.captain?.id) ===
                  Number(player.id);

                const striker =
                  Number(bestXI.striker?.id) ===
                  Number(player.id);

                return (
                  <div className="xi-player" key={player.id}>
                    <div className="xi-photo">
                      <PlayerPhoto player={player} small />
                      {captain && (
                        <b className="role captain">C</b>
                      )}
                      {striker && (
                        <b className="role striker">9</b>
                      )}
                    </div>

                    <strong>{player.name}</strong>
                    <span>
                      {player.projectedPoints} pts
                    </span>
                    <small>
                      {player.nextMatch
                        ? `${
                            player.nextMatch.venue === "LOCAL"
                              ? "vs"
                              : "@"
                          } ${player.nextMatch.opponent?.name}`
                        : "Sin partido"}
                    </small>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </section>
  );
}

function RivalCard({ rival, balanceHidden }) {
  return (
    <article className="card rival-card">
      <div className="rival-head">
        <div>
          <span className="section-label">
            {rival.position ? `#${rival.position}` : "RIVAL"}
          </span>
          <h3>{rival.name}</h3>
        </div>

        <div className="strength">
          {rival.strength}
          <small>/100</small>
        </div>
      </div>

      <div className="stats rival-stats">
        <div>
          <span>Jugadores</span>
          <strong>{rival.playerCount}</strong>
        </div>

        <div>
          <span>Valor plantilla</span>
          <strong>{formatMoney(rival.teamValue)}</strong>
        </div>

        <div>
          <span>Saldo</span>
          <strong>
            {rival.balanceVisible
              ? formatMoney(rival.balance)
              : balanceHidden
                ? "Oculto"
                : "No disponible"}
          </strong>
        </div>
      </div>

      <div className="position-counts">
        {Object.entries(rival.positions || {}).map(
          ([position, count]) => (
            <span key={position}>
              <b>{position}</b> {count}
            </span>
          )
        )}
      </div>

      <div className="needs">
        <span>Necesidades estimadas</span>

        {(rival.needs || []).length ? (
          <div>
            {(rival.needs || []).slice(0, 3).map((need) => (
              <b key={need.position}>
                {need.position}: faltan {need.missing}
              </b>
            ))}
          </div>
        ) : (
          <small className="muted">
            Plantilla equilibrada o sin datos suficientes.
          </small>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("team");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setRefreshing(true);
        setError("");

        const response = await fetch("/api/dashboard");
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
      () => loadData({ silent: true }),
      60_000
    );

    return () => window.clearInterval(interval);
  }, [loadData]);

  const market = useMemo(
    () =>
      (data?.market || []).filter(
        (player) => !player.isMine
      ),
    [data]
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
        <h1>No se pudo conectar</h1>
        <p className="error-text">{error}</p>
        <button onClick={() => loadData()}>
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <span className="brand">⚽ LIGA FANTASY</span>
          <h1>{data?.league?.name || "Mi Liga"}</h1>
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
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      {error && <div className="warning">{error}</div>}

      <section className="metrics">
        <Metric
          label="Jugadores"
          value={data?.squad?.length || 0}
          description="Plantilla"
        />

        <Metric
          label="Valor equipo"
          value={formatMoney(data?.finances?.teamValue)}
          description="Valor actual"
        />

        <Metric
          label="Saldo"
          value={formatMoney(data?.finances?.balance)}
          description="Disponible"
        />

        <Metric
          label="Puja máxima"
          value={formatMoney(data?.finances?.maximumBid)}
          description="Límite Biwenger"
        />

        <Metric
          label="Patrimonio"
          value={formatMoney(data?.finances?.totalAssets)}
          description="Saldo + equipo"
        />
      </section>

      <nav className="tabs">
        <button
          className={tab === "team" ? "active" : ""}
          onClick={() => setTab("team")}
        >
          Mi equipo <span>{data?.squad?.length || 0}</span>
        </button>

        <button
          className={tab === "market" ? "active" : ""}
          onClick={() => setTab("market")}
        >
          Mercado <span>{market.length}</span>
        </button>

        <button
          className={tab === "xi" ? "active" : ""}
          onClick={() => setTab("xi")}
        >
          Mejor XI
        </button>

        <button
          className={tab === "rivals" ? "active" : ""}
          onClick={() => setTab("rivals")}
        >
          Rivales <span>{data?.rivals?.length || 0}</span>
        </button>
      </nav>

      {tab === "team" && (
        <main>
          <SectionHeader
            label="PLANTILLA"
            title="Mi equipo + próximos partidos"
            description="Estado, rival, dificultad y análisis"
          />

          <section className="grid grid-team">
            {(data?.squad || []).map((player) => (
              <TeamCard
                player={player}
                key={player.id}
              />
            ))}
          </section>
        </main>
      )}

      {tab === "market" && (
        <main>
          <SectionHeader
            label="MERCADO INTELIGENTE"
            title="Valor, rendimiento y puja máxima"
            description="Recomendaciones; no realiza pujas"
          />

          <section className="grid grid-market">
            {market.map((player) => (
              <MarketCard
                player={player}
                key={`${player.id}-${player.ownerId}`}
              />
            ))}
          </section>
        </main>
      )}

      {tab === "xi" && (
        <BestXI bestXI={data?.bestXI} />
      )}

      {tab === "rivals" && (
        <main>
          <SectionHeader
            label="RIVALES"
            title="Quién puede competir por tus fichajes"
            description={
              data?.league?.settings?.balanceHidden
                ? "El saldo rival está oculto"
                : "Saldo visible cuando Biwenger lo expone"
            }
          />

          <section className="grid grid-rivals">
            {(data?.rivals || []).map((rival) => (
              <RivalCard
                rival={rival}
                balanceHidden={
                  data?.league?.settings?.balanceHidden
                }
                key={rival.id}
              />
            ))}
          </section>
        </main>
      )}

      <footer>
        Última sincronización:{" "}
        {data?.syncedAt
          ? new Date(data.syncedAt).toLocaleString("es-BO")
          : "-"}
      </footer>
    </div>
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
