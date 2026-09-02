import { Modal } from "../ui/PlayerUI.jsx";
import { formatNotificationDate, marketEventIcon } from "../../utils/marketNotifications.js";

function Toasts({ items, onClose }) {
  return (
    <div className="toast-stack">
      {items.map((item) => (
        <article className={`toast toast-${item.type || "info"}`} key={item.id}>
          <div className="toast-icon">
            {item.icon || (item.type === "market" ? "🔔" : "ℹ️")}
          </div>

          <div className="toast-content">
            <span className="toast-kicker">
              {item.eventType === "removed"
                ? "SALIDA DEL MERCADO"
                : item.eventType === "added"
                  ? "NUEVA OFERTA"
                  : item.eventType === "price"
                    ? "CAMBIO DE PRECIO"
                    : item.eventType === "deadline"
                      ? "TIEMPO ACTUALIZADO"
                      : "NOTIFICACIÓN"}
            </span>

            <strong>{item.title}</strong>
            <p>{item.message}</p>

            {(item.playerName || item.actorName) && (
              <div className="toast-meta">
                {item.playerName && <span>⚽ {item.playerName}</span>}
                {item.actorName && <span>👤 {item.actorName}</span>}
              </div>
            )}
          </div>

          <button onClick={() => onClose(item.id)} aria-label="Cerrar aviso">
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

function NotificationHistoryModal({
  open,
  items,
  onClose,
  onClear,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Historial de notificaciones"
      subtitle="Cambios de mercado detectados por Liga Fantasy"
      wide
    >
      <div className="notification-history-toolbar">
        <div>
          <span>Registros guardados</span>
          <strong>{items.length}</strong>
        </div>

        {items.length > 0 && (
          <button className="notification-history-clear" onClick={onClear}>
            Limpiar historial
          </button>
        )}
      </div>

      {items.length ? (
        <div className="notification-history-list">
          {items.map((item) => (
            <article
              className={`notification-history-item event-${item.eventType || "info"}`}
              key={item.id}
            >
              <div className="notification-history-icon">
                {item.icon || marketEventIcon(item.eventType)}
              </div>

              <div className="notification-history-content">
                <div className="notification-history-title-row">
                  <strong>{item.title}</strong>
                  <time>{formatNotificationDate(item.createdAt)}</time>
                </div>

                <p>{item.message}</p>

                {(item.playerName || item.actorName) && (
                  <div className="notification-history-meta">
                    {item.playerName && (
                      <span>
                        Jugador: <b>{item.playerName}</b>
                      </span>
                    )}

                    {item.actorName && (
                      <span>
                        Oferente: <b>{item.actorName}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          Todavía no hay notificaciones guardadas.
        </div>
      )}
    </Modal>
  );
}


export { Toasts, NotificationHistoryModal };
