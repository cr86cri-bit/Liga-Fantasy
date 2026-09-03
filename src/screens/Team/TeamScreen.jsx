import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { TeamChip } from "../../components/team/TeamChip.jsx";

export default function TeamScreen({
  squad,
  onDetails,
  onSell,
}) {
  return (
    <div className="page-view">
      <SectionHeader
        label="MI EQUIPO"
        title="Plantilla"
        description="Abre un jugador para revisar partido, forma, análisis y estado. Desde aquí también puedes poner jugadores a la venta."
      />

      <section className="team-chip-grid">
        {(squad || []).map(
          (player) => (
            <TeamChip
              player={player}
              key={player.id}
              onDetails={onDetails}
              onSell={onSell}
            />
          )
        )}
      </section>
    </div>
  );
}
