import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  formatMoney,
} from "../../utils/app.js";
import "./dashboard-shell.css";

const SIDEBAR_KEY =
  "liga-fantasy-sidebar-collapsed-v1";

const NAVIGATION = [
  {
    key: "home",
    label: "Inicio",
    icon: "⌂",
  },
  {
    key: "team",
    label: "Mi equipo",
    icon: "♙",
  },
  {
    key: "market",
    label: "Mercado",
    icon: "⌑",
  },
  {
    key: "xi",
    label: "Mejor XI",
    icon: "☆",
  },
  {
    key: "moves",
    label: "Movimientos",
    icon: "⇄",
  },
  {
    key: "rivals",
    label: "Rivales",
    icon: "◎",
  },
  {
    key: "protection",
    label: "Protección",
    icon: "♢",
  },
];

function readCollapsed() {
  try {
    return (
      window.localStorage.getItem(
        SIDEBAR_KEY
      ) ===
      "1"
    );
  } catch {
    return false;
  }
}

function saveCollapsed(
  value
) {
  try {
    window.localStorage.setItem(
      SIDEBAR_KEY,
      value
        ? "1"
        : "0"
    );
  } catch {
    // Persistencia opcional.
  }
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
  badge,
  status,
}) {
  return (
    <button
      type="button"
      className={`dashboard-nav-item ${
        active
          ? "active"
          : ""
      }`}
      onClick={
        onClick
      }
      title={
        collapsed
          ? item.label
          : undefined
      }
      aria-current={
        active
          ? "page"
          : undefined
      }
    >
      <span className="dashboard-nav-icon">
        {item.icon}
      </span>

      <span className="dashboard-nav-label">
        {item.label}
      </span>

      {badge !==
        undefined &&
        badge !==
          null && (
        <span className="dashboard-nav-badge">
          {badge}
        </span>
      )}

      {status && (
        <span
          className={`dashboard-nav-status ${status}`}
        >
          {status ===
          "safe"
            ? "✓"
            : "!"}
        </span>
      )}
    </button>
  );
}

function getBadge(
  item,
  data,
  marketCount,
  movesCount
) {
  const map = {
    team:
      data?.squad
        ?.length ||
      0,

    market:
      marketCount,

    moves:
      movesCount,

    rivals:
      data?.rivals
        ?.length ||
      0,
  };

  return map[
    item.key
  ];
}

export default function DashboardShell({
  tab,
  onNavigate,
  data,
  marketCount,
  movesCount,
  notificationCount,
  refreshing,
  manualRefreshRemaining,
  onRefresh,
  children,
}) {
  const [
    collapsed,
    setCollapsed,
  ] =
    useState(
      readCollapsed
    );

  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(
      false
    );

  useEffect(
    () => {
      saveCollapsed(
        collapsed
      );
    },
    [
      collapsed,
    ]
  );

  useEffect(
    () => {
      setMobileOpen(
        false
      );
    },
    [
      tab,
    ]
  );

  const userInitial =
    String(
      data
        ?.user
        ?.name ||
      "Manager"
    )
      .trim()
      .charAt(
        0
      )
      .toUpperCase();

  const topNavigation =
    useMemo(
      () =>
        NAVIGATION,
      []
    );

  const activeLabel =
    NAVIGATION.find(
      (item) =>
        item.key ===
        tab
    )
      ?.label ||
    "Inicio";

  return (
    <div
      className={`dashboard-shell ${
        collapsed
          ? "sidebar-collapsed"
          : ""
      } ${
        mobileOpen
          ? "mobile-sidebar-open"
          : ""
      }`}
    >
      <aside className="dashboard-sidebar">
        <button
          type="button"
          className="dashboard-sidebar-brand"
          onClick={() =>
            onNavigate(
              "home"
            )
          }
          title="Ir al inicio"
        >
          <img
            src="/brand/canadores-crest.png"
            alt="Cañadores FC"
          />

          <div>
            <strong>
              Cañadores
            </strong>

            <span>
              Fantasy Manager
            </span>
          </div>
        </button>

        <nav
          className="dashboard-sidebar-nav"
          aria-label="Navegación lateral"
        >
          {NAVIGATION.map(
            (
              item
            ) => (
              <NavItem
                key={
                  item.key
                }
                item={
                  item
                }
                active={
                  tab ===
                  item.key
                }
                collapsed={
                  collapsed
                }
                onClick={() =>
                  onNavigate(
                    item.key
                  )
                }
                badge={
                  getBadge(
                    item,
                    data,
                    marketCount,
                    movesCount
                  )
                }
                status={
                  item.key ===
                  "protection"
                    ? data
                        ?.system
                        ?.rateLimited
                      ? "danger"
                      : "safe"
                    : null
                }
              />
            )
          )}
        </nav>

        <div className="dashboard-sidebar-club-stripes">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-sidebar-mini-stats">
            <span>
              Saldo
            </span>

            <strong>
              {formatMoney(
                data
                  ?.finances
                  ?.balance
              )}
            </strong>
          </div>

          <button
            type="button"
            className="dashboard-sidebar-collapse"
            onClick={() =>
              setCollapsed(
                (
                  value
                ) =>
                  !value
              )
            }
            aria-label={
              collapsed
                ? "Expandir menú lateral"
                : "Replegar menú lateral"
            }
            title={
              collapsed
                ? "Expandir menú"
                : "Replegar menú"
            }
          >
            {collapsed
              ? "»"
              : "«"}
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="dashboard-mobile-backdrop"
        aria-label="Cerrar menú"
        onClick={() =>
          setMobileOpen(
            false
          )
        }
      />

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="dashboard-mobile-menu"
            onClick={() =>
              setMobileOpen(
                (
                  value
                ) =>
                  !value
              )
            }
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <nav
            className="dashboard-topnav"
            aria-label="Navegación superior"
          >
            {topNavigation.map(
              (
                item
              ) => (
                <button
                  type="button"
                  key={
                    item.key
                  }
                  className={
                    tab ===
                    item.key
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
                    {item.label}
                  </b>
                </button>
              )
            )}
          </nav>

          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className="dashboard-refresh"
              onClick={
                onRefresh
              }
              disabled={
                refreshing ||
                manualRefreshRemaining >
                  0 ||
                data
                  ?.system
                  ?.rateLimited
              }
              title="Actualizar datos"
            >
              {refreshing
                ? "↻"
                : "⟳"}
            </button>

            <button
              type="button"
              className="dashboard-notification-button"
              onClick={() =>
                onNavigate(
                  "moves"
                )
              }
              title="Ver movimientos y avisos"
            >
              ♧

              {notificationCount >
                0 && (
                <span>
                  {Math.min(
                    notificationCount,
                    99
                  )}
                </span>
              )}
            </button>

            <div className="dashboard-api-pill">
              <span
                className={
                  data
                    ?.system
                    ?.rateLimited
                    ? "danger"
                    : "safe"
                }
              >
                {data
                  ?.system
                  ?.rateLimited
                  ? "!"
                  : "✓"}
              </span>

              <small>
                API
              </small>
            </div>

            <div className="dashboard-manager">
              <div className="dashboard-manager-avatar">
                {userInitial}
              </div>

              <div>
                <strong>
                  {data
                    ?.user
                    ?.name ||
                    "Manager"}
                </strong>

                <span>
                  Cañadores FC
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-mobile-titlebar">
          <span>
            {activeLabel}
          </span>

          <button
            type="button"
            onClick={() =>
              setCollapsed(
                false
              )
            }
          >
            Cañadores FC
          </button>
        </div>

        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
