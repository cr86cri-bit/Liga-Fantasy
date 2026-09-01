import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

const CACHE_DIR =
  path.resolve(process.cwd(), ".cache");

const DASHBOARD_FILE =
  path.join(CACHE_DIR, "dashboard.json");

export async function saveDashboardSnapshot(dashboard) {
  try {
    await mkdir(CACHE_DIR, {
      recursive: true,
    });

    await writeFile(
      DASHBOARD_FILE,
      JSON.stringify(
        {
          savedAt: new Date().toISOString(),
          dashboard,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.warn(
      "[Cache] No se pudo guardar snapshot:",
      error?.message
    );
  }
}

export async function loadDashboardSnapshot() {
  try {
    const raw =
      await readFile(DASHBOARD_FILE, "utf8");

    const parsed =
      JSON.parse(raw);

    return parsed?.dashboard || null;
  } catch {
    return null;
  }
}
