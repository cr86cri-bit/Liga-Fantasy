const FORMATIONS = [
  { name: "3-4-3", AR: 1, DF: 3, MC: 4, DL: 3 },
  { name: "3-5-2", AR: 1, DF: 3, MC: 5, DL: 2 },
  { name: "4-3-3", AR: 1, DF: 4, MC: 3, DL: 3 },
  { name: "4-4-2", AR: 1, DF: 4, MC: 4, DL: 2 },
  { name: "4-5-1", AR: 1, DF: 4, MC: 5, DL: 1 },
  { name: "5-3-2", AR: 1, DF: 5, MC: 3, DL: 2 },
  { name: "5-4-1", AR: 1, DF: 5, MC: 4, DL: 1 },
];

const STATUS_FACTOR = {
  ok: 1,
  doubt: 0.68,
  injured: 0.12,
  sanctioned: 0,
  discarded: 0.05,
  unknown: 0.5,
};

/*
|--------------------------------------------------------------------------
| FUERZA DE LOS CLUBES
|--------------------------------------------------------------------------
|
| Calculamos qué tan fuerte parece cada club usando:
|
| - puntos por partido actuales
| - rendimiento temporada anterior
| - disponibilidad de los jugadores
|
| Después normalizamos entre 0 y 100.
|
*/

export function crearFuerzaEquipos(
  playersMap,
  teamsMap
) {
  const byTeam = new Map();

  for (
    const raw of Object.values(
      playersMap || {}
    )
  ) {
    const teamId = Number(
      raw?.teamID || 0
    );

    const position =
      Number(raw?.position || 0);

    if (
      !teamId ||
      position < 1 ||
      position > 4
    ) {
      continue;
    }

    const games =
      Number(
        raw?.playedHome || 0
      ) +
      Number(
        raw?.playedAway || 0
      );

    const currentPpg =
      games > 0
        ? Number(
            raw?.points || 0
          ) / games
        : 0;

    const lastPpg =
      raw?.pointsLastSeason ==
      null
        ? currentPpg
        : Number(
            raw.pointsLastSeason ||
              0
          ) / 38;

    const availability =
      STATUS_FACTOR[
        raw?.status ||
          "unknown"
      ] ?? 0.5;

    const power =
      (
        currentPpg * 0.68 +
        lastPpg * 0.32
      ) *
      (
        0.75 +
        availability * 0.25
      );

    if (
      !byTeam.has(teamId)
    ) {
      byTeam.set(
        teamId,
        []
      );
    }

    byTeam
      .get(teamId)
      .push(power);
  }

  const rawStrengths = [];

  for (
    const [
      teamId,
      values,
    ] of byTeam.entries()
  ) {
    const top =
      [...values]
        .sort(
          (a, b) =>
            b - a
        )
        .slice(0, 11);

    const average =
      top.length
        ? top.reduce(
            (a, b) =>
              a + b,
            0
          ) / top.length
        : 0;

    rawStrengths.push({
      teamId,
      average,
    });
  }

  const values =
    rawStrengths.map(
      (item) =>
        item.average
    );

  const min =
    values.length
      ? Math.min(
          ...values
        )
      : 0;

  const max =
    values.length
      ? Math.max(
          ...values
        )
      : 1;

  const result = {};

  for (
    const item of rawStrengths
  ) {
    const normalized =
      max === min
        ? 50
        : (
            (
              item.average -
              min
            ) /
            (
              max -
              min
            )
          ) *
          100;

    result[item.teamId] =
      Math.round(
        clamp(
          normalized,
          0,
          100
        )
      );
  }

  for (
    const team of Object.values(
      teamsMap || {}
    )
  ) {
    if (
      result[
        team.id
      ] == null
    ) {
      result[
        team.id
      ] = 50;
    }
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| PRÓXIMO PARTIDO
|--------------------------------------------------------------------------
*/

export function obtenerProximoPartido(
  teamId,
  teamsMap,
  roundsMap,
  teamStrengths
) {
  const team =
    teamsMap?.[
      Number(teamId)
    ];

  const game =
    team?.nextGames?.[0];

  if (
    !team ||
    !game
  ) {
    return null;
  }

  const homeId =
    Number(
      game?.home?.id ||
        0
    );

  const awayId =
    Number(
      game?.away?.id ||
        0
    );

  const isHome =
    homeId ===
    Number(teamId);

  const opponentId =
    isHome
      ? awayId
      : homeId;

  const opponent =
    teamsMap?.[
      opponentId
    ];

  const opponentStrength =
    Number(
      teamStrengths?.[
        opponentId
      ] ?? 50
    );

  /*
   * Local = algo más fácil.
   * Visitante = algo más difícil.
   */

  const difficultyScore =
    clamp(
      opponentStrength +
        (
          isHome
            ? -7
            : 7
        ),
      0,
      100
    );

  return {
    gameId:
      Number(
        game.id || 0
      ),

    date:
      game.date
        ? Number(
            game.date
          )
        : null,

    roundId:
      Number(
        game?.round?.id ||
          0
      ),

    roundName:
      roundsMap?.[
        Number(
          game?.round?.id ||
            0
        )
      ]?.name ||
      "Próxima jornada",

    venue:
      isHome
        ? "LOCAL"
        : "VISITANTE",

    opponent: {
      id:
        opponentId,

      name:
        opponent?.name ||
        `Equipo ${opponentId}`,

      slug:
        opponent?.slug ||
        "",
    },

    difficulty: {
      score:
        Math.round(
          difficultyScore
        ),

      label:
        etiquetaDificultad(
          difficultyScore
        ),

      stars:
        estrellasDificultad(
          difficultyScore
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| ANALIZADOR 0 - 100
|--------------------------------------------------------------------------
*/

export function analizarJugador(
  player,
  context = "squad"
) {
  const recentValues =
    [0, 1, 2].map(
      (index) => {
        const value =
          player?.fitness?.[
            index
          ];

        return (
          typeof value ===
          "number"
        )
          ? value
          : 0;
      }
    );

  const recentAverage =
    recentValues.reduce(
      (a, b) =>
        a + b,
      0
    ) / 3;

  const games =
    Number(
      player.playedHome ||
        0
    ) +
    Number(
      player.playedAway ||
        0
    );

  const ppg =
    games > 0
      ? Number(
          player.points ||
            0
        ) / games
      : recentAverage;

  const lastSeasonPpg =
    player.pointsLastSeason ==
    null
      ? ppg
      : Number(
          player.pointsLastSeason ||
            0
        ) / 38;

  const formScore =
    clamp(
      (
        recentAverage /
        8
      ) *
        100,
      0,
      100
    );

  const pointsScore =
    clamp(
      (
        ppg /
        8
      ) *
        100,
      0,
      100
    );

  const trendPercent =
    player.price > 0
      ? (
          Number(
            player.priceIncrement ||
              0
          ) /
          Number(
            player.price
          )
        ) *
        100
      : 0;

  const trendScore =
    clamp(
      50 +
        trendPercent *
          18,
      0,
      100
    );

  const priceMillions =
    Number(
      player.price ||
        0
    ) /
    1_000_000;

  const pointsPerMillion =
    priceMillions > 0
      ? Number(
          player.points ||
            0
        ) /
        priceMillions
      : 0;

  const valueScore =
    clamp(
      (
        pointsPerMillion /
        6
      ) *
        100,
      0,
      100
    );

  const statusScoreMap = {
    ok: 100,
    doubt: 55,
    injured: 20,
    sanctioned: 25,
    discarded: 5,
    unknown: 45,
  };

  const statusScore =
    statusScoreMap[
      player.status
    ] ?? 45;

  const lastSeasonScore =
    clamp(
      (
        lastSeasonPpg /
        5
      ) *
        100,
      0,
      100
    );

  /*
   * Un partido fácil aumenta
   * ligeramente la valoración.
   */

  const fixtureDifficulty =
    Number(
      player
        ?.nextMatch
        ?.difficulty
        ?.score ??
        50
    );

  const fixtureScore =
    clamp(
      100 -
        fixtureDifficulty,
      0,
      100
    );

  const score =
    Math.round(
      clamp(
        formScore *
          0.27 +
          pointsScore *
            0.20 +
          trendScore *
            0.13 +
          valueScore *
            0.13 +
          statusScore *
            0.12 +
          lastSeasonScore *
            0.05 +
          fixtureScore *
            0.10,

        0,
        100
      )
    );

  return {
    score,

    recommendation:
      obtenerRecomendacion(
        player,
        score,
        context
      ),

    recentAverage:
      round1(
        recentAverage
      ),

    ppg:
      round2(ppg),

    trendPercent:
      round2(
        trendPercent
      ),

    pointsPerMillion:
      round2(
        pointsPerMillion
      ),

    breakdown: {
      form:
        Math.round(
          formScore
        ),

      points:
        Math.round(
          pointsScore
        ),

      trend:
        Math.round(
          trendScore
        ),

      value:
        Math.round(
          valueScore
        ),

      availability:
        Math.round(
          statusScore
        ),

      history:
        Math.round(
          lastSeasonScore
        ),

      fixture:
        Math.round(
          fixtureScore
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| PROYECCIÓN PRÓXIMA JORNADA
|--------------------------------------------------------------------------
*/

export function proyectarPuntos(
  player
) {
  const recent =
    [0, 1, 2].map(
      (i) =>
        typeof player
          ?.fitness?.[i] ===
        "number"
          ? player
              .fitness[i]
          : 0
    );

  const recentAvg =
    recent.reduce(
      (a, b) =>
        a + b,
      0
    ) / 3;

  const games =
    Number(
      player.playedHome ||
        0
    ) +
    Number(
      player.playedAway ||
        0
    );

  const ppg =
    games > 0
      ? Number(
          player.points ||
            0
        ) / games
      : recentAvg;

  const lastPpg =
    player.pointsLastSeason ==
    null
      ? ppg
      : Number(
          player.pointsLastSeason ||
            0
        ) / 38;

  const difficulty =
    Number(
      player
        ?.nextMatch
        ?.difficulty
        ?.score ??
        50
    );

  /*
   * Partido fácil:
   * hasta +18%.
   *
   * Partido muy duro:
   * hasta -18%.
   */

  const fixtureFactor =
    1.18 -
    (
      difficulty /
      100
    ) *
      0.36;

  const statusFactor =
    STATUS_FACTOR[
      player.status
    ] ?? 0.5;

  const analysisFactor =
    0.86 +
    (
      Number(
        player
          ?.analysis
          ?.score ||
          50
      ) /
      100
    ) *
      0.28;

  const base =
    recentAvg *
      0.48 +
    ppg *
      0.34 +
    lastPpg *
      0.18;

  return round1(
    clamp(
      base *
        fixtureFactor *
        statusFactor *
        analysisFactor,

      0,
      25
    )
  );
}

/*
|--------------------------------------------------------------------------
| MEJOR XI
|--------------------------------------------------------------------------
*/

export function generarMejorXI(
  squad,
  leagueSettings = {}
) {
  const candidates =
    (
      squad ||
      []
    ).map(
      (player) => ({
        ...player,

        projectedPoints:
          proyectarPuntos(
            player
          ),
      })
    );

  let best = null;

  for (
    const formation of FORMATIONS
  ) {
    const selected = [];

    let valid = true;

    for (
      const pos of [
        "AR",
        "DF",
        "MC",
        "DL",
      ]
    ) {
      const needed =
        formation[pos];

      const pool =
        candidates
          .filter(
            (p) =>
              p.position ===
              pos
          )
          .sort(
            (a, b) =>
              b.projectedPoints -
              a.projectedPoints
          );

      if (
        pool.length <
        needed
      ) {
        valid = false;

        break;
      }

      selected.push(
        ...pool.slice(
          0,
          needed
        )
      );
    }

    if (
      !valid ||
      selected.length !==
        11
    ) {
      continue;
    }

    const totalProjection =
      round1(
        selected.reduce(
          (
            total,
            player
          ) =>
            total +
            player.projectedPoints,

          0
        )
      );

    if (
      !best ||
      totalProjection >
        best.totalProjection
    ) {
      best = {
        formation:
          formation.name,

        players:
          selected,

        totalProjection,
      };
    }
  }

  /*
   * Fallback por si la plantilla
   * está muy incompleta.
   */

  if (!best) {
    const goalkeeper =
      candidates
        .filter(
          (p) =>
            p.position ===
            "AR"
        )
        .sort(
          (a, b) =>
            b.projectedPoints -
            a.projectedPoints
        )[0];

    const outfield =
      candidates
        .filter(
          (p) =>
            p.position !==
            "AR"
        )
        .sort(
          (a, b) =>
            b.projectedPoints -
            a.projectedPoints
        )
        .slice(0, 10);

    const players =
      [
        goalkeeper,
        ...outfield,
      ].filter(Boolean);

    best = {
      formation:
        "XI óptimo",

      players,

      totalProjection:
        round1(
          players.reduce(
            (
              a,
              p
            ) =>
              a +
              p.projectedPoints,

            0
          )
        ),
    };
  }

  const ordered =
    [...best.players].sort(
      (a, b) =>
        b.projectedPoints -
        a.projectedPoints
    );

  /*
   * CAPITÁN:
   * jugador con mayor
   * proyección.
   */

  const captain =
    leagueSettings
      ?.lineupCaptain ===
    false
      ? null
      : ordered[0] ||
        null;

  /*
   * DELANTERO ESPECIAL:
   * mejor DL del XI.
   */

  const striker =
    leagueSettings
      ?.lineupStriker ===
    false
      ? null
      : [...best.players]
          .filter(
            (p) =>
              p.position ===
              "DL"
          )
          .sort(
            (a, b) =>
              b.projectedPoints -
              a.projectedPoints
          )[0] ||
        null;

  return {
    formation:
      best.formation,

    totalProjection:
      best.totalProjection,

    captain:
      resumirXIPlayer(
        captain
      ),

    striker:
      resumirXIPlayer(
        striker
      ),

    players:
      best.players
        .sort(
          (a, b) =>
            posicionOrden(
              a.position
            ) -
              posicionOrden(
                b.position
              ) ||
            b.projectedPoints -
              a.projectedPoints
        )
        .map(
          resumirXIPlayer
        ),
  };
}

/*
|--------------------------------------------------------------------------
| RIVALES DE LA LIGA
|--------------------------------------------------------------------------
*/

export function construirRivales({
  users,
  ownershipRows,
  normalizedPlayersById,
  myUserId,
}) {
  const playersByOwner =
    new Map();

  for (
    const row of ownershipRows ||
    []
  ) {
    const ownerId =
      Number(
        row?.owner?.id ??
          row?.owner ??
          0
      );

    const playerId =
      Number(
        row?.id || 0
      );

    if (
      !ownerId ||
      !playerId
    ) {
      continue;
    }

    if (
      !playersByOwner.has(
        ownerId
      )
    ) {
      playersByOwner.set(
        ownerId,
        []
      );
    }

    playersByOwner
      .get(ownerId)
      .push(playerId);
  }

  const result = [];

  for (
    const rawUser of users ||
    []
  ) {
    const id =
      Number(
        rawUser?.id || 0
      );

    if (
      !id ||
      id ===
        Number(myUserId)
    ) {
      continue;
    }

    const ids =
      playersByOwner.get(
        id
      ) || [];

    const players =
      ids
        .map(
          (playerId) =>
            normalizedPlayersById?.[
              playerId
            ]
        )
        .filter(Boolean);

    const teamValue =
      players.reduce(
        (
          sum,
          player
        ) =>
          sum +
          Number(
            player.price ||
              0
          ),

        0
      );

    const counts =
      contarPosiciones(
        players
      );

    const strength =
      calcularFuerzaPlantilla(
        players
      );

    const visibleBalance =
      extraerBalance(
        rawUser
      );

    result.push({
      id,

      name:
        rawUser?.name ||
        `Usuario ${id}`,

      icon:
        rawUser?.icon ||
        "",

      points:
        Number(
          rawUser?.points ??
            rawUser
              ?.status
              ?.points ??
            0
        ),

      position:
        Number(
          rawUser?.position ??
            0
        ) || null,

      balance:
        visibleBalance,

      balanceVisible:
        visibleBalance !=
        null,

      teamValue,

      playerCount:
        players.length,

      positions:
        counts,

      strength,

      needs:
        detectarNecesidades(
          counts
        ),

      players:
        players.map(
          (p) => ({
            id:
              p.id,

            name:
              p.name,

            position:
              p.position,

            price:
              p.price,

            analysisScore:
              p.analysis
                ?.score ||
              0,
          })
        ),
    });
  }

  return result.sort(
    (a, b) =>
      b.strength -
      a.strength
  );
}

/*
|--------------------------------------------------------------------------
| MERCADO INTELIGENTE
|--------------------------------------------------------------------------
*/

export function enriquecerMercado(
  marketPlayers,
  rivals,
  finances
) {
  return (
    marketPlayers ||
    []
  ).map(
    (player) => {
      const price =
        Number(
          player.price ||
            0
        );

      const salePrice =
        Number(
          player.salePrice ||
            price
        );

      const listingRatio =
        price > 0
          ? salePrice /
            price
          : 1;

      const priceTag =
        etiquetaPrecio(
          listingRatio
        );

      const pointsPerMillion =
        price > 0
          ? Number(
              player.points ||
                0
            ) /
            (
              price /
              1_000_000
            )
          : 0;

      const competitors =
        estimarCompetidores(
          player,
          rivals,
          salePrice
        );

      const competitionScore =
        competitors.length
          ? Math.round(
              competitors
                .slice(0, 3)
                .reduce(
                  (
                    a,
                    c
                  ) =>
                    a +
                    c.threatScore,
                  0
                ) /
                Math.min(
                  3,
                  competitors.length
                )
            )
          : 15;

      const recommendedMaxBid =
        calcularPujaMaxima(
          player,
          {
            salePrice,

            competitionScore,

            maximumBid:
              Number(
                finances
                  ?.maximumBid ||
                  0
              ),
          }
        );

      return {
        ...player,

        marketIntelligence: {
          listedPrice:
            salePrice,

          marketValue:
            price,

          priceDifference:
            salePrice -
            price,

          priceDifferencePercent:
            round2(
              (
                listingRatio -
                1
              ) *
                100
            ),

          priceTag,

          pointsPerMillion:
            round2(
              pointsPerMillion
            ),

          recommendedMaxBid,

          shouldBid:
            recommendedMaxBid >=
              salePrice &&
            player.status !==
              "discarded",

          competitionScore,

          competitionLabel:
            etiquetaCompetencia(
              competitionScore
            ),

          competitors:
            competitors.slice(
              0,
              3
            ),
        },
      };
    }
  );
}

/*
|--------------------------------------------------------------------------
| ESTIMAR RIVALES INTERESADOS
|--------------------------------------------------------------------------
*/

function estimarCompetidores(
  player,
  rivals,
  salePrice
) {
  const targetCounts = {
    AR: 2,
    DF: 5,
    MC: 5,
    DL: 3,
  };

  return (
    rivals ||
    []
  )
    .filter(
      (rival) =>
        Number(rival.id) !==
        Number(
          player.ownerId ||
            0
        )
    )
    .map(
      (rival) => {
        const currentCount =
          Number(
            rival.positions?.[
              player.position
            ] || 0
          );

        const target =
          targetCounts[
            player.position
          ] || 3;

        /*
         * Si tiene pocos jugadores
         * de esa posición, mayor
         * posibilidad de interés.
         */

        const needScore =
          clamp(
            (
              (
                target -
                currentCount +
                1
              ) /
              target
            ) *
              100,

            10,
            100
          );

        const samePosition =
          (
            rival.players ||
            []
          ).filter(
            (p) =>
              p.position ===
              player.position
          );

        const avgPositionScore =
          samePosition.length
            ? samePosition.reduce(
                (
                  a,
                  p
                ) =>
                  a +
                  Number(
                    p.analysisScore ||
                      0
                  ),

                0
              ) /
              samePosition.length
            : 35;

        const qualityUpgrade =
          clamp(
            50 +
              (
                (
                  player
                    .analysis
                    ?.score ||
                  50
                ) -
                avgPositionScore
              ) *
                2.1,

            0,
            100
          );

        /*
         * En nuestra liga el saldo
         * rival está oculto.
         *
         * Si algún día pasa a visible,
         * el algoritmo lo utilizará.
         */

        let affordability =
          50;

        if (
          rival.balanceVisible
        ) {
          affordability =
            rival.balance >=
            salePrice
              ? clamp(
                  65 +
                    (
                      (
                        rival.balance -
                        salePrice
                      ) /
                      Math.max(
                        salePrice,
                        1
                      )
                    ) *
                      25,

                  65,
                  100
                )
              : clamp(
                  (
                    rival.balance /
                    Math.max(
                      salePrice,
                      1
                    )
                  ) *
                    60,

                  0,
                  60
                );
        }

        const squadRoom =
          clamp(
            90 -
              Math.max(
                0,
                rival.playerCount -
                  15
              ) *
                8,

            25,
            90
          );

        const threatScore =
          Math.round(
            needScore *
              0.42 +
              qualityUpgrade *
                0.30 +
              affordability *
                0.18 +
              squadRoom *
                0.10
          );

        return {
          userId:
            rival.id,

          name:
            rival.name,

          threatScore,

          label:
            amenazaLabel(
              threatScore
            ),

          reason:
            currentCount <
            target
              ? `Necesita ${player.position}`
              : (
                    player
                      .analysis
                      ?.score ||
                    0
                  ) >
                  avgPositionScore +
                    10
                ? `Mejora clara en ${player.position}`
                : "Interés posible",
        };
      }
    )
    .sort(
      (a, b) =>
        b.threatScore -
        a.threatScore
    );
}

/*
|--------------------------------------------------------------------------
| PUJA MÁXIMA
|--------------------------------------------------------------------------
*/

function calcularPujaMaxima(
  player,
  {
    salePrice,
    competitionScore,
    maximumBid,
  }
) {
  const price =
    Number(
      player.price ||
        salePrice ||
        0
    );

  const score =
    Number(
      player.analysis?.score ||
        50
    );

  const trendPct =
    price > 0
      ? Number(
          player.priceIncrement ||
            0
        ) / price
      : 0;

  const difficulty =
    Number(
      player
        ?.nextMatch
        ?.difficulty
        ?.score ??
        50
    );

  /*
   * 0 puntos de análisis:
   * aproximadamente 80% VM.
   *
   * 100 puntos:
   * aproximadamente 126% VM.
   */

  const scoreMultiplier =
    0.80 +
    (
      score /
      100
    ) *
      0.46;

  const trendMultiplier =
    clamp(
      1 +
        trendPct *
          10,

      0.94,
      1.07
    );

  const fixtureMultiplier =
    clamp(
      1.05 -
        (
          difficulty /
          100
        ) *
          0.10,

      0.95,
      1.05
    );

  const competitionMultiplier =
    1 +
    (
      clamp(
        competitionScore,
        0,
        100
      ) /
      100
    ) *
      0.08;

  const statusMultiplier =
    {
      ok: 1,
      doubt: 0.88,
      injured: 0.70,
      sanctioned: 0.80,
      discarded: 0.45,
      unknown: 0.82,
    }[
      player.status
    ] ?? 0.82;

  let recommended =
    price *
    scoreMultiplier *
    trendMultiplier *
    fixtureMultiplier *
    competitionMultiplier *
    statusMultiplier;

  /*
   * Si aparece por debajo
   * del valor de mercado y
   * es un buen jugador:
   * mínimo intentar superar
   * ligeramente el precio.
   */

  if (
    salePrice <
      price * 0.95 &&
    score >= 55
  ) {
    recommended =
      Math.max(
        recommended,
        salePrice * 1.03
      );
  }

  /*
   * Nunca recomendamos superar
   * la puja máxima real que
   * permite Biwenger.
   */

  if (
    maximumBid > 0
  ) {
    recommended =
      Math.min(
        recommended,
        maximumBid
      );
  }

  return redondear10k(
    Math.max(
      0,
      recommended
    )
  );
}

/*
|--------------------------------------------------------------------------
| RECOMENDACIÓN
|--------------------------------------------------------------------------
*/

function obtenerRecomendacion(
  player,
  score,
  context
) {
  if (
    context === "market"
  ) {
    if (
      player.status !==
      "ok"
    ) {
      return "VIGILAR";
    }

    return score >= 68
      ? "FICHAR"
      : "VIGILAR";
  }

  if (
    player.status ===
    "discarded"
  ) {
    return "VENDER";
  }

  if (
    [
      "injured",
      "doubt",
      "sanctioned",
    ].includes(
      player.status
    )
  ) {
    return "VIGILAR";
  }

  if (
    score >= 58
  ) {
    return "MANTENER";
  }

  if (
    score < 35
  ) {
    return "VENDER";
  }

  return "VIGILAR";
}

/*
|--------------------------------------------------------------------------
| ETIQUETAS
|--------------------------------------------------------------------------
*/

function etiquetaPrecio(
  ratio
) {
  if (
    ratio <= 0.95
  ) {
    return "BARATO";
  }

  if (
    ratio <= 1.07
  ) {
    return "JUSTO";
  }

  if (
    ratio <= 1.18
  ) {
    return "CARO";
  }

  return "MUY CARO";
}

function etiquetaCompetencia(
  score
) {
  if (
    score >= 75
  ) {
    return "ALTA";
  }

  if (
    score >= 50
  ) {
    return "MEDIA";
  }

  return "BAJA";
}

function amenazaLabel(
  score
) {
  if (
    score >= 75
  ) {
    return "Alta";
  }

  if (
    score >= 50
  ) {
    return "Media";
  }

  return "Baja";
}

function etiquetaDificultad(
  score
) {
  if (
    score <= 32
  ) {
    return "FÁCIL";
  }

  if (
    score <= 55
  ) {
    return "MEDIA";
  }

  if (
    score <= 74
  ) {
    return "DIFÍCIL";
  }

  return "MUY DIFÍCIL";
}

function estrellasDificultad(
  score
) {
  if (
    score <= 20
  ) {
    return 1;
  }

  if (
    score <= 40
  ) {
    return 2;
  }

  if (
    score <= 60
  ) {
    return 3;
  }

  if (
    score <= 80
  ) {
    return 4;
  }

  return 5;
}

/*
|--------------------------------------------------------------------------
| UTILIDADES RIVALES
|--------------------------------------------------------------------------
*/

function contarPosiciones(
  players
) {
  const result = {
    AR: 0,
    DF: 0,
    MC: 0,
    DL: 0,
  };

  for (
    const player of players ||
    []
  ) {
    if (
      result[
        player.position
      ] != null
    ) {
      result[
        player.position
      ] += 1;
    }
  }

  return result;
}

function detectarNecesidades(
  counts
) {
  const targets = {
    AR: 2,
    DF: 5,
    MC: 5,
    DL: 3,
  };

  return Object
    .entries(targets)
    .map(
      ([
        position,
        target,
      ]) => ({
        position,

        current:
          Number(
            counts?.[
              position
            ] || 0
          ),

        target,

        missing:
          Math.max(
            0,

            target -
              Number(
                counts?.[
                  position
                ] || 0
              )
          ),
      })
    )
    .filter(
      (item) =>
        item.missing >
        0
    )
    .sort(
      (a, b) =>
        b.missing -
        a.missing
    );
}

function calcularFuerzaPlantilla(
  players
) {
  if (
    !players?.length
  ) {
    return 0;
  }

  const top =
    [...players]
      .sort(
        (a, b) =>
          Number(
            b.analysis
              ?.score ||
              0
          ) -
          Number(
            a.analysis
              ?.score ||
              0
          )
      )
      .slice(0, 11);

  return Math.round(
    top.reduce(
      (
        a,
        p
      ) =>
        a +
        Number(
          p.analysis
            ?.score ||
            0
        ),

      0
    ) /
      top.length
  );
}

function extraerBalance(
  user
) {
  const candidates = [
    user?.balance,
    user?.status?.balance,
  ];

  for (
    const value of candidates
  ) {
    if (
      value !==
        undefined &&
      value !== null &&
      Number.isFinite(
        Number(value)
      )
    ) {
      return Number(value);
    }
  }

  return null;
}

function resumirXIPlayer(
  player
) {
  if (!player) {
    return null;
  }

  return {
    id:
      player.id,

    name:
      player.name,

    position:
      player.position,

    teamName:
      player.teamName,

    photoUrl:
      player.photoUrl,

    projectedPoints:
      player.projectedPoints,

    nextMatch:
      player.nextMatch,

    status:
      player.status,

    analysisScore:
      player.analysis?.score ||
      0,
  };
}

function posicionOrden(
  position
) {
  return {
    AR: 1,
    DF: 2,
    MC: 3,
    DL: 4,
  }[
    position
  ] || 9;
}

function redondear10k(
  value
) {
  return (
    Math.round(
      Number(
        value || 0
      ) /
        10_000
    ) *
    10_000
  );
}

function round1(
  value
) {
  return (
    Math.round(
      Number(
        value || 0
      ) *
        10
    ) /
    10
  );
}

function round2(
  value
) {
  return (
    Math.round(
      Number(
        value || 0
      ) *
        100
    ) /
    100
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      Number(
        value || 0
      ),
      min
    ),
    max
  );
}