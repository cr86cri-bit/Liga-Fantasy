import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import TransferBoard from "../../components/transfers/TransferBoard.jsx";

export default function TransfersScreen({
  data,
  onPlayerDetails,
}) {
  return (
    <div className="page-view transfers-page">
      <SectionHeader
        label="ACTIVIDAD DE LA LIGA"
        title="Fichajes"
        description="Mercado de fichajes y traspasos entre managers obtenidos del tablón de tu liga."
      />

      <TransferBoard
        data={
          data?.transferNews
        }
        onPlayerDetails={
          onPlayerDetails
        }
      />
    </div>
  );
}
