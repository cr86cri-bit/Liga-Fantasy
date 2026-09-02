import { buildings } from "./buildings.js";


export default function CampusScreen({ data, onOpen, onRefresh, refreshing }) {
  return (
    <main className="campus-screen">
      <section className="campus-hero">
        <div className="campus-heading">
          <div>
            <span>CAÑADORES FC · CENTRO DEPORTIVO</span>
            <h2>Campus del club</h2>
            <p>Selecciona un edificio para entrar a su área de gestión.</p>
          </div>
          <button className="campus-sync-button" type="button" onClick={onRefresh} disabled={refreshing || data?.system?.rateLimited}>
            {data?.system?.rateLimited ? "Protección activa" : refreshing ? "Sincronizando…" : "Sincronizar campus"}
          </button>
        </div>

        <div className="campus-map-shell">
          <img className="campus-aerial-image" src="/campus/campus-aerial.webp" alt="Campus deportivo Cañadores FC" />
          <div className="campus-map-vignette" />

          <div className="campus-central-badge">
            <img src="/brand/canadores-crest.webp" alt="Cañadores FC" />
            <div><span>LIGA FANTASY</span><strong>{data?.league?.name || "The Best League"}</strong></div>
          </div>

          {buildings.map((building) => (
            <button
              type="button"
              className={`campus-building-hotspot campus-hotspot-${building.key}`}
              style={{ left: `${building.x}%`, top: `${building.y}%` }}
              key={building.key}
              onClick={() => onOpen(building.key)}
              aria-label={`Entrar a ${building.label}`}
            >
              <span className="campus-hotspot-pulse" />
              <span className="campus-hotspot-icon">{building.icon}</span>
              <span className="campus-hotspot-copy"><strong>{building.label}</strong><small>{building.subtitle}</small></span>
              <span className="campus-building-preview"><img src={building.image} alt="" /><b>{building.label}</b><small>Entrar al edificio →</small></span>
            </button>
          ))}
        </div>

        <div className="campus-command-bar">
          <div><span>PLANTILLA</span><strong>{data?.squad?.length || 0}</strong></div>
          <div><span>POSICIÓN</span><strong>#{data?.user?.position || "-"}</strong></div>
          <div><span>SALDO</span><strong>{Number(data?.finances?.balance || 0).toLocaleString("es-ES")} €</strong></div>
          <div><span>PROTECCIÓN API</span><strong className={data?.system?.rateLimited ? "campus-danger" : "campus-safe"}>{data?.system?.rateLimited ? "ACTIVA" : "SEGURA"}</strong></div>
        </div>
      </section>

      <section className="campus-building-grid">
        {buildings.map((building) => (
          <button className="campus-building-card" type="button" key={`card-${building.key}`} onClick={() => onOpen(building.key)}>
            <img src={building.image} alt={`Edificio ${building.label}`} />
            <span className="campus-building-card-overlay" />
            <div><small>{building.subtitle}</small><strong>{building.label}</strong><span>Entrar →</span></div>
          </button>
        ))}
      </section>
    </main>
  );
}
