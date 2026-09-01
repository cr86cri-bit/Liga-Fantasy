export class RequestScheduler {
  constructor({
    minGapMs = 4000,
    guard,
  } = {}) {
    this.minGapMs =
      minGapMs;

    this.guard =
      guard;

    this.queue =
      [];

    this.running =
      false;

    this.lastStartedAt =
      0;

    this.lastFinishedAt =
      0;
  }

  async schedule(
    endpoint,
    task,
    {
      kind = "read",
    } = {}
  ) {
    if (
      this.guard
        ?.isBlocked()
    ) {
      throw createGuardError(
        this.guard
      );
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {
        this.queue.push({
          endpoint,
          task,
          kind,
          resolve,
          reject,
          queuedAt:
            Date.now(),
        });

        void this.process();
      }
    );
  }

  async process() {
    if (this.running) {
      return;
    }

    this.running =
      true;

    try {
      while (
        this.queue.length
      ) {
        if (
          this.guard
            ?.isBlocked()
        ) {
          this.cancelPending(
            createGuardError(
              this.guard
            )
          );

          break;
        }

        const waitMs =
          Math.max(
            0,
            this.lastStartedAt +
              this.minGapMs -
              Date.now()
          );

        if (
          waitMs > 0
        ) {
          await wait(
            waitMs
          );
        }

        const item =
          this.queue.shift();

        if (!item) {
          continue;
        }

        if (
          this.guard
            ?.isBlocked()
        ) {
          item.reject(
            createGuardError(
              this.guard
            )
          );

          continue;
        }

        this.lastStartedAt =
          Date.now();

        try {
          const value =
            await item.task();

          item.resolve(
            value
          );
        } catch (error) {
          item.reject(
            error
          );
        } finally {
          this.lastFinishedAt =
            Date.now();
        }
      }
    } finally {
      this.running =
        false;
    }
  }

  cancelPending(
    error
  ) {
    const pending =
      this.queue.splice(
        0
      );

    for (
      const item of
        pending
    ) {
      item.reject(
        error
      );
    }
  }

  getStatus() {
    return {
      queued:
        this.queue.length,

      running:
        this.running,

      minGapMs:
        this.minGapMs,

      lastStartedAt:
        this.lastStartedAt
          ? new Date(
              this.lastStartedAt
            ).toISOString()
          : null,

      lastFinishedAt:
        this.lastFinishedAt
          ? new Date(
              this.lastFinishedAt
            ).toISOString()
          : null,
    };
  }
}

function createGuardError(
  guard
) {
  const status =
    guard?.getStatus?.() ||
    {};

  const error =
    new Error(
      "Protección de Biwenger activa. No se enviarán más peticiones hasta que finalice el cooldown."
    );

  error.code =
    "BIWENGER_RATE_LIMIT";

  error.retryAt =
    status.blockedUntil ||
    null;

  return error;
}

function wait(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}
