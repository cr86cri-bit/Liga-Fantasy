export default function ClubHeader({ data, refreshing, manualRefreshRemaining, onRefresh }) {
  return (
    <header className="header canadores-header">
      <div className="canadores-brand-lockup">
        <div className="canadores-crest-shell"><img src="/brand/canadores-crest.png" alt="Escudo Cañadores FC" className="canadores-crest" /></div>
        <div className="canadores-brand-copy">
          <span className="brand">CAÑADORES FC · LIGA FANTASY</span>
          <h1>{data?.league?.name || "Mi Liga"}</h1>
          <div className="canadores-manager-line"><strong>{data?.user?.name || "Cañadores F.C."}</strong>{data?.user?.position && <span>POSICIÓN #{data.user.position}</span>}</div>
          <p className="canadores-motto">Cazar puntos. Dominar la liga.</p>
        </div>
      </div>
      <div className="canadores-header-actions">
        <div className="canadores-kit-card"><img src="/brand/canadores-jersey.png" alt="Camiseta de Cañadores FC" /><div><span>IDENTIDAD DEL CLUB</span><strong>Verde bosque · Granate · Crema</strong></div></div>
        <button className="refresh-button" disabled={refreshing || manualRefreshRemaining > 0 || data?.system?.rateLimited} onClick={onRefresh}>
          {data?.system?.rateLimited ? "Protección activa" : refreshing ? "Actualizando..." : manualRefreshRemaining > 0 ? `Actualizar en ${manualRefreshRemaining}s` : "Actualizar datos"}
        </button>
      </div>
    </header>
  );
}
