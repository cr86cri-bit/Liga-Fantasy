import { useEffect, useMemo, useState } from "react";
import { Position, PlayerPhoto, TeamCrest } from "../ui/PlayerUI.jsx";
import { LINEUP_FORMATIONS, lineupRoleId, lineupPlayerIds, orderBiwengerLineForPitch, buildPositionQualityMap, buildLineupForFormation, orderedLineupIds, playersInLineupOrder, lineupAvailabilityInfo } from "./lineupHelpers.js";
import { LineupConfirmModal } from "./LineupConfirmModal.jsx";
import { PitchLine } from "./PitchLine.jsx";

function BestXI({
  bestXI,
  squad,
  savedLineup,
  lineupSettings,
  onPlayerDetails,
  onSaveLineup,
  saving,
  saveError,
}) {
  const fullSquad =
    squad ||
    [];

  const editableSquad =
    useMemo(
      () =>
        fullSquad.filter(
          (player) =>
            !player.isForSale
        ),
      [
        fullSquad,
      ]
    );

  const lineupReady =
    savedLineup !==
      undefined &&
    savedLineup !==
      null;

  const savedFormation =
    LINEUP_FORMATIONS.some(
      (item) =>
        item.name ===
        savedLineup?.type
    )
      ? savedLineup.type
      : null;

  const recommendedFormation =
    LINEUP_FORMATIONS.some(
      (item) =>
        item.name ===
        bestXI?.formation
    )
      ? bestXI.formation
      : "4-4-2";

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    formation,
    setFormation,
  ] = useState(
    savedFormation ||
    recommendedFormation
  );

  const [
    selectedIds,
    setSelectedIds,
  ] = useState([]);

  const [
    captainId,
    setCaptainId,
  ] = useState(0);

  const [
    strikerId,
    setStrikerId,
  ] = useState(0);

  const [
    confirmOpen,
    setConfirmOpen,
  ] = useState(false);

  /*
   * Vista normal:
   * la fuente de verdad es Biwenger, NO nuestro algoritmo.
   *
   * Antes reconstruíamos el XI recomendado aunque Biwenger ya
   * hubiera devuelto playersID. Eso provocaba:
   * - orden horizontal distinto;
   * - capitán inventado por el algoritmo;
   * - ariete inventado por el algoritmo.
   */
  useEffect(() => {
    if (editing) {
      return;
    }

    const currentIds =
      lineupPlayerIds(
        savedLineup
      );

    const nextFormation =
      savedFormation ||
      recommendedFormation;

    setFormation(
      nextFormation
    );

    if (
      currentIds.length ===
      11
    ) {
      /*
       * Guardamos EXACTAMENTE el orden recibido en playersID.
       * Al filtrar posteriormente por posición se conserva el
       * orden izquierda→derecha dentro de cada línea.
       */
      setSelectedIds(
        currentIds
      );
    } else {
      setSelectedIds(
        buildLineupForFormation({
          squad:
            editableSquad,

          formation:
            nextFormation,

          preferredIds:
            (
              bestXI?.players ||
              []
            ).map(
              (player) =>
                Number(
                  player.id
                )
            ),

          bestXI,
        })
      );
    }

    /*
     * Cero significa realmente "sin capitán / sin ariete".
     * Ya no usamos fallback del Mejor XI.
     */
    setCaptainId(
      lineupRoleId(
        savedLineup,
        "captain"
      )
    );

    setStrikerId(
      lineupRoleId(
        savedLineup,
        "striker"
      )
    );
  }, [
    editing,
    savedLineup,
    savedFormation,
    recommendedFormation,
    editableSquad,
    bestXI,
  ]);

  const config =
    LINEUP_FORMATIONS.find(
      (item) =>
        item.name ===
        formation
    ) ||
    LINEUP_FORMATIONS[3];

  const selectedPlayers =
    useMemo(
      () =>
        playersInLineupOrder(
          selectedIds,
          fullSquad
        ),
      [
        selectedIds,
        fullSquad,
      ]
    );


const positionQualityMap =
  useMemo(
    () =>
      buildPositionQualityMap(
        fullSquad
      ),
    [
      fullSquad,
    ]
  );

const lineupWarnings =
  useMemo(
    () =>
      selectedPlayers
        .map(
          (player) => ({
            player,

            availability:
              lineupAvailabilityInfo(
                player
              ),
          })
        )
        .filter(
          (item) =>
            Boolean(
              item.availability
            )
        ),
    [
      selectedPlayers,
    ]
  );

  const counts =
    useMemo(
      () => ({
        AR:
          selectedPlayers.filter(
            (player) =>
              player.position ===
              "AR"
          ).length,

        DF:
          selectedPlayers.filter(
            (player) =>
              player.position ===
              "DF"
          ).length,

        MC:
          selectedPlayers.filter(
            (player) =>
              player.position ===
              "MC"
          ).length,

        DL:
          selectedPlayers.filter(
            (player) =>
              player.position ===
              "DL"
          ).length,
      }),
      [
        selectedPlayers,
      ]
    );

  const valid =
    selectedIds.length ===
      11 &&
    [
      "AR",
      "DF",
      "MC",
      "DL",
    ].every(
      (position) =>
        counts[
          position
        ] ===
        Number(
          config[
            position
          ] ||
          0
        )
    ) &&
    selectedPlayers.every(
      (player) =>
        !player.isForSale
    );

  const currentCaptain =
    selectedPlayers.find(
      (player) =>
        Number(
          player.id
        ) ===
        Number(
          captainId
        )
    ) ||
    null;

  const currentStriker =
    selectedPlayers.find(
      (player) =>
        Number(
          player.id
        ) ===
        Number(
          strikerId
        )
    ) ||
    null;

  const strikerEnabled =
    lineupSettings
      ?.lineupStriker !==
    false;

  const startEditing =
    () => {
      const currentIds =
        lineupPlayerIds(
          savedLineup
        );

      const currentAvailableIds =
        currentIds.filter(
          (id) =>
            editableSquad.some(
              (player) =>
                Number(
                  player.id
                ) ===
                Number(
                  id
                )
            )
        );

      /*
       * Si un jugador real está en venta, al entrar a editar
       * se reemplaza por el mejor candidato disponible.
       * La vista normal continúa representando Biwenger tal cual.
       */
      const nextIds =
        buildLineupForFormation({
          squad:
            editableSquad,

          formation:
            savedFormation ||
            recommendedFormation,

          preferredIds:
            currentAvailableIds,

          bestXI,
        });

      setFormation(
        savedFormation ||
        recommendedFormation
      );

      setSelectedIds(
        nextIds
      );

      const savedCaptain =
        lineupRoleId(
          savedLineup,
          "captain"
        );

      const savedStriker =
        lineupRoleId(
          savedLineup,
          "striker"
        );

      setCaptainId(
        nextIds.includes(
          savedCaptain
        )
          ? savedCaptain
          : 0
      );

      setStrikerId(
        nextIds.includes(
          savedStriker
        )
          ? savedStriker
          : 0
      );

      setEditing(
        true
      );
    };

  const changeFormation =
    (nextFormation) => {
      setFormation(
        nextFormation
      );

      const nextIds =
        buildLineupForFormation({
          squad:
            editableSquad,

          formation:
            nextFormation,

          preferredIds:
            selectedIds,

          bestXI,
        });

      setSelectedIds(
        nextIds
      );

      if (
        captainId &&
        !nextIds.includes(
          Number(
            captainId
          )
        )
      ) {
        setCaptainId(
          0
        );
      }

      if (
        strikerId &&
        !nextIds.includes(
          Number(
            strikerId
          )
        )
      ) {
        setStrikerId(
          0
        );
      }
    };

  const useRecommendation =
    () => {
      const recommendationIds =
        (
          bestXI?.players ||
          []
        ).map(
          (player) =>
            Number(
              player.id
            )
        );

      const nextIds =
        buildLineupForFormation({
          squad:
            editableSquad,

          formation:
            recommendedFormation,

          preferredIds:
            recommendationIds,

          bestXI,
        });

      setFormation(
        recommendedFormation
      );

      setSelectedIds(
        nextIds
      );

      const recommendedCaptain =
        Number(
          bestXI
            ?.captain
            ?.id ||
          0
        );

      setCaptainId(
        nextIds.includes(
          recommendedCaptain
        )
          ? recommendedCaptain
          : 0
      );

      const recommendedStriker =
        nextIds
          .map(
            (id) =>
              editableSquad.find(
                (player) =>
                  Number(
                    player.id
                  ) ===
                  Number(
                    id
                  )
              )
          )
          .filter(
            (player) =>
              player
                ?.position ===
              "DL"
          )
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
          )[0];

      setStrikerId(
        strikerEnabled
          ? Number(
              recommendedStriker
                ?.id ||
              0
            )
          : 0
      );
    };

  const togglePlayer =
    (player) => {
      if (
        player.isForSale
      ) {
        return;
      }

      const id =
        Number(
          player.id
        );

      const exists =
        selectedIds.includes(
          id
        );

      if (exists) {
        setSelectedIds(
          (current) =>
            current.filter(
              (item) =>
                item !==
                id
            )
        );

        if (
          Number(
            captainId
          ) ===
          id
        ) {
          setCaptainId(
            0
          );
        }

        if (
          Number(
            strikerId
          ) ===
          id
        ) {
          setStrikerId(
            0
          );
        }

        return;
      }

      const needed =
        Number(
          config[
            player.position
          ] ||
          0
        );

      const currentCount =
        counts[
          player.position
        ] ||
        0;

      if (
        currentCount >=
        needed
      ) {
        return;
      }

      /*
       * Añadimos al final de su línea, no al final global.
       * Así mantenemos un orden estable para playersID.
       */
      setSelectedIds(
        (current) => {
          const playerById =
            new Map(
              fullSquad.map(
                (item) => [
                  Number(
                    item.id
                  ),
                  item,
                ]
              )
            );

          const positionOrder = {
            AR: 0,
            DF: 1,
            MC: 2,
            DL: 3,
          };

          return [
            ...current,
            id,
          ].sort(
            (
              leftId,
              rightId
            ) => {
              const left =
                playerById.get(
                  Number(
                    leftId
                  )
                );

              const right =
                playerById.get(
                  Number(
                    rightId
                  )
                );

              return (
                Number(
                  positionOrder[
                    left
                      ?.position
                  ] ??
                  99
                ) -
                Number(
                  positionOrder[
                    right
                      ?.position
                  ] ??
                  99
                )
              );
            }
          );
        }
      );
    };

  const pitchPlayers =
    selectedPlayers.map(
      (player) => ({
        ...player,

        projectedPoints:
          bestXI
            ?.players
            ?.find(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  player.id
                )
            )
            ?.projectedPoints ||
          0,
      })
    );

  /*
   * playersID utiliza el orden interno de slots de Biwenger.
   * Cada línea se transforma al orden visual izquierda→derecha
   * que emplea el campo de Biwenger.
   */
  const groups = {
    DL:
      orderBiwengerLineForPitch(
        pitchPlayers.filter(
          (player) =>
            player.position ===
            "DL"
        )
      ),

    MC:
      orderBiwengerLineForPitch(
        pitchPlayers.filter(
          (player) =>
            player.position ===
            "MC"
        )
      ),

    DF:
      orderBiwengerLineForPitch(
        pitchPlayers.filter(
          (player) =>
            player.position ===
            "DF"
        )
      ),

    AR:
      orderBiwengerLineForPitch(
        pitchPlayers.filter(
          (player) =>
            player.position ===
            "AR"
        )
      ),
  };

  const roleState = {
    captain:
      currentCaptain,

    striker:
      currentStriker,
  };

  const currentLineupComplete =
    lineupPlayerIds(
      savedLineup
    ).length ===
    11;

  if (
    !bestXI?.players?.length &&
    !selectedPlayers.length
  ) {
    return (
      <div className="empty-state">
        No se pudo obtener una alineación.
      </div>
    );
  }

  return (
    <main>
      <div className="xi-topbar xi-topbar-editable">
        <div>
          <span className="section-label">
            {editing
              ? "EDITOR DE ALINEACIÓN"
              : "ALINEACIÓN ACTUAL · BIWENGER"}
          </span>

          <h2>
            Formación {formation}
          </h2>

          <p>
            {editing
              ? `${selectedIds.length}/11 titulares seleccionados`
              : currentLineupComplete
                ? "El campo refleja los 11 titulares y roles guardados actualmente en Biwenger."
                : "Biwenger no devolvió 11 titulares completos; se muestra una propuesta temporal."}
          </p>
        </div>

        <div className="xi-header-actions">
          {!editing ? (
            <button
              type="button"
              className="xi-edit-button"
              disabled={
                !lineupReady
              }
              onClick={
                startEditing
              }
            >
              {lineupReady
                ? "✏ Editar mi XI"
                : "⏳ Cargando alineación…"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="xi-secondary-button"
                onClick={
                  useRecommendation
                }
              >
                ✨ Usar recomendado
              </button>

              <button
                type="button"
                className="xi-secondary-button"
                onClick={() =>
                  setEditing(
                    false
                  )
                }
              >
                Cancelar edición
              </button>
            </>
          )}
        </div>

        <div className="xi-specials xi-specials-sync">
          <div>
            <span>
              👑 Capitán
            </span>

            <strong>
              {currentCaptain?.name ||
                "Sin capitán"}
            </strong>
          </div>

          <div>
            <span>
              ⚽ Ariete
            </span>

            <strong>
              {strikerEnabled
                ? currentStriker?.name ||
                  "Sin ariete"
                : "Desactivado"}
            </strong>
          </div>

          <div>
            <span>
              🏷 En venta
            </span>

            <strong>
              {
                fullSquad.filter(
                  (player) =>
                    player.isForSale
                ).length
              } jugador(es)
            </strong>
          </div>
        </div>
      </div>

      {editing && (
        <>
          <section className="lineup-editor-controls lineup-editor-controls-sync">
            <div className="formation-editor-block">
              <span className="section-label">
                FORMACIÓN
              </span>

              <div className="formation-buttons">
                {LINEUP_FORMATIONS.map(
                  (item) => (
                    <button
                      type="button"
                      key={
                        item.name
                      }
                      className={
                        item.name ===
                        formation
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        changeFormation(
                          item.name
                        )
                      }
                    >
                      {item.name}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="lineup-role-selectors">
              <label className="lineup-captain-select">
                <span>
                  Capitán
                </span>

                <select
                  value={
                    captainId
                  }
                  onChange={
                    (event) =>
                      setCaptainId(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                  }
                >
                  <option value="0">
                    Sin capitán
                  </option>

                  {selectedPlayers.map(
                    (player) => (
                      <option
                        key={
                          player.id
                        }
                        value={
                          player.id
                        }
                      >
                        {player.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              {strikerEnabled && (
                <label className="lineup-captain-select">
                  <span>
                    Ariete
                  </span>

                  <select
                    value={
                      strikerId
                    }
                    onChange={
                      (event) =>
                        setStrikerId(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                    }
                  >
                    <option value="0">
                      Sin ariete
                    </option>

                    {selectedPlayers
                      .filter(
                        (player) =>
                          player.position ===
                          "DL"
                      )
                      .map(
                        (player) => (
                          <option
                            key={
                              player.id
                            }
                            value={
                              player.id
                            }
                          >
                            {player.name}
                          </option>
                        )
                      )}
                  </select>
                </label>
              )}
            </div>
          </section>

          <div className="lineup-position-summary">
            {[
              "AR",
              "DF",
              "MC",
              "DL",
            ].map(
              (position) => (
                <div
                  key={
                    position
                  }
                  className={
                    counts[
                      position
                    ] ===
                    Number(
                      config[
                        position
                      ] ||
                      0
                    )
                      ? "complete"
                      : ""
                  }
                >
                  <Position
                    position={
                      position
                    }
                  />

                  <span>
                    {counts[
                      position
                    ] || 0}
                    /
                    {config[
                      position
                    ]}
                  </span>
                </div>
              )
            )}
          </div>
        </>
      )}


{lineupWarnings.length >
  0 && (
  <section className="lineup-health-alert">
    <div className="lineup-health-alert-head">
      <span>
        ⚠
      </span>

      <div>
        <strong>
          Atención con tu alineación
        </strong>

        <p>
          Tienes {lineupWarnings.length} titular(es) con un estado que puede afectar a la próxima fecha.
        </p>
      </div>
    </div>

    <div className="lineup-health-alert-list">
      {lineupWarnings.map(
        ({
          player,
          availability,
        }) => (
          <button
            type="button"
            key={
              player.id
            }
            className={`lineup-health-alert-player status-${availability.className}`}
            onClick={() =>
              onPlayerDetails(
                player
              )
            }
          >
            <PlayerPhoto
              player={
                player
              }
              size="chip"
            />

            <span>
              <strong>
                {availability.label}: {player.name}
              </strong>

              <small>
                {player.statusInfo ||
                  "Revisa su disponibilidad antes del cierre de la jornada."}
              </small>
            </span>
          </button>
        )
      )}
    </div>
  </section>
)}

      <section className="football-pitch football-pitch-synced">
        <div className="pitch-border" />
        <div className="pitch-half-line" />
        <div className="pitch-center-circle" />
        <div className="pitch-center-dot" />
        <div className="penalty-box penalty-box-top" />
        <div className="goal-box goal-box-top" />
        <div className="penalty-box penalty-box-bottom" />
        <div className="goal-box goal-box-bottom" />

        <PitchLine
          className="pitch-line-forwards"
          players={
            groups.DL
          }
          roles={
            roleState
          }
          positionQualityMap={
            positionQualityMap
          }
          onPlayerDetails={
            onPlayerDetails
          }
        />

        <PitchLine
          className="pitch-line-midfield"
          players={
            groups.MC
          }
          roles={
            roleState
          }
          positionQualityMap={
            positionQualityMap
          }
          onPlayerDetails={
            onPlayerDetails
          }
        />

        <PitchLine
          className="pitch-line-defense"
          players={
            groups.DF
          }
          roles={
            roleState
          }
          positionQualityMap={
            positionQualityMap
          }
          onPlayerDetails={
            onPlayerDetails
          }
        />

        <PitchLine
          className="pitch-line-goalkeeper"
          players={
            groups.AR
          }
          roles={
            roleState
          }
          positionQualityMap={
            positionQualityMap
          }
          onPlayerDetails={
            onPlayerDetails
          }
        />
      </section>

      {editing && (
        <section className="lineup-player-pool">
          <div className="lineup-pool-head">
            <div>
              <span className="section-label">
                PLANTILLA
              </span>

              <h3>
                Elige tus titulares
              </h3>

              <p>
                El orden recibido desde Biwenger se conserva. Los
                jugadores en venta quedan bloqueados para una nueva
                alineación.
              </p>
            </div>

            <button
              type="button"
              className="lineup-save-button"
              disabled={
                !valid ||
                saving
              }
              onClick={() =>
                setConfirmOpen(
                  true
                )
              }
            >
              {saving
                ? "Guardando..."
                : "Guardar XI en Biwenger"}
            </button>
          </div>

          {[
            "AR",
            "DF",
            "MC",
            "DL",
          ].map(
            (position) => (
              <div
                className="lineup-pool-position"
                key={
                  position
                }
              >
                <div className="lineup-pool-position-title">
                  <Position
                    position={
                      position
                    }
                  />

                  <strong>
                    {position ===
                    "AR"
                      ? "Porteros"
                      : position ===
                          "DF"
                        ? "Defensas"
                        : position ===
                            "MC"
                          ? "Centrocampistas"
                          : "Delanteros"}
                  </strong>

                  <span>
                    {counts[
                      position
                    ] || 0}
                    /
                    {config[
                      position
                    ]}
                  </span>
                </div>

                <div className="lineup-player-options">
                  {fullSquad
                    .filter(
                      (player) =>
                        player.position ===
                        position
                    )
                    .map(
                      (player) => {
                        const selected =
                          selectedIds.includes(
                            Number(
                              player.id
                            )
                          );

                        const full =
                          (
                            counts[
                              position
                            ] ||
                            0
                          ) >=
                          Number(
                            config[
                              position
                            ] ||
                            0
                          );

                        const disabled =
                          player.isForSale ||
                          (
                            !selected &&
                            full
                          );

                        return (
                          <button
                            type="button"
                            key={
                              player.id
                            }
                            className={`lineup-player-option ${
                              selected
                                ? "selected"
                                : ""
                            } ${
                              player.isForSale
                                ? "for-sale"
                                : ""
                            }`}
                            disabled={
                              disabled
                            }
                            onClick={() =>
                              togglePlayer(
                                player
                              )
                            }
                          >
                            <PlayerPhoto
                              player={
                                player
                              }
                              size="chip"
                            />

                            <span>
                              <strong>
                                {player.name}
                              </strong>

                              <small className="lineup-option-club">
                                <TeamCrest
                                  player={
                                    player
                                  }
                                  size="tiny"
                                />

                                <span>
                                  {player.teamName}
                                </span>
                              </small>
                            </span>

                            {player.isForSale ? (
                              <b className="lineup-option-status sale">
                                EN VENTA
                              </b>
                            ) : selected ? (
                              <b className="lineup-option-status selected">
                                ✓ TITULAR
                              </b>
                            ) : (
                              <b className="lineup-option-status add">
                                +
                              </b>
                            )}
                          </button>
                        );
                      }
                    )}
                </div>
              </div>
            )
          )}

          {!valid && (
            <div className="lineup-validation-message">
              Completa exactamente los puestos de la formación {formation}. Los jugadores en venta no pueden guardarse en el nuevo XI.
            </div>
          )}
        </section>
      )}

      {!editing && (
        <p className="read-only-note lineup-sync-note">
          <strong>
            Sincronizado con Biwenger:
          </strong>{" "}
          la formación, los titulares, capitán y ariete proceden de
          Biwenger. Además, cada línea aplica el mismo patrón de slots
          centro→exterior que usa su campo para reproducir correctamente
          izquierda y derecha. Las etiquetas de nivel comparan al jugador
          con los compañeros de tu plantilla que juegan en la misma posición.
        </p>
      )}

      <LineupConfirmModal
        open={
          confirmOpen
        }
        formation={
          formation
        }
        players={
          selectedPlayers
        }
        captain={
          currentCaptain
        }
        striker={
          currentStriker
        }
        loading={
          saving
        }
        error={
          saveError
        }
        onClose={() =>
          setConfirmOpen(
            false
          )
        }
        onConfirm={async () => {
          const ids =
            orderedLineupIds(
              selectedIds,
              fullSquad
            );

          const success =
            await onSaveLineup({
              formation,

              playersID:
                ids,

              reservesID:
                savedLineup
                  ?.reservesID ||
                [],

              captain:
                Number(
                  captainId ||
                  0
                ),

              striker:
                strikerEnabled
                  ? Number(
                      strikerId ||
                      0
                    )
                  : 0,
            });

          if (success) {
            setConfirmOpen(
              false
            );

            setEditing(
              false
            );
          }
        }}
      />
    </main>
  );
}


export { BestXI };
