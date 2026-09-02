import OfficeScene from "../../components/office/OfficeScene.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { TeamChip } from "../../components/team/TeamChip.jsx";

export default function TeamScreen({
  data,
  squad,
  onDetails,
  onSell,
  onNavigate,
}) {
  return (
    <OfficeScene
      section="team"
      data={data}
      onNavigate={onNavigate}
    >
      <main>
        <SectionHeader
          label="MI EQUIPO"
          title="Plantilla"
          description="Vista compacta. Abre un jugador para ver partido, forma y análisis."
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
      </main>
    </OfficeScene>
  );
}
