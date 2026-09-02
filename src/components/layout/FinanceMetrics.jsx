import { formatMoney } from "../../utils/app.js";
import { Metric } from "../ui/PlayerUI.jsx";

export default function FinanceMetrics({ data }) {
  return (
    <section className="metrics">
      <Metric label="Jugadores" value={data?.squad?.length || 0} description="Plantilla" />
      <Metric label="Valor equipo" value={formatMoney(data?.finances?.teamValue)} description="Valor actual" />
      <Metric label="Saldo" value={formatMoney(data?.finances?.balance)} description="Disponible" />
      <Metric label="Puja máxima" value={formatMoney(data?.finances?.maximumBid)} description="Límite Biwenger" />
      <Metric label="Patrimonio" value={formatMoney(data?.finances?.totalAssets)} description="Saldo + equipo" />
    </section>
  );
}
