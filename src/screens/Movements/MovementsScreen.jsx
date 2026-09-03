import { MarketMovementsView } from "../../components/market/MarketComponents.jsx";

export default function MovementsScreen(
  props
) {
  return (
    <div className="page-view">
      <MarketMovementsView
        {...props}
      />
    </div>
  );
}
