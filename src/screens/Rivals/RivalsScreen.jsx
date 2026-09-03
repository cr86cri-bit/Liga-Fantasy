import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { RivalLeagueTable } from "../../components/rivals/Rivals.jsx";

export default function RivalsScreen({
  rivals,
  loading,
  onDetails,
}) {
  return (
    <div className="page-view">
      <SectionHeader
        label="CLASIFICACIÓN DE RIVALES"
        title="Tabla de tu liga"
        description="Comparación rápida de fuerza, plantilla y necesidades."
      />

      {loading &&
      !(rivals || []).length
        ? (
          <div className="rivals-loading-card">
            <div className="loader small" />

            <div>
              <strong>
                Cargando rivales de forma segura…
              </strong>

              <p>
                Se consulta una plantilla cada vez con una separación mínima de 4 segundos.
              </p>
            </div>
          </div>
        )
        : (
          <RivalLeagueTable
            rivals={rivals || []}
            onDetails={onDetails}
          />
        )}
    </div>
  );
}
