import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import {
  MarketChip,
  MarketFilters,
  MarketStatusBar,
  MarketPositionFilterButton,
} from "../../components/market/MarketComponents.jsx";

export default function MarketScreen({
  marketFilter,
  setMarketFilter,
  marketPosition,
  setPositionFilterOpen,
  marketCounts,
  marketPositionCounts,
  data,
  market,
  filteredMarket,
  now,
  notificationPermission,
  onEnableNotifications,
  historyCount,
  onOpenHistory,
  onDetails,
  onBid,
}) {
  return (
    <div className="page-view">
      <SectionHeader
        label="MERCADO INTELIGENTE"
        title="Mercado actual"
        description="Solo aparecen jugadores disponibles para una nueva puja. Tus pujas activas y tus ventas están en Movimientos."
      >
        <div className="market-filter-controls">
          <MarketFilters
            value={marketFilter}
            onChange={setMarketFilter}
            counts={marketCounts}
          />

          <MarketPositionFilterButton
            value={marketPosition}
            counts={marketPositionCounts}
            onClick={() =>
              setPositionFilterOpen(
                true
              )
            }
          />
        </div>
      </SectionHeader>

      <MarketStatusBar
        meta={data?.marketMeta}
        market={market}
        now={now}
        notificationPermission={notificationPermission}
        onEnableNotifications={onEnableNotifications}
        historyCount={historyCount}
        onOpenHistory={onOpenHistory}
      />

      <section className="market-list market-list-v2">
        {filteredMarket.length
          ? filteredMarket.map(
              (player) => (
                <MarketChip
                  player={player}
                  key={`${player.id}-${player.ownerId}`}
                  onDetails={onDetails}
                  onBid={onBid}
                  now={now}
                />
              )
            )
          : (
            <div className="empty-state">
              No hay jugadores que coincidan con los filtros seleccionados.
            </div>
          )}
      </section>
    </div>
  );
}
