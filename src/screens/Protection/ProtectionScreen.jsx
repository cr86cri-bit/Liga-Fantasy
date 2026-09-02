import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { ApiProtectionPanel } from "../../components/protection/ApiProtectionPanel.jsx";

export default function ProtectionScreen({ system, isLeader, now }) {
  return (
    <main>
      <SectionHeader label="PROTECCIÓN BIWENGER" title="Uso y protección de la API" description="Aquí puedes controlar las peticiones reales, la caché, la cola y los tiempos de actualización sin ocupar espacio en las demás vistas." />
      {system && (
        <div className={`cache-status protection-cache-status ${system.rateLimited ? "rate-limited" : "healthy"}`}>
          <div>
            <strong>{system.rateLimited ? "🛡 Protección de API activa" : "⚡ Caché inteligente activa"}</strong>
            <span>Mercado 5 min · Tu equipo 10 min · Alineación 15 min bajo demanda · Rivales 30 min bajo demanda · Catálogo 6 h</span>
          </div>
          {system.rateLimitUntil && <small>Cooldown hasta {new Date(system.rateLimitUntil).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</small>}
        </div>
      )}
      <ApiProtectionPanel system={system} isLeader={isLeader} now={now} />
      <section className="protection-info-grid">
        <article><span>🧠</span><div><strong>Caché por módulos</strong><p>Navegar, filtrar, abrir jugadores, revisar el XI y usar contadores no genera peticiones nuevas mientras la información siga vigente.</p></div></article>
        <article><span>🪟</span><div><strong>Una pestaña líder</strong><p>Aunque abras Liga Fantasy varias veces, solo una pestaña realiza las actualizaciones automáticas.</p></div></article>
        <article><span>⛔</span><div><strong>Circuit breaker</strong><p>Si Biwenger limita las peticiones, la cola se detiene y el sistema trabaja con los últimos datos guardados.</p></div></article>
      </section>
    </main>
  );
}
