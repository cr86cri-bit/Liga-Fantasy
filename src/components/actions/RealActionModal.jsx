import { useEffect, useState } from "react";
import { formatMoney } from "../../utils/app.js";
import { Modal, Position, Recommendation, PlayerPhoto, DetailMetric, SellerBadge } from "../ui/PlayerUI.jsx";

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


export { RealActionModal };
