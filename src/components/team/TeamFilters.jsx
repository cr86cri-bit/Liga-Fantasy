const SALE_FILTERS = [
  {
    key: "all",
    label: "Todos",
    icon: "◎",
  },
  {
    key: "sale",
    label: "En venta",
    icon: "🏷",
  },
  {
    key: "available",
    label: "Sin vender",
    icon: "✓",
  },
];

const RECOMMENDATION_FILTERS = [
  {
    key: "all",
    label: "Todas",
    icon: "◇",
  },
  {
    key: "MANTENER",
    label: "Mantener",
    icon: "✓",
  },
  {
    key: "VIGILAR",
    label: "Vigilar",
    icon: "◉",
  },
  {
    key: "VENDER",
    label: "Vender",
    icon: "↓",
  },
];

const POSITION_FILTERS = [
  {
    key: "all",
    label: "Todas",
    short: "TODAS",
  },
  {
    key: "AR",
    label: "Porteros",
    short: "AR",
  },
  {
    key: "DF",
    label: "Defensas",
    short: "DF",
  },
  {
    key: "MC",
    label: "Centrocampistas",
    short: "MC",
  },
  {
    key: "DL",
    label: "Delanteros",
    short: "DL",
  },
];

function FilterGroup({
  label,
  items,
  value,
  counts,
  onChange,
  className = "",
}) {
  return (
    <div
      className={`team-filter-group ${className}`}
    >
      <span className="team-filter-group-label">
        {label}
      </span>

      <div className="team-filter-buttons">
        {items.map(
          (item) => (
            <button
              type="button"
              key={item.key}
              className={
                value ===
                item.key
                  ? "active"
                  : ""
              }
              onClick={() =>
                onChange(
                  item.key
                )
              }
            >
              {item.icon && (
                <span className="team-filter-icon">
                  {item.icon}
                </span>
              )}

              <b>
                {item.label}
              </b>

              <small>
                {counts?.[
                  item.key
                ] ??
                  0}
              </small>
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function TeamFilters({
  saleFilter,
  recommendationFilter,
  positionFilter,
  saleCounts,
  recommendationCounts,
  positionCounts,
  filteredCount,
  totalCount,
  onSaleFilterChange,
  onRecommendationFilterChange,
  onPositionFilterChange,
  onClear,
}) {
  const hasFilters =
    saleFilter !==
      "all" ||
    recommendationFilter !==
      "all" ||
    positionFilter !==
      "all";

  return (
    <section className="team-filters-panel">
      <div className="team-filters-summary">
        <div>
          <span>
            FILTROS DE PLANTILLA
          </span>

          <strong>
            {filteredCount} de{" "}
            {totalCount} jugadores
          </strong>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="team-clear-filters"
            onClick={onClear}
          >
            × Limpiar filtros
          </button>
        )}
      </div>

      <div className="team-filter-grid">
        <FilterGroup
          label="Estado de venta"
          items={
            SALE_FILTERS
          }
          value={
            saleFilter
          }
          counts={
            saleCounts
          }
          onChange={
            onSaleFilterChange
          }
          className="sale"
        />

        <FilterGroup
          label="Recomendación"
          items={
            RECOMMENDATION_FILTERS
          }
          value={
            recommendationFilter
          }
          counts={
            recommendationCounts
          }
          onChange={
            onRecommendationFilterChange
          }
          className="recommendation"
        />

        <div className="team-filter-group position">
          <span className="team-filter-group-label">
            Posición
          </span>

          <div className="team-position-filter">
            {POSITION_FILTERS.map(
              (item) => (
                <button
                  type="button"
                  key={
                    item.key
                  }
                  className={
                    positionFilter ===
                    item.key
                      ? `active position-${String(
                          item.key
                        ).toLowerCase()}`
                      : ""
                  }
                  onClick={() =>
                    onPositionFilterChange(
                      item.key
                    )
                  }
                  title={
                    item.label
                  }
                >
                  <b>
                    {item.short}
                  </b>

                  <span>
                    {item.label}
                  </span>

                  <small>
                    {positionCounts?.[
                      item.key
                    ] ??
                      0}
                  </small>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
