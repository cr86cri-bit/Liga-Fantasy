import { PlayerPhoto, TeamCrest } from "../ui/PlayerUI.jsx";
import { lineupAvailabilityInfo } from "./lineupHelpers.js";

function PitchLine({
  players,
  className,
  roles,
  positionQualityMap,
  onPlayerDetails,
}) {
  return (
    <div
      className={`pitch-line ${className}`}
    >
      {players.map(
        (
          player,
          visualIndex
        ) => {
          const isCaptain =
            Number(
              roles
                ?.captain
                ?.id ||
              0
            ) ===
            Number(
              player.id
            );

          const isStriker =
            Number(
              roles
                ?.striker
                ?.id ||
              0
            ) ===
            Number(
              player.id
            );

          const availability =
            lineupAvailabilityInfo(
              player
            );

          const quality =
            positionQualityMap
              ?.get(
                Number(
                  player.id
                )
              ) ||
            null;

          const visualSide =
            players.length ===
              1
              ? "CENTRO"
              : visualIndex ===
                  0
                ? "IZQ"
                : visualIndex ===
                    players.length -
                    1
                  ? "DER"
                  : "CENTRO";

          return (
            <button
              className={`pitch-player ${
                availability
                  ? `pitch-player-alert status-${availability.className}`
                  : ""
              }`}
              key={
                player.id
              }
              title={
                availability
                  ? `${availability.label}: ${player.statusInfo || "Disponibilidad comprometida"}`
                  : quality
                    ? `${quality.label} en ${quality.position} · #${quality.rank} de ${quality.total} en tu plantilla`
                    : player.name
              }
              onClick={() =>
                onPlayerDetails(
                  player
                )
              }
            >
              <div className="pitch-player-photo">
                <PlayerPhoto
                  player={
                    player
                  }
                  size="pitch"
                />

                {isCaptain && (
                  <span className="pitch-role pitch-role-captain">
                    C
                  </span>
                )}

                {isStriker && (
                  <span className="pitch-role pitch-role-striker">
                    9
                  </span>
                )}

                {availability && (
                  <span
                    className={`pitch-health-role status-${availability.className}`}
                    aria-label={
                      availability.label
                    }
                  >
                    {availability.icon}
                  </span>
                )}
              </div>

              <span className="pitch-player-name">
                <TeamCrest
                  player={player}
                  size="pitch"
                />

                <strong>
                  {player.name}
                </strong>
              </span>

              <span className="pitch-points">
                {Number(
                  player.projectedPoints ||
                  0
                ).toFixed(
                  1
                )} pts
              </span>

              <div className="pitch-player-insights">
                {quality && (
                  <span
                    className={`pitch-quality quality-${quality.className}`}
                  >
                    {quality.shortLabel}
                    <b>
                      #{quality.rank}/{quality.total}
                    </b>
                  </span>
                )}

                {availability && (
                  <span
                    className={`pitch-availability status-${availability.className}`}
                  >
                    {availability.shortLabel}
                  </span>
                )}
              </div>

              <small className="pitch-slot-label">
                {player.position} · {visualSide}
              </small>
            </button>
          );
        }
      )}
    </div>
  );
}


export { PitchLine };
