import { NOTIFICATION_HISTORY_KEY, formatMoney, formatDate } from "./app.js";

function createMarketSnapshot(market) {
  const snapshot = {};

  for (const player of market || []) {
    if (player.isMine) continue;

    const key = `${player.id}:${player.ownerId || 0}`;

    snapshot[key] = {
      id: Number(player.id),
      name: player.name,
      ownerId: Number(player.ownerId || 0),
      ownerName: player.ownerName || "Mercado Biwenger",
      sellerType:
        player.sellerType || (player.ownerId ? "user" : "market"),
      salePrice: Number(
        player.salePrice || player.marketIntelligence?.listedPrice || 0
      ),
      until: Number(player.until || 0) || null,
    };
  }

  return snapshot;
}

function marketSellerName(item) {
  if (item?.sellerType === "market") return "Mercado Biwenger";
  return item?.ownerName || "Otro participante";
}

function marketEventIcon(eventType) {
  return {
    added: "➕",
    removed: "↩",
    price: "💰",
    deadline: "⏱",
    refresh: "🔄",
  }[eventType] || "🔔";
}

function compareMarketSnapshots(previous, next) {
  const previousKeys = Object.keys(previous || {});
  const nextKeys = Object.keys(next || {});

  if (!previousKeys.length) return [];

  const previousSet = new Set(previousKeys);
  const nextSet = new Set(nextKeys);
  const events = [];

  for (const key of nextKeys) {
    if (previousSet.has(key)) continue;

    const item = next[key];
    const seller = marketSellerName(item);

    events.push({
      eventType: "added",
      type: "market",
      icon: marketEventIcon("added"),
      playerId: item?.id,
      playerName: item?.name,
      actorName: seller,
      title: `${item?.name || "Un jugador"} entró al mercado`,
      message:
        `${seller} puso a ${item?.name || "este jugador"} en venta por ` +
        `${formatMoney(item?.salePrice)}.`,
    });
  }

  for (const key of previousKeys) {
    if (nextSet.has(key)) continue;

    const item = previous[key];
    const seller = marketSellerName(item);
    const isSystem = item?.sellerType === "market";

    events.push({
      eventType: "removed",
      type: "market",
      icon: marketEventIcon("removed"),
      playerId: item?.id,
      playerName: item?.name,
      actorName: seller,
      title: `${item?.name || "Un jugador"} salió del mercado`,
      message: isSystem
        ? `La oferta de ${item?.name || "este jugador"} del Mercado Biwenger terminó o fue retirada. Precio anterior: ${formatMoney(item?.salePrice)}.`
        : `${item?.name || "Este jugador"} ya no está disponible. Último oferente: ${seller}. Precio anterior: ${formatMoney(item?.salePrice)}.`,
    });
  }

  for (const key of nextKeys) {
    if (!previousSet.has(key)) continue;

    const before = previous[key];
    const after = next[key];
    const seller = marketSellerName(after);

    if (Number(before?.salePrice) !== Number(after?.salePrice)) {
      events.push({
        eventType: "price",
        type: "market",
        icon: marketEventIcon("price"),
        playerId: after?.id,
        playerName: after?.name,
        actorName: seller,
        title: `Cambió el precio de ${after?.name || "un jugador"}`,
        message:
          `${seller}: ${formatMoney(before?.salePrice)} → ` +
          `${formatMoney(after?.salePrice)}.`,
      });
    }

    if (
      Number(before?.until || 0) !==
      Number(after?.until || 0)
    ) {
      events.push({
        eventType: "deadline",
        type: "market",
        icon: marketEventIcon("deadline"),
        playerId: after?.id,
        playerName: after?.name,
        actorName: seller,
        title: `Se actualizó el tiempo de ${after?.name || "una oferta"}`,
        message:
          `${seller}. Nuevo vencimiento: ${formatDate(after?.until)}.`,
      });
    }
  }

  return events;
}

function readNotificationHistory() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotificationHistory(history) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      NOTIFICATION_HISTORY_KEY,
      JSON.stringify(history)
    );
  } catch {
    // localStorage es opcional.
  }
}

function formatNotificationDate(value) {
  if (!value) return "-";

  return new Date(Number(value)).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


export { createMarketSnapshot, marketSellerName, marketEventIcon, compareMarketSnapshots, readNotificationHistory, saveNotificationHistory, formatNotificationDate };
