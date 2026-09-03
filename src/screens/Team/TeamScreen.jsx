import {
  useMemo,
  useState,
} from "react";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { TeamChip } from "../../components/team/TeamChip.jsx";
import TeamFilters from "../../components/team/TeamFilters.jsx";

function normalizeRecommendation(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function normalizePosition(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function countBy(
  squad,
  values,
  getKey
) {
  const counts =
    Object.fromEntries(
      values.map(
        (value) => [
          value,
          0,
        ]
      )
    );

  for (
    const player of
      squad
  ) {
    const key =
      getKey(
        player
      );

    if (
      key in
      counts
    ) {
      counts[
        key
      ] += 1;
    }
  }

  return counts;
}

export default function TeamScreen({
  squad,
  onDetails,
  onSell,
}) {
  const players =
    squad ||
    [];

  const [
    saleFilter,
    setSaleFilter,
  ] =
    useState(
      "all"
    );

  const [
    recommendationFilter,
    setRecommendationFilter,
  ] =
    useState(
      "all"
    );

  const [
    positionFilter,
    setPositionFilter,
  ] =
    useState(
      "all"
    );

  /*
   * Todos los filtros son locales.
   * Cambiarlos NO realiza nuevas peticiones a Biwenger.
   */
  const filteredPlayers =
    useMemo(
      () =>
        players.filter(
          (
            player
          ) => {
            const saleMatches =
              saleFilter ===
                "all" ||
              (
                saleFilter ===
                  "sale" &&
                Boolean(
                  player.isForSale
                )
              ) ||
              (
                saleFilter ===
                  "available" &&
                !player.isForSale
              );

            const recommendation =
              normalizeRecommendation(
                player
                  ?.analysis
                  ?.recommendation
              );

            const recommendationMatches =
              recommendationFilter ===
                "all" ||
              recommendation ===
                recommendationFilter;

            const position =
              normalizePosition(
                player.position
              );

            const positionMatches =
              positionFilter ===
                "all" ||
              position ===
                positionFilter;

            return (
              saleMatches &&
              recommendationMatches &&
              positionMatches
            );
          }
        ),
      [
        players,
        saleFilter,
        recommendationFilter,
        positionFilter,
      ]
    );

  /*
   * Los contadores muestran la distribución completa de la
   * plantilla para que sea fácil saber cuántos jugadores hay
   * en cada categoría antes de aplicar un filtro.
   */
  const saleCounts =
    useMemo(
      () => ({
        all:
          players.length,

        sale:
          players.filter(
            (
              player
            ) =>
              Boolean(
                player.isForSale
              )
          ).length,

        available:
          players.filter(
            (
              player
            ) =>
              !player.isForSale
          ).length,
      }),
      [
        players,
      ]
    );

  const recommendationCounts =
    useMemo(
      () => ({
        all:
          players.length,

        ...countBy(
          players,
          [
            "MANTENER",
            "VIGILAR",
            "VENDER",
          ],
          (
            player
          ) =>
            normalizeRecommendation(
              player
                ?.analysis
                ?.recommendation
            )
        ),
      }),
      [
        players,
      ]
    );

  const positionCounts =
    useMemo(
      () => ({
        all:
          players.length,

        ...countBy(
          players,
          [
            "AR",
            "DF",
            "MC",
            "DL",
          ],
          (
            player
          ) =>
            normalizePosition(
              player.position
            )
        ),
      }),
      [
        players,
      ]
    );

  const clearFilters =
    () => {
      setSaleFilter(
        "all"
      );

      setRecommendationFilter(
        "all"
      );

      setPositionFilter(
        "all"
      );
    };

  return (
    <div className="page-view">
      <SectionHeader
        label="MI EQUIPO"
        title="Plantilla"
        description="Filtra la plantilla por jugadores en venta, recomendación del análisis y posición. Todos los filtros funcionan localmente y no consumen llamadas de Biwenger."
      />

      <TeamFilters
        saleFilter={
          saleFilter
        }
        recommendationFilter={
          recommendationFilter
        }
        positionFilter={
          positionFilter
        }
        saleCounts={
          saleCounts
        }
        recommendationCounts={
          recommendationCounts
        }
        positionCounts={
          positionCounts
        }
        filteredCount={
          filteredPlayers.length
        }
        totalCount={
          players.length
        }
        onSaleFilterChange={
          setSaleFilter
        }
        onRecommendationFilterChange={
          setRecommendationFilter
        }
        onPositionFilterChange={
          setPositionFilter
        }
        onClear={
          clearFilters
        }
      />

      {filteredPlayers.length
        ? (
          <section className="team-chip-grid">
            {filteredPlayers.map(
              (
                player
              ) => (
                <TeamChip
                  player={
                    player
                  }
                  key={
                    player.id
                  }
                  onDetails={
                    onDetails
                  }
                  onSell={
                    onSell
                  }
                />
              )
            )}
          </section>
        )
        : (
          <section className="team-filter-empty">
            <span>
              ◌
            </span>

            <strong>
              No hay jugadores con estos filtros
            </strong>

            <p>
              Prueba otra posición, recomendación o estado de venta.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Limpiar filtros
            </button>
          </section>
        )}
    </div>
  );
}
