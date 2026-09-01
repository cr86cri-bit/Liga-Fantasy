import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

const CACHE_DIR =
  path.resolve(
    process.cwd(),
    ".cache"
  );

const STATE_FILE =
  path.join(
    CACHE_DIR,
    "api-usage.json"
  );

const KEEP_MS =
  48 *
  60 *
  60 *
  1000;

export class ApiUsageTracker {
  constructor() {
    this.initialized =
      false;

    this.requests =
      [];

    this.avoided =
      [];

    this.persistTimer =
      null;
  }

  async init() {
    if (
      this.initialized
    ) {
      return;
    }

    this.initialized =
      true;

    try {
      const raw =
        await readFile(
          STATE_FILE,
          "utf8"
        );

      const parsed =
        JSON.parse(
          raw
        );

      this.requests =
        Array.isArray(
          parsed?.requests
        )
          ? parsed.requests
          : [];

      this.avoided =
        Array.isArray(
          parsed?.avoided
        )
          ? parsed.avoided
          : [];

      this.trim();
    } catch {
      // Sin historial previo.
    }
  }

  recordRequest({
    endpoint,
    kind = "read",
    status = 0,
    ok = false,
    durationMs = 0,
  }) {
    this.requests.push({
      at:
        Date.now(),

      endpoint:
        String(
          endpoint ||
          "unknown"
        ),

      kind,

      status:
        Number(
          status ||
          0
        ),

      ok:
        Boolean(
          ok
        ),

      durationMs:
        Math.round(
          Number(
            durationMs ||
            0
          )
        ),
    });

    this.trim();
    this.schedulePersist();
  }

  recordAvoided({
    key,
    reason,
  }) {
    this.avoided.push({
      at:
        Date.now(),

      key:
        String(
          key ||
          "unknown"
        ),

      reason:
        String(
          reason ||
          "cache"
        ),
    });

    this.trim();
    this.schedulePersist();
  }

  trim() {
    const cutoff =
      Date.now() -
      KEEP_MS;

    this.requests =
      this.requests.filter(
        (item) =>
          Number(
            item.at ||
            0
          ) >= cutoff
      );

    this.avoided =
      this.avoided.filter(
        (item) =>
          Number(
            item.at ||
            0
          ) >= cutoff
      );

    if (
      this.requests.length >
      3000
    ) {
      this.requests =
        this.requests.slice(
          -3000
        );
    }

    if (
      this.avoided.length >
      6000
    ) {
      this.avoided =
        this.avoided.slice(
          -6000
        );
    }
  }

  getStats({
    scheduler,
    guard,
  } = {}) {
    const now =
      Date.now();

    const hourAgo =
      now -
      60 *
      60 *
      1000;

    const todayStart =
      new Date();

    todayStart.setHours(
      0,
      0,
      0,
      0
    );

    const todayMs =
      todayStart.getTime();

    const lastHour =
      this.requests.filter(
        (item) =>
          item.at >=
          hourAgo
      );

    const today =
      this.requests.filter(
        (item) =>
          item.at >=
          todayMs
      );

    const avoidedHour =
      this.avoided.filter(
        (item) =>
          item.at >=
          hourAgo
      );

    const avoidedToday =
      this.avoided.filter(
        (item) =>
          item.at >=
          todayMs
      );

    const byEndpoint =
      {};

    for (
      const item of
        lastHour
    ) {
      byEndpoint[
        item.endpoint
      ] =
        (
          byEndpoint[
            item.endpoint
          ] ||
          0
        ) +
        1;
    }

    const sortedEndpoints =
      Object.entries(
        byEndpoint
      )
        .sort(
          (a, b) =>
            b[1] -
            a[1]
        )
        .map(
          ([
            endpoint,
            count,
          ]) => ({
            endpoint,
            count,
          })
        );

    const guardStatus =
      guard ||
      {};

    let level =
      "safe";

    if (
      guardStatus.blocked
    ) {
      level =
        "blocked";
    } else if (
      lastHour.length >
      35
    ) {
      level =
        "high";
    } else if (
      lastHour.length >
      20
    ) {
      level =
        "controlled";
    }

    return {
      level,

      requestsLastHour:
        lastHour.length,

      requestsToday:
        today.length,

      avoidedLastHour:
        avoidedHour.length,

      avoidedToday:
        avoidedToday.length,

      failedLastHour:
        lastHour.filter(
          (item) =>
            !item.ok
        ).length,

      writesLastHour:
        lastHour.filter(
          (item) =>
            item.kind ===
            "write"
        ).length,

      lastRequestAt:
        this.requests.length
          ? new Date(
              this.requests[
                this.requests.length -
                1
              ].at
            ).toISOString()
          : null,

      endpointsLastHour:
        sortedEndpoints,

      queue:
        scheduler ||
        null,

      guard:
        guardStatus,
    };
  }

  schedulePersist() {
    if (
      this.persistTimer
    ) {
      return;
    }

    this.persistTimer =
      setTimeout(
        () => {
          this.persistTimer =
            null;

          void this.persist();
        },
        1000
      );
  }

  async persist() {
    try {
      await mkdir(
        CACHE_DIR,
        {
          recursive: true,
        }
      );

      await writeFile(
        STATE_FILE,
        JSON.stringify(
          {
            requests:
              this.requests,

            avoided:
              this.avoided,
          },
          null,
          2
        ),
        "utf8"
      );
    } catch (error) {
      console.warn(
        "[ApiUsage] No se pudo guardar historial:",
        error?.message
      );
    }
  }
}
