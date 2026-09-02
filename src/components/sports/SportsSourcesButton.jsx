import { useEffect, useState } from "react";
import { SOFASCORE_PROFILE_CACHE_KEY } from "../../utils/app.js";
import { Modal, PlayerPhoto } from "../ui/PlayerUI.jsx";

const SPORTS_SOURCES = [
  {
    key: "sofascore",
    name: "SofaScore",
    short: "S",
    domain: "sofascore.com/football/player",
    description:
      "Valoraciones, estadísticas por partido, forma y mapas de rendimiento.",
    features: [
      "Valoraciones",
      "Estadísticas",
      "Forma",
    ],
  },
  {
    key: "fotmob",
    name: "FotMob",
    short: "F",
    domain: "fotmob.com/players",
    description:
      "Ratings, xG, xA, mapas de calor, tiros y métricas avanzadas.",
    features: [
      "xG / xA",
      "Mapa de calor",
      "Ratings",
    ],
  },
  {
    key: "flashscore",
    name: "Flashscore",
    short: "FL",
    domain: "flashscore.com/player",
    description:
      "Resultados en vivo, minutos, eventos, alineaciones y seguimiento rápido.",
    features: [
      "En vivo",
      "Eventos",
      "Alineaciones",
    ],
  },
  {
    key: "365scores",
    name: "365Scores",
    short: "365",
    domain: "365scores.com",
    description:
      "Resultados, noticias, calendarios, alineaciones y estadísticas.",
    features: [
      "Resultados",
      "Noticias",
      "Estadísticas",
    ],
  },
  {
    key: "besoccer",
    name: "BeSoccer",
    short: "B",
    domain: "besoccer.com/player",
    description:
      "Perfil, ELO, valor, forma, lesiones, transferencias y trayectoria.",
    features: [
      "ELO",
      "Lesiones",
      "Transferencias",
    ],
  },
  {
    key: "whoscored",
    name: "WhoScored",
    short: "W",
    domain: "whoscored.com/Players",
    description:
      "Valoraciones, estadísticas detalladas y análisis de rendimiento.",
    features: [
      "Ratings",
      "Rendimiento",
      "Análisis",
    ],
  },
];

function SportsSourcesButton({
  player,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    sofaState,
    setSofaState,
  ] = useState({
    status: "idle",
    profile: null,
    fallbackUrl: null,
  });

  useEffect(() => {
    if (!player?.name) {
      return undefined;
    }

    const controller =
      new AbortController();

    const cacheKey =
      String(
        player.id ||
          `${player.name}|${player.teamName}`
      );

    const load =
      async () => {
        try {
          const local =
            leerCacheSportsSource(
              cacheKey
            );

          if (
            local?.profile?.url ||
            local?.fallbackUrl
          ) {
            setSofaState({
              status:
                local?.profile?.url
                  ? "ready"
                  : "fallback",

              profile:
                local.profile ||
                null,

              fallbackUrl:
                local.fallbackUrl ||
                null,
            });

            return;
          }

          setSofaState({
            status: "loading",
            profile: null,
            fallbackUrl: null,
          });

          const params =
            new URLSearchParams({
              name:
                player.name,

              team:
                player.teamName ||
                "",
            });

          const response =
            await fetch(
              `/api/sofascore/player?${params.toString()}`,
              {
                signal:
                  controller.signal,
              }
            );

          const body =
            await response.json();

          if (
            !response.ok ||
            !body?.ok
          ) {
            throw new Error(
              body?.message ||
                "No se pudo buscar en SofaScore."
            );
          }

          const result =
            body?.data || {};

          const next = {
            status:
              result?.found &&
              result?.profile?.url
                ? "ready"
                : "fallback",

            profile:
              result?.profile ||
              null,

            fallbackUrl:
              result?.fallbackUrl ||
              crearBusquedaFuente(
                "sofascore",
                player
              ),
          };

          guardarCacheSportsSource(
            cacheKey,
            next
          );

          setSofaState(
            next
          );
        } catch (error) {
          if (
            error?.name ===
            "AbortError"
          ) {
            return;
          }

          setSofaState({
            status: "fallback",
            profile: null,
            fallbackUrl:
              crearBusquedaFuente(
                "sofascore",
                player
              ),
          });
        }
      };

    load();

    return () =>
      controller.abort();
  }, [
    player?.id,
    player?.name,
    player?.teamName,
  ]);

  const openSource =
    (sourceKey) => {
      let url = null;

      if (
        sourceKey ===
        "sofascore"
      ) {
        url =
          sofaState
            ?.profile
            ?.url ||
          sofaState
            ?.fallbackUrl ||
          crearBusquedaFuente(
            "sofascore",
            player
          );
      } else {
        url =
          crearBusquedaFuente(
            sourceKey,
            player
          );
      }

      if (!url) {
        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  return (
    <>
      <button
        type="button"
        className="sports-sources-button"
        onClick={() =>
          setOpen(true)
        }
        title="Abrir fuentes deportivas del jugador"
      >
        <span className="sports-sources-icon">
          ◎
        </span>

        <span className="sports-sources-copy">
          <small>
            FUENTES DEPORTIVAS
          </small>

          <strong>
            Ver estadísticas externas
          </strong>

          <em>
            6 plataformas
          </em>
        </span>

        <span className="sports-sources-arrow">
          ›
        </span>
      </button>

      <Modal
        open={open}
        onClose={() =>
          setOpen(false)
        }
        title="Fuentes deportivas"
        subtitle={`${player.name} · ${player.teamName}`}
        wide
      >
        <div className="sports-sources-intro">
          <div>
            <span className="section-label">
              PERFIL EXTERNO
            </span>

            <h3>
              Compara al jugador en varias plataformas
            </h3>

            <p>
              Cada fuente aporta datos distintos. Cuando no podemos
              resolver el perfil exacto automáticamente, abrimos una
              búsqueda restringida a esa plataforma.
            </p>
          </div>

          <PlayerPhoto
            player={player}
            size="normal"
          />
        </div>

        <div className="sports-source-grid">
          {SPORTS_SOURCES.map(
            (source) => {
              const isSofa =
                source.key ===
                "sofascore";

              const sofaDirect =
                isSofa &&
                Boolean(
                  sofaState
                    ?.profile
                    ?.url
                );

              return (
                <article
                  className={`sports-source-card sports-source-${source.key}`}
                  key={
                    source.key
                  }
                >
                  <div className="sports-source-card-head">
                    <span className="sports-source-logo">
                      {
                        source.short
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          source.name
                        }
                      </strong>

                      <small>
                        {sofaDirect
                          ? "Perfil encontrado"
                          : isSofa &&
                              sofaState.status ===
                                "loading"
                            ? "Buscando perfil..."
                            : "Buscar jugador"}
                      </small>
                    </div>
                  </div>

                  <p>
                    {
                      source.description
                    }
                  </p>

                  <div className="sports-source-features">
                    {source.features.map(
                      (feature) => (
                        <span
                          key={
                            feature
                          }
                        >
                          {
                            feature
                          }
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="sports-source-open"
                    onClick={() =>
                      openSource(
                        source.key
                      )
                    }
                  >
                    {sofaDirect
                      ? "Abrir perfil"
                      : `Buscar en ${source.name}`}

                    <span>
                      ↗
                    </span>
                  </button>
                </article>
              );
            }
          )}
        </div>

        <div className="sports-source-note">
          <strong>
            Sobre los datos externos
          </strong>

          <p>
            Estas plataformas no comparten una API pública única y estable.
            Por eso esta versión las usa como fuentes externas de consulta
            sin mezclar datos automáticamente con la nota Fantasy.
          </p>
        </div>
      </Modal>
    </>
  );
}

function leerCacheSportsSource(
  key
) {
  try {
    const raw =
      localStorage.getItem(
        SOFASCORE_PROFILE_CACHE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    const item =
      parsed?.[key];

    if (!item) {
      return null;
    }

    const ttl =
      item?.profile?.url
        ? 7 *
          24 *
          60 *
          60 *
          1000
        : 60 *
          60 *
          1000;

    if (
      Date.now() -
        Number(
          item.savedAt ||
          0
        ) >
      ttl
    ) {
      return null;
    }

    return item;
  } catch {
    return null;
  }
}

function guardarCacheSportsSource(
  key,
  value
) {
  try {
    const raw =
      localStorage.getItem(
        SOFASCORE_PROFILE_CACHE_KEY
      );

    const parsed =
      raw
        ? JSON.parse(raw)
        : {};

    parsed[key] = {
      ...value,
      savedAt:
        Date.now(),
    };

    localStorage.setItem(
      SOFASCORE_PROFILE_CACHE_KEY,
      JSON.stringify(
        parsed
      )
    );
  } catch {
    // La caché es opcional.
  }
}

function crearBusquedaFuente(
  sourceKey,
  player
) {
  const source =
    SPORTS_SOURCES.find(
      (item) =>
        item.key ===
        sourceKey
    );

  if (!source) {
    return null;
  }

  const query =
    [
      `site:${source.domain}`,
      `"${player?.name || ""}"`,
      player?.teamName
        ? `"${player.teamName}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(
      query
    )
  );
}



export { SPORTS_SOURCES, SportsSourcesButton };
