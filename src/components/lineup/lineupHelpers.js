const LINEUP_FORMATIONS = [
  { name: "3-4-3", AR: 1, DF: 3, MC: 4, DL: 3 },
  { name: "3-5-2", AR: 1, DF: 3, MC: 5, DL: 2 },
  { name: "4-3-3", AR: 1, DF: 4, MC: 3, DL: 3 },
  { name: "4-4-2", AR: 1, DF: 4, MC: 4, DL: 2 },
  { name: "4-5-1", AR: 1, DF: 4, MC: 5, DL: 1 },
  { name: "5-3-2", AR: 1, DF: 5, MC: 3, DL: 2 },
  { name: "5-4-1", AR: 1, DF: 5, MC: 4, DL: 1 },
];

function lineupRoleId(
  lineup,
  role
) {
  const value =
    lineup?.[
      role
    ];

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Number(
      value.id ||
      0
    );
  }

  return Number(
    value ||
    0
  );
}

function lineupPlayerIds(
  lineup
) {
  return (
    lineup
      ?.playersID ||
    []
  )
    .map(Number)
    .filter(
      (id) =>
        Number.isInteger(
          id
        ) &&
        id >
        0
    );
}

/*
 * Biwenger no pinta los jugadores de una línea usando
 * playersID directamente de izquierda a derecha.
 *
 * El patrón visual observado es "del centro hacia fuera":
 *
 * 2 jugadores:  [1, 0]
 * 3 jugadores:  [2, 0, 1]
 * 4 jugadores:  [3, 1, 0, 2]
 * 5 jugadores:  [4, 2, 0, 1, 3]
 *
 * Esto explica exactamente el caso actual:
 * - DL: Hugo González | Hugo Duro
 * - MC: Álex | Mendoza | Neto | Marc
 * - DF: Angeliño | Logan | Vivian | Boiro
 *
 * En vez de dejar una tabla fija calculamos la posición
 * virtual de cada slot y ordenamos de izquierda a derecha.
 */
function biwengerSlotOffset(
  index,
  total
) {
  if (
    total <=
    1
  ) {
    return 0;
  }

  if (
    total %
      2 ===
    1
  ) {
    if (
      index ===
      0
    ) {
      return 0;
    }

    const step =
      Math.ceil(
        index /
        2
      );

    return (
      index %
        2 ===
      1
        ? step
        : -step
    );
  }

  const step =
    Math.floor(
      index /
      2
    ) +
    0.5;

  return (
    index %
      2 ===
    0
      ? step
      : -step
  );
}

function orderBiwengerLineForPitch(
  players
) {
  const list =
    [
      ...(
        players ||
        []
      ),
    ];

  if (
    list.length <=
    1
  ) {
    return list;
  }

  return list
    .map(
      (
        player,
        index
      ) => ({
        player,

        x:
          biwengerSlotOffset(
            index,
            list.length
          ),
      })
    )
    .sort(
      (
        left,
        right
      ) =>
        left.x -
        right.x
    )
    .map(
      (item) =>
        item.player
    );
}

function lineupAvailabilityInfo(
  player
) {
  const status =
    String(
      player?.status ||
      "unknown"
    ).toLowerCase();

  const map = {
    injured: {
      label:
        "Lesionado",

      shortLabel:
        "LESIONADO",

      icon:
        "✚",

      className:
        "injured",
    },

    doubt: {
      label:
        "Duda",

      shortLabel:
        "DUDA",

      icon:
        "?",

      className:
        "doubt",
    },

    sanctioned: {
      label:
        "Sancionado",

      shortLabel:
        "SANCIONADO",

      icon:
        "!",

      className:
        "sanctioned",
    },

    discarded: {
      label:
        "Descartado",

      shortLabel:
        "DESCARTADO",

      icon:
        "×",

      className:
        "discarded",
    },
  };

  return (
    map[
      status
    ] ||
    null
  );
}

function buildPositionQualityMap(
  squad
) {
  const groups =
    new Map();

  for (
    const player of
      squad ||
      []
  ) {
    const position =
      player?.position;

    if (
      ![
        "AR",
        "DF",
        "MC",
        "DL",
      ].includes(
        position
      )
    ) {
      continue;
    }

    if (
      !groups.has(
        position
      )
    ) {
      groups.set(
        position,
        []
      );
    }

    groups.get(
      position
    ).push(
      player
    );
  }

  const result =
    new Map();

  for (
    const [
      position,
      players,
    ] of
      groups.entries()
  ) {
    const sorted =
      [
        ...players,
      ].sort(
        (
          left,
          right
        ) => {
          const scoreDiff =
            Number(
              right
                ?.analysis
                ?.score ||
              0
            ) -
            Number(
              left
                ?.analysis
                ?.score ||
              0
            );

          if (
            scoreDiff !==
            0
          ) {
            return scoreDiff;
          }

          return (
            Number(
              right
                ?.analysis
                ?.ppg ||
              0
            ) -
            Number(
              left
                ?.analysis
                ?.ppg ||
              0
            )
          );
        }
      );

    sorted.forEach(
      (
        player,
        index
      ) => {
        const score =
          Number(
            player
              ?.analysis
              ?.score ||
            0
          );

        const rank =
          index +
          1;

        const total =
          sorted.length;

        let label =
          "A mejorar";

        let shortLabel =
          "BAJO";

        let className =
          "low";

        if (
          score >=
          68
        ) {
          label =
            "Muy bueno";

          shortLabel =
            "MUY BUENO";

          className =
            "great";
        } else if (
          score >=
          55
        ) {
          label =
            "Bueno";

          shortLabel =
            "BUENO";

          className =
            "good";
        } else if (
          score >=
          42
        ) {
          label =
            "Correcto";

          shortLabel =
            "CORRECTO";

          className =
            "average";
        }

        /*
         * Ser el mejor jugador de su posición en la plantilla
         * mejora como máximo un escalón la etiqueta, pero nunca
         * transforma un análisis muy bajo en "Muy bueno".
         */
        if (
          rank ===
            1 &&
          total >
            1 &&
          score >=
            50 &&
          className ===
            "average"
        ) {
          label =
            "Bueno";

          shortLabel =
            "BUENO";

          className =
            "good";
        }

        result.set(
          Number(
            player.id
          ),
          {
            position,
            rank,
            total,
            score,
            label,
            shortLabel,
            className,
          }
        );
      }
    );
  }

  return result;
}

function sortLineupCandidates(
  players,
  bestXI
) {
  const projectedMap =
    new Map(
      (
        bestXI?.players ||
        []
      ).map(
        (player) => [
          Number(
            player.id
          ),
          Number(
            player.projectedPoints ||
            0
          ),
        ]
      )
    );

  return [
    ...players,
  ].sort(
    (a, b) => {
      const projectedDiff =
        Number(
          projectedMap.get(
            Number(
              b.id
            )
          ) ||
          0
        ) -
        Number(
          projectedMap.get(
            Number(
              a.id
            )
          ) ||
          0
        );

      if (
        projectedDiff !==
        0
      ) {
        return projectedDiff;
      }

      const analysisDiff =
        Number(
          b.analysis
            ?.score ||
          0
        ) -
        Number(
          a.analysis
            ?.score ||
          0
        );

      if (
        analysisDiff !==
        0
      ) {
        return analysisDiff;
      }

      return (
        Number(
          b.points ||
          0
        ) -
        Number(
          a.points ||
          0
        )
      );
    }
  );
}

function buildLineupForFormation({
  squad,
  formation,
  preferredIds = [],
  bestXI,
}) {
  const config =
    LINEUP_FORMATIONS.find(
      (item) =>
        item.name ===
        formation
    ) ||
    LINEUP_FORMATIONS[3];

  const available =
    (
      squad ||
      []
    ).filter(
      (player) =>
        !player.isForSale
    );

  const preferredOrder =
    new Map(
      (
        preferredIds ||
        []
      ).map(
        (
          id,
          index
        ) => [
          Number(
            id
          ),
          index,
        ]
      )
    );

  const selected =
    [];

  for (
    const position of
      [
        "AR",
        "DF",
        "MC",
        "DL",
      ]
  ) {
    const needed =
      Number(
        config[
          position
        ] ||
        0
      );

    const pool =
      sortLineupCandidates(
        available.filter(
          (player) =>
            player.position ===
            position
        ),
        bestXI
      );

    /*
     * Si un jugador ya estaba en la alineación real,
     * respetamos su orden horizontal dentro de la línea.
     */
    const preferredPlayers =
      pool
        .filter(
          (player) =>
            preferredOrder.has(
              Number(
                player.id
              )
            )
        )
        .sort(
          (a, b) =>
            preferredOrder.get(
              Number(
                a.id
              )
            ) -
            preferredOrder.get(
              Number(
                b.id
              )
            )
        );

    const rest =
      pool.filter(
        (player) =>
          !preferredOrder.has(
            Number(
              player.id
            )
          )
      );

    selected.push(
      ...[
        ...preferredPlayers,
        ...rest,
      ].slice(
        0,
        needed
      )
    );
  }

  return selected.map(
    (player) =>
      Number(
        player.id
      )
  );
}

function orderedLineupIds(
  selectedIds,
  squad
) {
  const playerById =
    new Map(
      (
        squad ||
        []
      ).map(
        (player) => [
          Number(
            player.id
          ),
          player,
        ]
      )
    );

  const byPosition = {
    AR: [],
    DF: [],
    MC: [],
    DL: [],
  };

  /*
   * MUY IMPORTANTE:
   * recorremos selectedIds, no squad.
   * Así el orden izquierda→derecha escogido en el XI
   * se conserva dentro de cada línea.
   */
  for (
    const rawId of
      selectedIds ||
      []
  ) {
    const id =
      Number(
        rawId
      );

    const player =
      playerById.get(
        id
      );

    if (
      player &&
      byPosition[
        player.position
      ]
    ) {
      byPosition[
        player.position
      ].push(
        id
      );
    }
  }

  return [
    ...byPosition.AR,
    ...byPosition.DF,
    ...byPosition.MC,
    ...byPosition.DL,
  ];
}

function playersInLineupOrder(
  selectedIds,
  squad
) {
  const playerById =
    new Map(
      (
        squad ||
        []
      ).map(
        (player) => [
          Number(
            player.id
          ),
          player,
        ]
      )
    );

  return (
    selectedIds ||
    []
  )
    .map(
      (id) =>
        playerById.get(
          Number(
            id
          )
        )
    )
    .filter(Boolean);
}


export { LINEUP_FORMATIONS, lineupRoleId, lineupPlayerIds, biwengerSlotOffset, orderBiwengerLineForPitch, lineupAvailabilityInfo, buildPositionQualityMap, sortLineupCandidates, buildLineupForFormation, orderedLineupIds, playersInLineupOrder };
