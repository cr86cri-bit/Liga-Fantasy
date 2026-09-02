import OfficeScene from "../../components/office/OfficeScene.jsx";
import { MarketMovementsView } from "../../components/market/MarketComponents.jsx";

export default function MovementsScreen({
  data,
  onNavigate,
  ...props
}) {
  return (
    <OfficeScene
      section="moves"
      data={data}
      onNavigate={onNavigate}
    >
      <MarketMovementsView
        {...props}
      />
    </OfficeScene>
  );
}
