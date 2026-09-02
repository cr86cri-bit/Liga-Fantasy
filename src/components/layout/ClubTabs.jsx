export default function ClubTabs({ tab, onChange, data, marketCount, movesCount }) {
  const item = (key, label, count) => (
    <button className={`${key === "campus" ? "campus-tab-button " : ""}${tab === key ? "active" : ""}`} onClick={() => onChange(key)}>{label}{count !== undefined && <span>{count}</span>}</button>
  );
  return (
    <nav className="tabs">
      {item("campus", "Campus")}
      {item("team", "Mi equipo", data?.squad?.length || 0)}
      {item("market", "Mercado", marketCount)}
      {item("moves", "Movimientos", movesCount)}
      {item("xi", "Mejor XI")}
      {item("rivals", "Rivales", data?.rivals?.length || 0)}
      <button className={tab === "protection" ? "active" : ""} onClick={() => onChange("protection")}>Protección<span className={data?.system?.rateLimited ? "tab-status-danger" : "tab-status-safe"}>{data?.system?.rateLimited ? "!" : "✓"}</span></button>
    </nav>
  );
}
