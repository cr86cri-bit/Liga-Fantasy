import { useEffect, useState } from "react";
import { Modal, Position } from "../ui/PlayerUI.jsx";

function LineupConfirmModal({
  open,
  formation,
  players,
  captain,
  striker,
  loading,
  error,
  onClose,
  onConfirm,
}) {
  const [
    acknowledged,
    setAcknowledged,
  ] = useState(false);

  useEffect(() => {
    if (open) {
      setAcknowledged(
        false
      );
    }
  }, [
    open,
  ]);

  return (
    <Modal
      open={
        open
      }
      onClose={() => {
        if (!loading) {
          onClose();
        }
      }}
      title="Confirmar alineación"
      subtitle="Esta acción guardará tu XI real en Biwenger."
      wide
    >
      <div className="real-action-warning">
        <span>
          ⚠
        </span>

        <div>
          <strong>
            Cambio real de alineación
          </strong>

          <p>
            Revisa formación, titulares, capitán y ariete antes
            de confirmar. La operación se enviará una sola vez.
          </p>
        </div>
      </div>

      <div className="lineup-confirm-summary lineup-confirm-summary-four">
        <div>
          <span>
            Formación
          </span>

          <strong>
            {formation}
          </strong>
        </div>

        <div>
          <span>
            Titulares
          </span>

          <strong>
            {players.length}/11
          </strong>
        </div>

        <div>
          <span>
            Capitán
          </span>

          <strong>
            {captain?.name ||
              "Sin capitán"}
          </strong>
        </div>

        <div>
          <span>
            Ariete
          </span>

          <strong>
            {striker?.name ||
              "Sin ariete"}
          </strong>
        </div>
      </div>

      <div className="lineup-confirm-players">
        {players.map(
          (player) => {
            const isCaptain =
              Number(
                captain?.id ||
                0
              ) ===
              Number(
                player.id
              );

            const isStriker =
              Number(
                striker?.id ||
                0
              ) ===
              Number(
                player.id
              );

            return (
              <div
                key={
                  player.id
                }
              >
                <Position
                  position={
                    player.position
                  }
                />

                <span>
                  {player.name}
                </span>

                <div className="lineup-confirm-roles">
                  {isCaptain && (
                    <b className="role-captain">
                      C
                    </b>
                  )}

                  {isStriker && (
                    <b className="role-striker">
                      9
                    </b>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

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
            Confirmo que quiero guardar este XI en Biwenger.
          </strong>

          <small>
            La casilla es obligatoria antes de realizar el cambio.
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
          className="real-action-confirm bid"
          disabled={
            !acknowledged ||
            loading
          }
          onClick={
            onConfirm
          }
        >
          {loading
            ? "Guardando..."
            : "Confirmar alineación"}
        </button>
      </div>
    </Modal>
  );
}


export { LineupConfirmModal };
