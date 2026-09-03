import {
  formatMoney,
  toMilliseconds,
} from "../../utils/app.js";
import {
  PlayerPhoto,
  TeamCrest,
} from "../ui/PlayerUI.jsx";

function relativeTime(
  value
) {
  const millis =
    toMilliseconds(
      value
    );

  if (
    !millis
  ) {
    return "Fecha no disponible";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          millis
        ) /
        1000
      )
    );

  if (
    seconds <
    60
  ) {
    return "Hace un momento";
  }

  const minutes =
    Math.floor(
      seconds /
      60
    );

  if (
    minutes <
    60
  ) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours <
    24
  ) {
    return `Hace ${hours} h`;
  }

  const days =
    Math.floor(
      hours /
      24
    );

  if (
    days ===
    1
  ) {
    return "Ayer";
  }

  if (
    days <
    7
  ) {
    return `Hace ${days} días`;
  }

  return new Date(
    millis
  ).toLocaleDateString(
    "es-BO",
    {
      day:
        "2-digit",

      month:
        "short",
    }
  );
}

function TransferCard({
  item,
  compact,
  onPlayerDetails,
}) {
  const player =
    item?.player ||
    {};

  const isMarket =
    item?.type ===
    "market";

  return (
    <button
      type="button"
      className={`transfer-card ${
        isMarket
          ? "market-transfer"
          : "user-transfer"
      } ${
        compact
          ? "compact"
          : ""
      }`}
      onClick={() =>
        onPlayerDetails?.(
          player
        )
      }
    >
      <div className="transfer-card-top">
        <span className="transfer-type-badge">
          {isMarket
            ? "MERCADO"
            : "FICHAJE"}
        </span>

        <time>
          {relativeTime(
            item?.date
          )}
        </time>
      </div>

      <div className="transfer-player-row">
        <PlayerPhoto
          player={
            player
          }
          size="chip"
        />

        <div className="transfer-player-copy">
          <div>
            <span className={`position transfer-position position-${player.position || "NA"}`}>
              {player.position ||
                "—"}
            </span>

            <strong>
              {player.name ||
                "Jugador"}
            </strong>
          </div>

          <span className="transfer-player-club">
            <TeamCrest
              player={
                player
              }
              size="tiny"
            />

            {player.teamName ||
              "Sin club"}
          </span>
        </div>
      </div>

      <div className="transfer-route">
        {isMarket
          ? (
            <>
              <span>
                Fichado por
              </span>

              <strong>
                {item
                  ?.buyer
                  ?.name ||
                  "Equipo"}
              </strong>
            </>
          )
          : (
            <>
              <span>
                {item
                  ?.seller
                  ?.name ||
                  "Equipo"}
              </span>

              <b>
                →
              </b>

              <strong>
                {item
                  ?.buyer
                  ?.name ||
                  "Equipo"}
              </strong>
            </>
          )}
      </div>

      <div className="transfer-card-bottom">
        <div>
          <span>
            Por
          </span>

          <strong>
            {formatMoney(
              item?.amount
            )}
          </strong>
        </div>

        {item?.bids && (
          <span className="transfer-bids">
            ◉ {item.bids}{" "}
            {item.bids ===
            1
              ? "puja"
              : "pujas"}
          </span>
        )}
      </div>
    </button>
  );
}

function TransferSection({
  title,
  subtitle,
  items,
  compact,
  onPlayerDetails,
}) {
  const visible =
    compact
      ? (
          items ||
          []
        ).slice(
          0,
          4
        )
      : (
          items ||
          []
        );

  return (
    <section className="transfer-section">
      <header className="transfer-section-header">
        <div>
          <span>
            ACTIVIDAD DE LIGA
          </span>

          <h3>
            {title}
          </h3>

          {subtitle && (
            <p>
              {subtitle}
            </p>
          )}
        </div>

        <b>
          {(items ||
            []).length}
        </b>
      </header>

      {visible.length
        ? (
          <div className="transfer-card-grid">
            {visible.map(
              (
                item
              ) => (
                <TransferCard
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                  compact={
                    compact
                  }
                  onPlayerDetails={
                    onPlayerDetails
                  }
                />
              )
            )}
          </div>
        )
        : (
          <div className="transfer-empty">
            Todavía no hay registros recientes en esta categoría.
          </div>
        )}
    </section>
  );
}

export default function TransferBoard({
  data,
  compact = false,
  onPlayerDetails,
}) {
  const market =
    data?.market ||
    [];

  const transfers =
    data?.transfers ||
    [];

  return (
    <div
      className={`transfer-board ${
        compact
          ? "compact"
          : ""
      }`}
    >
      <TransferSection
        title="Mercado de fichajes"
        subtitle="Compras realizadas directamente desde el Mercado Biwenger."
        items={
          market
        }
        compact={
          compact
        }
        onPlayerDetails={
          onPlayerDetails
        }
      />

      <TransferSection
        title="Fichajes"
        subtitle="Traspasos realizados entre managers de tu liga."
        items={
          transfers
        }
        compact={
          compact
        }
        onPlayerDetails={
          onPlayerDetails
        }
      />
    </div>
  );
}
