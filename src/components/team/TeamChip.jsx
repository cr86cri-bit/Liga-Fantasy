import { formatMoney, formatChange, changeClass } from "../../utils/app.js";
import { Position, Recommendation, PlayerPhoto, ClubIdentity, Status, DetailButton } from "../ui/PlayerUI.jsx";

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

          {player.isForSale && (
            <span className="for-sale-badge">
              🏷 EN VENTA
            </span>
          )}
        </div>

        <div className="chip-club">
          <ClubIdentity
            player={
              player
            }
          />
        </div>

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
            className={`chip-operation-button sell ${
              player.isForSale
                ? "already-listed"
                : ""
            }`}
            onClick={() =>
              onSell(
                player
              )
            }
            disabled={
              player.isForSale
            }
          >
            {player.isForSale
              ? "✓ En venta"
              : "🏷 Vender"}
          </button>
        </div>
      </div>
    </article>
  );
}


export { TeamChip };
