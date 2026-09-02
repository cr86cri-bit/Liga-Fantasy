import { formatMoney } from "../../utils/app.js";
import { Position, Modal, DetailMetric } from "../ui/PlayerUI.jsx";

function RivalLeagueTable({ rivals, onDetails }) {
  if (!rivals?.length) {
    return <div className="empty-state">No hay información de rivales disponible.</div>;
  }

  return (
    <div className="league-table-wrap">
      <table className="league-table">
        <thead>
          <tr>
            <th>Pos.</th><th>Equipo</th><th>Puntos</th><th>Fuerza</th><th>Jugadores</th><th>Valor plantilla</th><th>Necesidad</th><th />
          </tr>
        </thead>
        <tbody>
          {rivals.map((rival, index) => (
            <tr key={rival.id}>
              <td><span className="league-position">{rival.position || index + 1}</span></td>
              <td>
                <div className="league-team">
                  <div className="league-team-icon">{rival.name?.charAt(0)?.toUpperCase() || "?"}</div>
                  <div>
                    <strong>{rival.name}</strong>
                    <span>{rival.balanceVisible ? `Saldo ${formatMoney(rival.balance)}` : "Saldo oculto"}</span>
                  </div>
                </div>
              </td>
              <td><strong>{rival.points || 0}</strong></td>
              <td><div className="strength-cell"><strong>{rival.strength}</strong><span>/100</span></div></td>
              <td>{rival.playerCount}</td>
              <td><strong>{formatMoney(rival.teamValue)}</strong></td>
              <td>
                {rival.needs?.[0] ? (
                  <span className="need-pill">{rival.needs[0].position} · faltan {rival.needs[0].missing}</span>
                ) : (
                  <span className="balanced-pill">Equilibrado</span>
                )}
              </td>
              <td><button className="table-detail-button" onClick={() => onDetails(rival)}>Ver detalle</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RivalDetailModal({ rival, onClose, balanceHidden }) {
  if (!rival) return null;

  const sortedPlayers = [...(rival.players || [])].sort(
    (a, b) => Number(b.analysisScore || 0) - Number(a.analysisScore || 0)
  );

  return (
    <Modal open={Boolean(rival)} onClose={onClose} title={rival.name} subtitle="Detalle del rival" wide>
      <div className="rival-modal-summary">
        <DetailMetric label="Posición" value={rival.position ? `#${rival.position}` : "-"} />
        <DetailMetric label="Fuerza" value={`${rival.strength}/100`} />
        <DetailMetric label="Jugadores" value={rival.playerCount} />
        <DetailMetric label="Valor plantilla" value={formatMoney(rival.teamValue)} />
        <DetailMetric label="Puntos" value={rival.points || 0} />
        <DetailMetric label="Saldo" value={rival.balanceVisible ? formatMoney(rival.balance) : balanceHidden ? "Oculto" : "No disponible"} />
      </div>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">PLANTILLA</span><h3>Distribución por posición</h3></div></div>
        <div className="position-summary">
          {Object.entries(rival.positions || {}).map(([position, count]) => (
            <div key={position}><Position position={position} /><strong>{count}</strong><span>jugadores</span></div>
          ))}
        </div>
      </section>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">NECESIDADES</span><h3>Posiciones que podría reforzar</h3></div></div>
        {rival.needs?.length ? (
          <div className="needs-list">
            {rival.needs.map((need) => (
              <div className="need-card" key={need.position}>
                <Position position={need.position} />
                <div><strong>Le faltan {need.missing}</strong><span>Tiene {need.current} · objetivo {need.target}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-alert detail-alert-success">Plantilla equilibrada según nuestro modelo.</div>
        )}
      </section>

      <section className="modal-section">
        <div className="modal-section-title"><div><span className="section-label">JUGADORES</span><h3>Jugadores detectados</h3></div></div>
        {sortedPlayers.length ? (
          <div className="rival-player-list">
            {sortedPlayers.map((player) => (
              <div className="rival-player-row" key={player.id}>
                <Position position={player.position} /><strong>{player.name}</strong><span>{formatMoney(player.price)}</span><b>{player.analysisScore}/100</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="fixture-empty">Biwenger no devolvió la plantilla completa de este rival.</div>
        )}
      </section>
    </Modal>
  );
}


export { RivalLeagueTable, RivalDetailModal };
