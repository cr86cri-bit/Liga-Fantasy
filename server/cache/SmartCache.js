export class SmartCache {
  constructor({
    onAvoided,
  } = {}) {
    this.entries =
      new Map();

    this.pending =
      new Map();

    this.lastAccess =
      new Map();

    this.onAvoided =
      typeof onAvoided ===
      "function"
        ? onAvoided
        : null;
  }

  async get(
    key,
    {
      ttlMs,
      minReloadMs = 0,
      force = false,
      loader,
      blocked = false,
      blockedError = null,
      staleIfError = true,
    }
  ) {
    const now =
      Date.now();

    const entry =
      this.entries.get(
        key
      ) ||
      null;

    if (
      entry &&
      !force &&
      now -
        entry.loadedAt <
        ttlMs
    ) {
      this.avoided(
        key,
        "cache"
      );

      this.markAccess(
        key,
        {
          source:
            "cache",

          loadedAt:
            entry.loadedAt,

          stale:
            false,
        }
      );

      return entry.value;
    }

    if (
      entry &&
      force &&
      minReloadMs >
        0 &&
      now -
        entry.loadedAt <
        minReloadMs
    ) {
      this.avoided(
        key,
        "min-window"
      );

      this.markAccess(
        key,
        {
          source:
            "cache-min-window",

          loadedAt:
            entry.loadedAt,

          stale:
            false,
        }
      );

      return entry.value;
    }

    if (blocked) {
      if (entry) {
        this.avoided(
          key,
          "cooldown"
        );

        this.markAccess(
          key,
          {
            source:
              "stale-cooldown",

            loadedAt:
              entry.loadedAt,

            stale:
              true,
          }
        );

        return entry.value;
      }

      throw (
        blockedError ||
        new Error(
          "Carga temporalmente bloqueada."
        )
      );
    }

    if (
      this.pending.has(
        key
      )
    ) {
      this.avoided(
        key,
        "dedupe"
      );

      this.markAccess(
        key,
        {
          source:
            "pending",

          loadedAt:
            entry?.loadedAt ||
            null,

          stale:
            Boolean(
              entry
            ),
        }
      );

      return this.pending.get(
        key
      );
    }

    const promise =
      (async () => {
        try {
          const value =
            await loader();

          const loadedAt =
            Date.now();

          this.entries.set(
            key,
            {
              value,
              loadedAt,
            }
          );

          this.markAccess(
            key,
            {
              source:
                "network",

              loadedAt,

              stale:
                false,
            }
          );

          return value;
        } catch (error) {
          if (
            staleIfError &&
            entry
          ) {
            this.avoided(
              key,
              "stale-error"
            );

            this.markAccess(
              key,
              {
                source:
                  "stale-error",

                loadedAt:
                  entry.loadedAt,

                stale:
                  true,

                error:
                  error?.message ||
                  "Error de actualización",
              }
            );

            return entry.value;
          }

          throw error;
        } finally {
          this.pending.delete(
            key
          );
        }
      })();

    this.pending.set(
      key,
      promise
    );

    return promise;
  }

  invalidate(
    ...keys
  ) {
    for (
      const key of
        keys
    ) {
      this.entries.delete(
        key
      );

      this.lastAccess.delete(
        key
      );
    }
  }

  invalidatePrefix(
    prefix
  ) {
    for (
      const key of
        [
          ...this.entries.keys(),
        ]
    ) {
      if (
        String(
          key
        ).startsWith(
          prefix
        )
      ) {
        this.entries.delete(
          key
        );

        this.lastAccess.delete(
          key
        );
      }
    }
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
    this.lastAccess.clear();
  }

  avoided(
    key,
    reason
  ) {
    this.onAvoided?.({
      key,
      reason,
    });
  }

  markAccess(
    key,
    meta
  ) {
    this.lastAccess.set(
      key,
      {
        ...meta,

        accessedAt:
          Date.now(),
      }
    );
  }

  getRemainingSeconds(
    key,
    ttlMs
  ) {
    const entry =
      this.entries.get(
        key
      );

    if (!entry) {
      return null;
    }

    return Math.max(
      0,
      Math.ceil(
        (
          entry.loadedAt +
          ttlMs -
          Date.now()
        ) /
        1000
      )
    );
  }

  getMeta() {
    const result =
      {};

    for (
      const [
        key,
        entry,
      ] of
        this.lastAccess.entries()
    ) {
      result[
        key
      ] = {
        source:
          entry.source,

        stale:
          Boolean(
            entry.stale
          ),

        loadedAt:
          entry.loadedAt
            ? new Date(
                entry.loadedAt
              ).toISOString()
            : null,

        ageSeconds:
          entry.loadedAt
            ? Math.max(
                0,
                Math.floor(
                  (
                    Date.now() -
                    entry.loadedAt
                  ) /
                  1000
                )
              )
            : null,

        error:
          entry.error ||
          null,
      };
    }

    return result;
  }
}
