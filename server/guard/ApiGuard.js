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
    "api-guard.json"
  );

const ONE_HOUR =
  60 * 60 * 1000;

const SIX_HOURS =
  6 * ONE_HOUR;

const ONE_DAY =
  24 * ONE_HOUR;

const STRIKE_WINDOW =
  7 * ONE_DAY;

export class ApiGuard {
  constructor() {
    this.initialized = false;

    this.state = {
      strikes: 0,
      blockedUntil: 0,
      lastRateLimitAt: 0,
      lastReason: "",
    };
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

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

      this.state = {
        ...this.state,
        ...parsed,
      };
    } catch {
      // Primera ejecución: no existe estado previo.
    }

    /*
     * Si el último rate limit fue hace más de una semana,
     * volvemos a tratar el siguiente como primer incidente.
     */
    if (
      this.state.lastRateLimitAt &&
      Date.now() -
        this.state.lastRateLimitAt >
        STRIKE_WINDOW
    ) {
      this.state.strikes =
        0;

      this.state.lastRateLimitAt =
        0;

      this.state.lastReason =
        "";

      await this.persist();
    }
  }

  isBlocked() {
    return (
      Number(
        this.state.blockedUntil ||
        0
      ) >
      Date.now()
    );
  }

  remainingMs() {
    return Math.max(
      0,
      Number(
        this.state.blockedUntil ||
        0
      ) -
      Date.now()
    );
  }

  async trigger({
    retryAfterMs = 0,
    reason = "Rate limit",
  } = {}) {
    await this.init();

    const now =
      Date.now();

    const previousRecent =
      this.state.lastRateLimitAt &&
      now -
        this.state.lastRateLimitAt <=
        STRIKE_WINDOW;

    const strikes =
      previousRecent
        ? Math.min(
            3,
            Number(
              this.state.strikes ||
              0
            ) + 1
          )
        : 1;

    /*
     * Protección conservadora:
     * 1º bloqueo -> 1 hora
     * 2º bloqueo -> 6 horas
     * 3º o posterior -> 24 horas
     *
     * Si Biwenger envía Retry-After más grande, lo respetamos.
     */
    const tierDuration =
      strikes >= 3
        ? ONE_DAY
        : strikes === 2
          ? SIX_HOURS
          : ONE_HOUR;

    const duration =
      Math.max(
        tierDuration,
        Number(
          retryAfterMs ||
          0
        )
      );

    this.state = {
      strikes,

      blockedUntil:
        Math.max(
          Number(
            this.state.blockedUntil ||
            0
          ),
          now +
            duration
        ),

      lastRateLimitAt:
        now,

      lastReason:
        String(
          reason ||
          "Rate limit"
        ),
    };

    await this.persist();

    return this.getStatus();
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
          this.state,
          null,
          2
        ),
        "utf8"
      );
    } catch (error) {
      console.warn(
        "[ApiGuard] No se pudo guardar estado:",
        error?.message
      );
    }
  }

  getStatus() {
    return {
      blocked:
        this.isBlocked(),

      blockedUntil:
        this.state.blockedUntil
          ? new Date(
              this.state.blockedUntil
            ).toISOString()
          : null,

      remainingSeconds:
        Math.ceil(
          this.remainingMs() /
          1000
        ),

      strikes:
        Number(
          this.state.strikes ||
          0
        ),

      lastRateLimitAt:
        this.state.lastRateLimitAt
          ? new Date(
              this.state.lastRateLimitAt
            ).toISOString()
          : null,

      lastReason:
        this.state.lastReason ||
        null,
    };
  }
}
