import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const money =
  new Intl.NumberFormat(
    "es-ES",
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  );

function formatMoney(
  value
) {
  return money.format(
    Number(
      value || 0
    )
  );
}

function formatChange(
  value
) {
  const amount =
    Number(
      value || 0
    );

  if (
    amount === 0
  ) {
    return "0 €";
  }

  return `${
    amount > 0
      ? "+"
      : ""
  }${formatMoney(
    amount
  )}`;
}

function formatDate(
  unix
) {
  if (!unix) {
    return "Sin fecha";
  }

  return new Date(
    Number(unix) *
      1000
  ).toLocaleString(
    "es-BO",
    {
      day: "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}

function changeClass(
  value
) {
  const n =
    Number(
      value || 0
    );

  if (
    n > 0
  ) {
    return "positive";
  }

  if (
    n < 0
  ) {
    return "negative";
  }

  return "neutral";
}

/*
|--------------------------------------------------------------------------
| POSICIÓN
|--------------------------------------------------------------------------
*/

function Position({
  position,
}) {
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

/*
|--------------------------------------------------------------------------
| RECOMENDACIÓN
|--------------------------------------------------------------------------
*/

function Recommendation({
  value,
}) {
  if (!value) {
    return null;
  }

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

/*
|--------------------------------------------------------------------------
| FOTO
|--------------------------------------------------------------------------
*/

function PlayerPhoto({
  player,
  small = false,
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(false);

  if (failed) {
    return (
      <div
        className={`player-photo player-photo-fallback ${
          small
            ? "small"
            : ""
        }`}
      >
        {player?.name
          ?.charAt(0)
          ?.toUpperCase() ||
          "?"}
      </div>
    );
  }

  return (
    <img
      className={`player-photo ${
        small
          ? "small"
          : ""
      }`}
      src={
        player?.photoUrl
      }
      alt={
        player?.name ||
        "Jugador"
      }
      loading="lazy"
      onError={() =>
        setFailed(true)
      }
    />
  );
}

/*
|--------------------------------------------------------------------------
| ESTADO
|--------------------------------------------------------------------------
*/

function Status({
  status,
}) {
  const config =
    {
      ok: [
        "🟢",
        "Disponible",
        "status-ok",
      ],

      doubt: [
        "🟡",
        "Duda",
        "status-warning",
      ],

      injured: [
        "🔴",
        "Lesionado",
        "status-danger",
      ],

      sanctioned: [
        "🔴",
        "Sancionado",
        "status-danger",
      ],

      discarded: [
        "🔴",
        "Descartado",
        "status-danger",
      ],

      unknown: [
        "🟡",
        "Sin confirmar",
        "status-warning",
      ],
    }[
      status
    ] || [
      "🟡",
      "Sin confirmar",
      "status-warning",
    ];

  return (
    <span
      className={`status ${config[2]}`}
    >
      {config[0]}{" "}
      {config[1]}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| ÚLTIMAS 3
|--------------------------------------------------------------------------
*/

function Fitness({
  values = [],
}) {
  return (
    <div className="fitness">
      {[
        values[0],
        values[1],
        values[2],
      ].map(
        (
          value,
          index
        ) => (
          <FitnessItem
            key={
              index
            }
            value={
              value
            }
          />
        )
      )}
    </div>
  );
}

function FitnessItem({
  value,
}) {
  if (
    typeof value ===
    "number"
  ) {
    const type =
      value >= 10
        ? "great"
        : value >= 6
          ? "good"
          : value < 0
            ? "bad"
            : "normal";

    return (
      <span
        className={`fitness-item ${type}`}
      >
        {value}
      </span>
    );
  }

  const config =
    {
      injured: [
        "LES",
        "bad",
      ],

      doubt: [
        "DUD",
        "warning",
      ],

      sanctioned: [
        "SAN",
        "bad",
      ],

      discarded: [
        "DES",
        "bad",
      ],
    }[
      value
    ] || [
      "-",
      "empty",
    ];

  return (
    <span
      className={`fitness-item ${config[1]}`}
    >
      {config[0]}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| NOTA
|--------------------------------------------------------------------------
*/

function AnalysisScore({
  analysis,
}) {
  const score =
    Number(
      analysis?.score ||
        0
    );

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
        <span>
          Nota Fantasy
        </span>

        <strong>
          {score}

          <small>
            /100
          </small>
        </strong>
      </div>

      <div className="score-track">
        <div
          className={`score-bar ${level}`}
          style={{
            width:
              `${score}%`,
          }}
        />
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PRÓXIMO PARTIDO
|--------------------------------------------------------------------------
*/

function Fixture({
  match,
  compact = false,
}) {
  if (!match) {
    return (
      <div className="fixture empty-fixture">
        Sin próximo partido
      </div>
    );
  }

  const difficultyClass =
    String(
      match
        ?.difficulty
        ?.label ||
        ""
    )
      .toLowerCase()
      .replaceAll(
        " ",
        "-"
      );

  return (
    <div
      className={`fixture ${
        compact
          ? "compact"
          : ""
      }`}
    >
      <div>
        <span className="fixture-round">
          {
            match.roundName
          }
        </span>

        <strong>
          {match.venue ===
          "LOCAL"
            ? "vs"
            : "@"}{" "}
          {
            match
              .opponent
              ?.name
          }
        </strong>

        <small>
          {match.venue}
          {" · "}
          {formatDate(
            match.date
          )}
        </small>
      </div>

      <span
        className={`difficulty difficulty-${difficultyClass}`}
      >
        {"★".repeat(
          match
            ?.difficulty
            ?.stars ||
            3
        )}{" "}
        {
          match
            ?.difficulty
            ?.label
        }
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MÉTRICAS
|--------------------------------------------------------------------------
*/

function Metric({
  label,
  value,
  description,
}) {
  return (
    <article className="metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {description}
      </small>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| MI EQUIPO
|--------------------------------------------------------------------------
*/

function TeamPlayerCard({
  player,
}) {
  return (
    <article className="player-card">
      <div className="player-card-header">
        <div className="player-profile">
          <PlayerPhoto
            player={
              player
            }
          />

          <div className="player-profile-data">
            <div className="player-title">
              <Position
                position={
                  player.position
                }
              />

              <h3>
                {
                  player.name
                }
              </h3>
            </div>

            <span className="club-name">
              {
                player.teamName
              }
            </span>
          </div>
        </div>

        <Recommendation
          value={
            player
              .analysis
              ?.recommendation
          }
        />
      </div>

      <div className="player-status-row">
        <Status
          status={
            player.status
          }
        />

        <span
          className={changeClass(
            player.priceIncrement
          )}
        >
          {formatChange(
            player.priceIncrement
          )}{" "}
          / día
        </span>
      </div>

      {player.statusInfo && (
        <div className="status-info">
          {
            player.statusInfo
          }
        </div>
      )}

      <div className="player-stats">
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

        <div>
          <span>
            Puntos
          </span>

          <strong>
            {
              player.points
            }
          </strong>
        </div>

        <div>
          <span>
            Últimas 3
          </span>

          <Fitness
            values={
              player.fitness
            }
          />
        </div>
      </div>

      <Fixture
        match={
          player.nextMatch
        }
        compact
      />

      <AnalysisScore
        analysis={
          player.analysis
        }
      />
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| PRECIO MERCADO
|--------------------------------------------------------------------------
*/

function PriceTag({
  value,
}) {
  return (
    <span
      className={`price-tag price-${String(
        value
      )
        .toLowerCase()
        .replaceAll(
          " ",
          "-"
        )}`}
    >
      {value}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| MERCADO INTELIGENTE
|--------------------------------------------------------------------------
*/

function MarketCard({
  player,
}) {
  const intel =
    player
      .marketIntelligence ||
    {};

  return (
    <article
      className={`market-card ${
        intel.shouldBid
          ? "market-card-highlight"
          : ""
      }`}
    >
      <div className="player-card-header">
        <div className="player-profile">
          <PlayerPhoto
            player={
              player
            }
          />

          <div className="player-profile-data">
            <div className="player-title">
              <Position
                position={
                  player.position
                }
              />

              <h3>
                {
                  player.name
                }
              </h3>
            </div>

            <span className="club-name">
              {
                player.teamName
              }
              {" · "}
              {
                player.ownerName
              }
            </span>
          </div>
        </div>

        <PriceTag
          value={
            intel.priceTag ||
            "JUSTO"
          }
        />
      </div>

      <div className="market-money-grid">
        <div>
          <span>
            Precio pedido
          </span>

          <strong>
            {formatMoney(
              intel.listedPrice
            )}
          </strong>

          <small
            className={
              intel.priceDifference <=
              0
                ? "positive"
                : "negative"
            }
          >
            {intel.priceDifferencePercent >
            0
              ? "+"
              : ""}
            {
              intel.priceDifferencePercent
            }
            % vs valor
          </small>
        </div>

        <div>
          <span>
            Valor Biwenger
          </span>

          <strong>
            {formatMoney(
              intel.marketValue
            )}
          </strong>

          <small
            className={changeClass(
              player.priceIncrement
            )}
          >
            {formatChange(
              player.priceIncrement
            )}{" "}
            / día
          </small>
        </div>

        <div>
          <span>
            Rendimiento
          </span>

          <strong>
            {
              intel.pointsPerMillion
            }{" "}
            pts/M€
          </strong>

          <small>
            {
              player.points
            }{" "}
            pts totales
          </small>
        </div>
      </div>

      <Fixture
        match={
          player.nextMatch
        }
        compact
      />

      <div className="bid-box">
        <div>
          <span>
            Puja máxima recomendada
          </span>

          <strong>
            {formatMoney(
              intel.recommendedMaxBid
            )}
          </strong>
        </div>

        <span
          className={`bid-decision ${
            intel.shouldBid
              ? "yes"
              : "no"
          }`}
        >
          {intel.shouldBid
            ? "PUJAR"
            : "NO PUJAR"}
        </span>
      </div>

      <div className="competition-box">
        <div className="competition-title">
          <span>
            Competencia estimada
          </span>

          <strong>
            {
              intel.competitionLabel
            }
            {" · "}
            {
              intel.competitionScore
            }
            /100
          </strong>
        </div>

        {intel.competitors
          ?.length ? (
          <div className="competitor-list">
            {intel.competitors.map(
              (rival) => (
                <div
                  key={
                    rival.userId
                  }
                  className="competitor-row"
                >
                  <span>
                    {
                      rival.name
                    }
                  </span>

                  <small>
                    {
                      rival.reason
                    }
                  </small>

                  <b>
                    {
                      rival.threatScore
                    }
                  </b>
                </div>
              )
            )}
          </div>
        ) : (
          <small className="muted">
            Sin rival claro
            detectado.
          </small>
        )}
      </div>

      <AnalysisScore
        analysis={
          player.analysis
        }
      />
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| XI PLAYER
|--------------------------------------------------------------------------
*/

function XIPlayer({
  player,
  captainId,
  strikerId,
}) {
  const isCaptain =
    Number(
      player.id
    ) ===
    Number(
      captainId
    );

  const isStriker =
    Number(
      player.id
    ) ===
    Number(
      strikerId
    );

  return (
    <div className="xi-player">
      <div className="xi-photo-wrap">
        <PlayerPhoto
          player={
            player
          }
          small
        />

        {isCaptain && (
          <span className="role-badge captain">
            C
          </span>
        )}

        {isStriker && (
          <span className="role-badge striker">
            9
          </span>
        )}
      </div>

      <strong>
        {player.name}
      </strong>

      <span>
        {
          player.projectedPoints
        }{" "}
        pts
      </span>

      <small>
        {player.nextMatch
          ? `${
              player
                .nextMatch
                .venue ===
              "LOCAL"
                ? "vs"
                : "@"
            } ${
              player
                .nextMatch
                .opponent
                ?.name
            }`
          : "Sin partido"}
      </small>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MEJOR XI
|--------------------------------------------------------------------------
*/

function BestXI({
  bestXI,
}) {
  if (
    !bestXI?.players
      ?.length
  ) {
    return (
      <div className="empty">
        No se pudo generar
        un XI.
      </div>
    );
  }

  const groups = {
    AR:
      bestXI.players.filter(
        (p) =>
          p.position ===
          "AR"
      ),

    DF:
      bestXI.players.filter(
        (p) =>
          p.position ===
          "DF"
      ),

    MC:
      bestXI.players.filter(
        (p) =>
          p.position ===
          "MC"
      ),

    DL:
      bestXI.players.filter(
        (p) =>
          p.position ===
          "DL"
      ),
  };

  return (
    <div className="xi-layout">
      <aside className="xi-summary">
        <span className="section-label">
          ALINEACIÓN ÓPTIMA
        </span>

        <h2>
          {
            bestXI.formation
          }
        </h2>

        <div className="xi-total">
          <span>
            Proyección base
          </span>

          <strong>
            {
              bestXI.totalProjection
            }{" "}
            pts
          </strong>
        </div>

        <div className="role-pick">
          <span>
            👑 Capitán
          </span>

          <strong>
            {bestXI
              .captain
              ?.name ||
              "-"}
          </strong>

          <small>
            {bestXI
              .captain
              ?.projectedPoints ||
              0}{" "}
            pts proyectados
          </small>
        </div>

        <div className="role-pick">
          <span>
            🎯 Delantero
            especial
          </span>

          <strong>
            {bestXI
              .striker
              ?.name ||
              "-"}
          </strong>

          <small>
            {bestXI
              .striker
              ?.projectedPoints ||
              0}{" "}
            pts proyectados
          </small>
        </div>

        <p className="muted">
          Es una recomendación.
          No modifica la
          alineación real.
        </p>
      </aside>

      <div className="pitch">
        <div className="pitch-circle" />

        <div className="pitch-box top" />

        <div className="pitch-box bottom" />

        {[
          [
            "DL",
            groups.DL,
          ],

          [
            "MC",
            groups.MC,
          ],

          [
            "DF",
            groups.DF,
          ],

          [
            "AR",
            groups.AR,
          ],
        ].map(
          ([
            pos,
            players,
          ]) => (
            <div
              key={pos}
              className={`xi-line xi-line-${pos.toLowerCase()}`}
            >
              {players.map(
                (player) => (
                  <XIPlayer
                    key={
                      player.id
                    }
                    player={
                      player
                    }
                    captainId={
                      bestXI
                        .captain
                        ?.id
                    }
                    strikerId={
                      bestXI
                        .striker
                        ?.id
                    }
                  />
                )
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| RIVALES
|--------------------------------------------------------------------------
*/

function RivalCard({
  rival,
  balanceHidden,
}) {
  const needs =
    rival.needs
      ?.slice(0, 3) ||
    [];

  return (
    <article className="rival-card">
      <div className="rival-header">
        <div>
          <span className="rival-position">
            {rival.position
              ? `#${rival.position}`
              : "-"}
          </span>

          <h3>
            {rival.name}
          </h3>
        </div>

        <div className="rival-strength">
          <strong>
            {
              rival.strength
            }
          </strong>

          <span>
            /100
          </span>
        </div>
      </div>

      <div className="rival-metrics">
        <div>
          <span>
            Jugadores
          </span>

          <strong>
            {
              rival.playerCount
            }
          </strong>
        </div>

        <div>
          <span>
            Valor plantilla
          </span>

          <strong>
            {formatMoney(
              rival.teamValue
            )}
          </strong>
        </div>

        <div>
          <span>
            Saldo
          </span>

          <strong>
            {rival.balanceVisible
              ? formatMoney(
                  rival.balance
                )
              : balanceHidden
                ? "Oculto"
                : "No disponible"}
          </strong>
        </div>
      </div>

      <div className="position-counts">
        {Object.entries(
          rival.positions ||
            {}
        ).map(
          ([
            pos,
            count,
          ]) => (
            <span
              key={
                pos
              }
            >
              <b>
                {pos}
              </b>
              {" "}
              {count}
            </span>
          )
        )}
      </div>

      <div className="rival-needs">
        <span>
          Necesidades estimadas
        </span>

        {needs.length ? (
          <div>
            {needs.map(
              (need) => (
                <b
                  key={
                    need.position
                  }
                >
                  {
                    need.position
                  }
                  : faltan{" "}
                  {
                    need.missing
                  }
                </b>
              )
            )}
          </div>
        ) : (
          <small className="muted">
            Plantilla
            equilibrada.
          </small>
        )}
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

export default function App() {
  const [
    data,
    setData,
  ] =
    useState(null);

  const [
    tab,
    setTab,
  ] =
    useState("team");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const loadData =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setRefreshing(
              true
            );
          }

          setError("");

          const response =
            await fetch(
              "/api/dashboard"
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

          setData(
            body.data
          );
        } catch (e) {
          setError(
            e?.message ||
              "Error desconocido."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadData();

    const interval =
      window.setInterval(
        () =>
          loadData({
            silent:
              true,
          }),

        60_000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    loadData,
  ]);

  const market =
    useMemo(
      () =>
        (
          data?.market ||
          []
        ).filter(
          (player) =>
            !player.isMine
        ),

      [data]
    );

  if (loading) {
    return (
      <main className="center">
        <div className="loader" />

        <h2>
          Analizando tu liga...
        </h2>
      </main>
    );
  }

  if (
    error &&
    !data
  ) {
    return (
      <main className="center">
        <div className="error-icon">
          !
        </div>

        <h1>
          No se pudo conectar
        </h1>

        <p className="error-text">
          {error}
        </p>

        <button
          className="primary-button"
          onClick={() =>
            loadData()
          }
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
            {data
              ?.league
              ?.name ||
              "Mi Liga"}
          </h1>

          <p>
            {data
              ?.user
              ?.name}

            {data
              ?.user
              ?.position
              ? ` · #${data.user.position}`
              : ""}
          </p>
        </div>

        <button
          className="refresh-button"
          disabled={
            refreshing
          }
          onClick={() =>
            loadData()
          }
        >
          {refreshing
            ? "Actualizando..."
            : "Actualizar"}
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
          value={
            data
              ?.squad
              ?.length ||
            0
          }
          description="Plantilla"
        />

        <Metric
          label="Valor equipo"
          value={formatMoney(
            data
              ?.finances
              ?.teamValue
          )}
          description="Valor actual"
        />

        <Metric
          label="Saldo"
          value={formatMoney(
            data
              ?.finances
              ?.balance
          )}
          description="Disponible"
        />

        <Metric
          label="Puja máxima"
          value={formatMoney(
            data
              ?.finances
              ?.maximumBid
          )}
          description="Límite Biwenger"
        />

        <Metric
          label="Patrimonio"
          value={formatMoney(
            data
              ?.finances
              ?.totalAssets
          )}
          description="Saldo + equipo"
        />
      </section>

      <nav className="tabs">
        <button
          className={
            tab === "team"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "team"
            )
          }
        >
          Mi equipo

          <span>
            {data
              ?.squad
              ?.length ||
              0}
          </span>
        </button>

        <button
          className={
            tab ===
            "market"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "market"
            )
          }
        >
          Mercado

          <span>
            {
              market.length
            }
          </span>
        </button>

        <button
          className={
            tab === "xi"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("xi")
          }
        >
          Mejor XI
        </button>

        <button
          className={
            tab ===
            "rivals"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "rivals"
            )
          }
        >
          Rivales

          <span>
            {data
              ?.rivals
              ?.length ||
              0}
          </span>
        </button>
      </nav>

      {tab ===
        "team" && (
        <main>
          <div className="section-header">
            <div>
              <span className="section-label">
                PLANTILLA
              </span>

              <h2>
                Mi equipo +
                próximos partidos
              </h2>
            </div>

            <p>
              Estado, rival y
              dificultad incluidos
            </p>
          </div>

          <section className="player-grid">
            {data?.squad?.map(
              (player) => (
                <TeamPlayerCard
                  key={
                    player.id
                  }
                  player={
                    player
                  }
                />
              )
            )}
          </section>
        </main>
      )}

      {tab ===
        "market" && (
        <main>
          <div className="section-header">
            <div>
              <span className="section-label">
                MERCADO INTELIGENTE
              </span>

              <h2>
                Valor, rendimiento
                y puja máxima
              </h2>
            </div>

            <p>
              La puja es una
              recomendación
            </p>
          </div>

          <section className="market-grid">
            {market.map(
              (player) => (
                <MarketCard
                  key={`${player.id}-${player.ownerId}`}
                  player={
                    player
                  }
                />
              )
            )}
          </section>
        </main>
      )}

      {tab ===
        "xi" && (
        <BestXI
          bestXI={
            data?.bestXI
          }
        />
      )}

      {tab ===
        "rivals" && (
        <main>
          <div className="section-header">
            <div>
              <span className="section-label">
                RIVALES
              </span>

              <h2>
                Quién puede competir
                por tus fichajes
              </h2>
            </div>

            <p>
              {data
                ?.league
                ?.settings
                ?.balanceHidden
                ? "El saldo rival está oculto"
                : "Saldo visible cuando Biwenger lo expone"}
            </p>
          </div>

          <section className="rivals-grid">
            {data
              ?.rivals
              ?.map(
                (rival) => (
                  <RivalCard
                    key={
                      rival.id
                    }
                    rival={
                      rival
                    }
                    balanceHidden={
                      data
                        ?.league
                        ?.settings
                        ?.balanceHidden
                    }
                  />
                )
              )}
          </section>
        </main>
      )}

      <footer>
        Última sincronización:{" "}
        {data?.syncedAt
          ? new Date(
              data.syncedAt
            ).toLocaleString(
              "es-BO"
            )
          : "-"}
      </footer>
    </div>
  );
}