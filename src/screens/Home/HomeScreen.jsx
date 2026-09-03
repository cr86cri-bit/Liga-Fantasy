import {
  useMemo,
} from "react";
import {
  formatChange,
  formatMoney,
  statusConfig,
} from "../../utils/app.js";
import {
  PlayerPhoto,
  TeamCrest,
} from "../../components/ui/PlayerUI.jsx";

function StatCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="home-stat-card">
      <span className="home-stat-icon">
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

        <span>
          {description}
        </span>
      </div>
    </article>
  );
}

function TeamPreviewRow({
  player,
  onDetails,
}) {
  const [
    dot,
    statusLabel,
    statusClass,
  ] =
    statusConfig(
      player.status
    );

  return (
    <button
      type="button"
      className="home-team-player"
      onClick={() =>
        onDetails(
          player
        )
      }
    >
      <PlayerPhoto
        player={
          player
        }
        size="chip"
      />

      <div className="home-team-player-copy">
        <strong>
          {player.name}
        </strong>

        <span>
          <TeamCrest
            player={
              player
            }
            size="tiny"
          />

          {player.teamName}
        </span>
      </div>

      <span
        className={`home-player-status ${statusClass}`}
      >
        <i>
          {dot}
        </i>

        {statusLabel}
      </span>

      <div className="home-player-points">
        <strong>
          {player.points ||
            0}
        </strong>

        <span>
          pts
        </span>
      </div>
    </button>
  );
}

function MarketPreviewRow({
  player,
  onDetails,
}) {
  const change =
    Number(
      player.priceIncrement ||
      0
    );

  return (
    <button
      type="button"
      className="home-market-row"
      onClick={() =>
        onDetails(
          player
        )
      }
    >
      <PlayerPhoto
        player={
          player
        }
        size="mini"
      />

      <div className="home-market-name">
        <strong>
          {player.name}
        </strong>

        <span>
          <TeamCrest
            player={
              player
            }
            size="tiny"
          />

          {player.teamName}
        </span>
      </div>

      <span className="home-market-position">
        {player.position}
      </span>

      <strong className="home-market-value">
        {formatMoney(
          player.salePrice ||
            player.price
        )}
      </strong>

      <span
        className={`home-market-change ${
          change >
          0
            ? "positive"
            : change <
                0
              ? "negative"
              : ""
        }`}
      >
        {formatChange(
          change
        )}
      </span>
    </button>
  );
}

function getLineupPlayers(
  data
) {
  const squad =
    data?.squad ||
    [];

  const byId =
    new Map(
      squad.map(
        (
          player
        ) => [
          Number(
            player.id
          ),
          player,
        ]
      )
    );

  const savedIds =
    (
      data
        ?.lineup
        ?.playersID ||
      []
    )
      .map(
        Number
      )
      .filter(
        Boolean
      );

  const saved =
    savedIds
      .map(
        (
          id
        ) =>
          byId.get(
            id
          )
      )
      .filter(
        Boolean
      );

  if (
    saved.length ===
    11
  ) {
    return saved;
  }

  return (
    data
      ?.bestXI
      ?.players ||
    []
  ).slice(
    0,
    11
  );
}

function MiniPitch({
  data,
  onOpen,
}) {
  const players =
    getLineupPlayers(
      data
    );

  const groups =
    useMemo(
      () => ({
        DL:
          players.filter(
            (
              player
            ) =>
              player.position ===
              "DL"
          ),

        MC:
          players.filter(
            (
              player
            ) =>
              player.position ===
              "MC"
          ),

        DF:
          players.filter(
            (
              player
            ) =>
              player.position ===
              "DF"
          ),

        AR:
          players.filter(
            (
              player
            ) =>
              player.position ===
              "AR"
          ),
      }),
      [
        players,
      ]
    );

  const renderLine =
    (
      key
    ) => (
      <div
        className={`home-mini-line home-mini-line-${key.toLowerCase()}`}
      >
        {groups[
          key
        ].map(
          (
            player
          ) => (
            <span
              key={
                player.id
              }
              title={
                player.name
              }
            >
              <PlayerPhoto
                player={
                  player
                }
                size="mini"
              />

              <b>
                {player.name}
              </b>
            </span>
          )
        )}
      </div>
    );

  return (
    <button
      type="button"
      className="home-mini-pitch"
      onClick={
        onOpen
      }
    >
      <div className="home-mini-pitch-lines">
        <span className="home-mini-half" />
        <span className="home-mini-circle" />
        <span className="home-mini-box top" />
        <span className="home-mini-box bottom" />
      </div>

      {renderLine(
        "DL"
      )}
      {renderLine(
        "MC"
      )}
      {renderLine(
        "DF"
      )}
      {renderLine(
        "AR"
      )}
    </button>
  );
}

export default function HomeScreen({
  data,
  market,
  onNavigate,
  onTeamDetails,
  onMarketDetails,
}) {
  const squad =
    data?.squad ||
    [];

  const teamPreview =
    squad
      .slice()
      .sort(
        (
          left,
          right
        ) =>
          Number(
            right.points ||
            0
          ) -
          Number(
            left.points ||
            0
          )
      )
      .slice(
        0,
        8
      );

  const marketPreview =
    (
      market ||
      []
    )
      .slice()
      .sort(
        (
          left,
          right
        ) =>
          Number(
            right
              ?.analysis
              ?.score ||
            0
          ) -
          Number(
            left
              ?.analysis
              ?.score ||
            0
          )
      )
      .slice(
        0,
        5
      );

  const points =
    Number(
      data
        ?.user
        ?.points ||
      data
        ?.league
        ?.points ||
      0
    );

  return (
    <div className="home-dashboard">
      <section className="home-hero">
        <div className="home-club-identity">
          <img
            src="/brand/canadores-crest.png"
            alt="Cañadores FC"
          />

          <div>
            <span>
              {data
                ?.league
                ?.name ||
                "The Best League"}
            </span>

            <h1>
              Cañadores F.C.
            </h1>

            <p>
              “Cazar puntos. Dominar la liga.”
            </p>
          </div>
        </div>

        <div className="home-competition-summary">
          <article>
            <span>
              POSICIÓN
            </span>

            <strong>
              #
              {data
                ?.user
                ?.position ||
                "-"}
            </strong>

            <small>
              Ranking de liga
            </small>
          </article>

          <article>
            <span>
              PUNTOS
            </span>

            <strong>
              {points.toLocaleString(
                "es-ES"
              )}
            </strong>

            <small>
              Acumulados
            </small>
          </article>
        </div>

        <div className="home-stat-grid">
          <StatCard
            icon="♙"
            label="Jugadores"
            value={
              squad.length
            }
            description="Plantilla actual"
          />

          <StatCard
            icon="◎"
            label="Valor equipo"
            value={formatMoney(
              data
                ?.finances
                ?.teamValue
            )}
            description="Valor de mercado"
          />

          <StatCard
            icon="▣"
            label="Saldo"
            value={formatMoney(
              data
                ?.finances
                ?.balance
            )}
            description="Disponible"
          />

          <StatCard
            icon="♢"
            label="Puja máxima"
            value={formatMoney(
              data
                ?.finances
                ?.maximumBid
            )}
            description="Límite Biwenger"
          />

          <StatCard
            icon="⌂"
            label="Patrimonio"
            value={formatMoney(
              data
                ?.finances
                ?.totalAssets
            )}
            description="Saldo + equipo"
          />
        </div>
      </section>

      <section className="home-grid">
        <article className="home-panel home-team-panel">
          <header>
            <div>
              <span>
                PLANTILLA
              </span>

              <h2>
                Mi equipo
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate(
                  "team"
                )
              }
            >
              Ver plantilla
              <b>
                →
              </b>
            </button>
          </header>

          <div className="home-team-list">
            {teamPreview.map(
              (
                player
              ) => (
                <TeamPreviewRow
                  key={
                    player.id
                  }
                  player={
                    player
                  }
                  onDetails={
                    onTeamDetails
                  }
                />
              )
            )}
          </div>

          {!teamPreview.length && (
            <div className="home-empty">
              Todavía no hay jugadores cargados.
            </div>
          )}
        </article>

        <div className="home-right-column">
          <article className="home-panel home-market-panel">
            <header>
              <div>
                <span>
                  OPORTUNIDADES
                </span>

                <h2>
                  Mercado actual
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate(
                    "market"
                  )
                }
              >
                Ver mercado
                <b>
                  →
                </b>
              </button>
            </header>

            <div className="home-market-table-head">
              <span>
                Jugador
              </span>

              <span>
                Pos.
              </span>

              <span>
                Valor
              </span>

              <span>
                Variación
              </span>
            </div>

            <div className="home-market-list">
              {marketPreview.map(
                (
                  player
                ) => (
                  <MarketPreviewRow
                    key={`${player.id}-${player.ownerId}`}
                    player={
                      player
                    }
                    onDetails={
                      onMarketDetails
                    }
                  />
                )
              )}
            </div>

            {!marketPreview.length && (
              <div className="home-empty">
                No hay jugadores disponibles para una nueva puja.
              </div>
            )}
          </article>

          <article className="home-panel home-xi-panel">
            <header>
              <div>
                <span>
                  ALINEACIÓN
                </span>

                <h2>
                  Mejor XI
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate(
                    "xi"
                  )
                }
              >
                Ver análisis
                <b>
                  →
                </b>
              </button>
            </header>

            <div className="home-xi-body">
              <div className="home-xi-summary">
                <span>
                  FORMACIÓN
                </span>

                <strong>
                  {data
                    ?.lineup
                    ?.type ||
                    data
                      ?.bestXI
                      ?.formation ||
                    "4-4-2"}
                </strong>

                <small>
                  XI sincronizado con Biwenger
                </small>

                <div>
                  <span>
                    Nota media
                  </span>

                  <b>
                    {(
                      getLineupPlayers(
                        data
                      ).reduce(
                        (
                          total,
                          player
                        ) =>
                          total +
                          Number(
                            player
                              ?.analysis
                              ?.score ||
                              0
                          ),
                        0
                      ) /
                      Math.max(
                        1,
                        getLineupPlayers(
                          data
                        ).length
                      )
                    ).toFixed(
                      1
                    )}
                  </b>
                </div>
              </div>

              <MiniPitch
                data={
                  data
                }
                onOpen={() =>
                  onNavigate(
                    "xi"
                  )
                }
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
