import { OFFICE_SECTIONS, getOfficeSection } from "./officeConfig.js";
import "./office.css";

export default function OfficeScene({
  section,
  onNavigate,
  data,
  children,
}) {
  const office =
    getOfficeSection(
      section
    );

  const monitor =
    office.monitor;

  return (
    <section
      className={`office-scene office-scene-${office.key}`}
    >
      <div className="office-stage">
        <img
          className="office-background"
          src={
            office.image
          }
          alt={`${office.room} de Cañadores FC`}
        />

        <div className="office-room-shade" />

        <button
          type="button"
          className="office-campus-button"
          onClick={() =>
            onNavigate(
              "campus"
            )
          }
        >
          <span>
            ←
          </span>

          <div>
            <small>
              VOLVER
            </small>

            <strong>
              Campus
            </strong>
          </div>
        </button>

        <div className="office-room-label">
          <span>
            CAÑADORES FC
          </span>

          <strong>
            {office.room}
          </strong>

          <small>
            {data
              ?.league
              ?.name ||
              "Liga Fantasy"}
          </small>
        </div>

        <div
          className="office-monitor-shell"
          style={{
            "--monitor-left":
              monitor.left,

            "--monitor-top":
              monitor.top,

            "--monitor-width":
              monitor.width,

            "--monitor-height":
              monitor.height,

            "--monitor-rotate":
              monitor.rotate,
          }}
        >
          <div className="office-monitor-viewport">
            <nav className="office-monitor-nav">
              <button
                type="button"
                className="office-monitor-brand"
                onClick={() =>
                  onNavigate(
                    "campus"
                  )
                }
                title="Volver al campus"
              >
                <img
                  src="/brand/canadores-crest.webp"
                  alt=""
                />

                <span>
                  <strong>
                    CAÑADORES FC
                  </strong>

                  <small>
                    FANTASY MANAGER
                  </small>
                </span>
              </button>

              <div className="office-monitor-tabs">
                {OFFICE_SECTIONS.map(
                  (item) => (
                    <button
                      type="button"
                      key={
                        item.key
                      }
                      className={
                        item.key ===
                        office.key
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        onNavigate(
                          item.key
                        )
                      }
                    >
                      <span>
                        {item.icon}
                      </span>

                      <b>
                        {item.shortLabel}
                      </b>
                    </button>
                  )
                )}
              </div>

              <div
                className={`office-monitor-api ${
                  data
                    ?.system
                    ?.rateLimited
                    ? "limited"
                    : "safe"
                }`}
                title={
                  data
                    ?.system
                    ?.rateLimited
                    ? "Protección de API activa"
                    : "API protegida"
                }
              >
                {data
                  ?.system
                  ?.rateLimited
                  ? "!"
                  : "✓"}
              </div>
            </nav>

            <div className="office-monitor-scroll">
              <div className="office-monitor-page">
                {children}
              </div>
            </div>
          </div>

          <div className="office-monitor-glass" />
        </div>

        <div className="office-screen-hint">
          <span>
            INTERFAZ REAL
          </span>

          <strong>
            La pantalla es totalmente interactiva
          </strong>
        </div>
      </div>
    </section>
  );
}
