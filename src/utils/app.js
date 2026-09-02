const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const MARKET_SNAPSHOT_KEY =
  "liga-fantasy-market-snapshot-v2";

const DASHBOARD_LOCAL_CACHE_KEY =
  "liga-fantasy-dashboard-cache-v1";

const API_LEADER_KEY =
  "liga-fantasy-api-leader-v1";

const API_CHANNEL_NAME =
  "liga-fantasy-api-channel-v1";

const API_LEADER_LEASE_MS =
  20_000;

const API_LEADER_HEARTBEAT_MS =
  5_000;

const MANUAL_REFRESH_COOLDOWN_MS =
  60_000;

const NOTIFICATION_HISTORY_KEY =
  "liga-fantasy-notification-history-v1";

const SOFASCORE_PROFILE_CACHE_KEY =
  "liga-fantasy-sports-sources-v1";

function readLocalDashboardCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        DASHBOARD_LOCAL_CACHE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function createTabId() {
  return (
    `${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

function readLeaderLease() {
  try {
    const raw =
      window.localStorage.getItem(
        API_LEADER_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function writeLeaderLease(id) {
  const lease = {
    id,

    expiresAt:
      Date.now() +
      API_LEADER_LEASE_MS,
  };

  try {
    window.localStorage.setItem(
      API_LEADER_KEY,
      JSON.stringify(lease)
    );
  } catch {
    // localStorage opcional.
  }

  return lease;
}

function formatShortDuration(seconds) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return "Sin cargar";
  }

  const value =
    Math.max(
      0,
      Math.round(
        Number(seconds)
      )
    );

  if (value < 60) {
    return `${value}s`;
  }

  const minutes =
    Math.floor(value / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(minutes / 60);

  const rest =
    minutes % 60;

  return rest
    ? `${hours}h ${rest}m`
    : `${hours}h`;
}

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function formatChange(value) {
  const amount = Number(value || 0);
  if (!amount) return "0 €";
  return `${amount > 0 ? "+" : ""}${formatMoney(amount)}`;
}

function toMilliseconds(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return value > 10_000_000_000
      ? value
      : value * 1000;
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 10_000_000_000
      ? numeric
      : numeric * 1000;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value) {
  const millis = toMilliseconds(value);

  if (!millis) return "Sin fecha";

  return new Date(millis).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(target, now = Date.now()) {
  const millis = toMilliseconds(target);

  if (!millis) {
    return {
      text: "Sin límite informado",
      expired: false,
      urgency: "unknown",
    };
  }

  let remaining = millis - now;

  if (remaining <= 0) {
    return {
      text: "Finalizado",
      expired: true,
      urgency: "expired",
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const two = (number) => String(number).padStart(2, "0");

  let text;

  if (days > 0) {
    text = `${days}d ${two(hours)}h ${two(minutes)}m`;
  } else {
    text = `${two(hours)}:${two(minutes)}:${two(seconds)}`;
  }

  return {
    text,
    expired: false,
    urgency:
      remaining <= 15 * 60 * 1000
        ? "critical"
        : remaining <= 60 * 60 * 1000
          ? "soon"
          : "normal",
  };
}

function changeClass(value) {
  const number = Number(value || 0);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "neutral";
}

function statusConfig(status) {
  return (
    {
      ok: ["🟢", "Disponible", "status-ok"],
      doubt: ["🟡", "Duda", "status-warning"],
      injured: ["🔴", "Lesionado", "status-danger"],
      sanctioned: ["🔴", "Sancionado", "status-danger"],
      discarded: ["🔴", "Descartado", "status-danger"],
    }[status] || ["🟡", "Sin confirmar", "status-warning"]
  );
}


export {
  MARKET_SNAPSHOT_KEY,
  DASHBOARD_LOCAL_CACHE_KEY,
  API_LEADER_KEY,
  API_CHANNEL_NAME,
  API_LEADER_LEASE_MS,
  API_LEADER_HEARTBEAT_MS,
  MANUAL_REFRESH_COOLDOWN_MS,
  NOTIFICATION_HISTORY_KEY,
  SOFASCORE_PROFILE_CACHE_KEY,
  readLocalDashboardCache,
  createTabId,
  readLeaderLease,
  writeLeaderLease,
  formatShortDuration,
  formatMoney,
  formatChange,
  toMilliseconds,
  formatDate,
  formatCountdown,
  changeClass,
  statusConfig,
};
