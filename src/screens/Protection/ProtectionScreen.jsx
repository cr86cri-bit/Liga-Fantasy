import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { ApiProtectionPanel } from "../../components/protection/ApiProtectionPanel.jsx";

export default function ProtectionScreen({
  system,
  isLeader,
  now,
}) {
  return (
    <div className="page-view">
      <SectionHeader
        label="PROTECCIÓN BIWENGER"
        title="Uso y protección de la API"
        description="Controla las peticiones reales, caché, cola y tiempos de actualización."
      />

      {system && (
        <div
          className={`cache-status protection-cache-status ${
            system.rateLimited
              ? "rate-limited"
              : "healthy"
          }`}
        >
          <div>
            <strong>
              {system.rateLimited
                ? "🛡 Protección de API activa"
                : "⚡ Caché inteligente activa"}
            </strong>

            <span>
              Mercado 5 min · Equipo 10 min · Alineación 15 min bajo demanda · Catálogo 6 h
            </span>
          </div>

          {system.rateLimitUntil && (
            <small>
              Cooldown hasta{" "}
              {new Date(
                system.rateLimitUntil
              ).toLocaleTimeString(
                "es-BO",
                {
                  hour:
                    "2-digit",
                  minute:
                    "2-digit",
                }
              )}
            </small>
          )}
        </div>
      )}

      <ApiProtectionPanel
        system={system}
        isLeader={isLeader}
        now={now}
      />

      <section className="protection-info-grid">
        <article>
          <span>
            🧠
          </span>

          <div>
            <strong>
              Caché por módulos
            </strong>

            <p>
              Navegar, filtrar, abrir jugadores y revisar el XI no genera peticiones nuevas mientras los datos sigan vigentes.
            </p>
          </div>
        </article>

        <article>
          <span>
            🪟
          </span>

          <div>
            <strong>
              Una pestaña líder
            </strong>

            <p>
              Aunque abras Liga Fantasy varias veces, solo una pestaña realiza actualizaciones automáticas.
            </p>
          </div>
        </article>

        <article>
          <span>
            ⛔
          </span>

          <div>
            <strong>
              Circuit breaker
            </strong>

            <p>
              Si Biwenger limita las peticiones, la cola se detiene y el sistema trabaja con los últimos datos guardados.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
