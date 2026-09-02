import { formatShortDuration } from "../../utils/app.js";

function ApiProtectionPanel({
  system,
  isLeader,
  now,
}) {
  if (!system) {
    return null;
  }

  const usage =
    system.apiUsage ||
    {};

  const next =
    system.nextRefresh ||
    {};

  const level =
    usage.level ||
    (
      system.rateLimited
        ? "blocked"
        : "safe"
    );

  const lastRequestMs =
    usage.lastRequestAt
      ? Date.parse(
          usage.lastRequestAt
        )
      : null;

  const lastRequestText =
    lastRequestMs
      ? `${formatShortDuration(
          Math.max(
            0,
            Math.floor(
              (
                now -
                lastRequestMs
              ) /
              1000
            )
          )
        )} atrás`
      : "Ninguna todavía";

  const endpointRows =
    usage.endpointsLastHour ||
    [];

  return (
    <section
      className={`api-protection-panel api-level-${level}`}
    >
      <div className="api-protection-head">
        <div>
          <span className="section-label">
            PROTECCIÓN BIWENGER
          </span>

          <h3>
            {level === "blocked"
              ? "Cooldown activo"
              : level === "high"
                ? "Uso elevado"
                : level === "controlled"
                  ? "Uso controlado"
                  : "Estado seguro"}
          </h3>

          <p>
            {isLeader
              ? "Esta pestaña es la única que realiza actualizaciones automáticas."
              : "Otra pestaña controla las actualizaciones. Esta recibe los datos compartidos."}
          </p>
        </div>

        <span
          className={`api-role ${
            isLeader
              ? "leader"
              : "follower"
          }`}
        >
          {isLeader
            ? "● Pestaña líder"
            : "○ Pestaña secundaria"}
        </span>
      </div>

      <div className="api-protection-metrics">
        <div>
          <span>Última hora</span>
          <strong>{usage.requestsLastHour ?? 0}</strong>
          <small>peticiones reales</small>
        </div>

        <div>
          <span>Hoy</span>
          <strong>{usage.requestsToday ?? 0}</strong>
          <small>peticiones reales</small>
        </div>

        <div>
          <span>Evitadas</span>
          <strong>{usage.avoidedLastHour ?? 0}</strong>
          <small>por caché · última hora</small>
        </div>

        <div>
          <span>Cola</span>
          <strong>{usage.queue?.queued ?? 0}</strong>
          <small>1 petición cada 4s</small>
        </div>

        <div>
          <span>Última petición</span>
          <strong className="api-small-value">
            {lastRequestText}
          </strong>
          <small>Biwenger</small>
        </div>
      </div>

      <div className="api-next-refresh">
        <div>
          <span>Mercado</span>
          <strong>{formatShortDuration(next.marketSeconds)}</strong>
        </div>

        <div>
          <span>Mi equipo</span>
          <strong>{formatShortDuration(next.ownUserSeconds)}</strong>
        </div>

        <div>
          <span>Alineación</span>
          <strong>{formatShortDuration(next.lineupSeconds)}</strong>
        </div>

        <div>
          <span>Rivales</span>
          <strong>{formatShortDuration(next.rivalsSeconds)}</strong>
        </div>

        <div>
          <span>Catálogo</span>
          <strong>{formatShortDuration(next.catalogSeconds)}</strong>
        </div>
      </div>

      {endpointRows.length > 0 && (
        <details className="api-endpoint-details">
          <summary>Ver uso por endpoint</summary>

          <div>
            {endpointRows.map((item) => (
              <span key={item.endpoint}>
                <b>{item.endpoint}</b>
                {item.count}
              </span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}


export { ApiProtectionPanel };
