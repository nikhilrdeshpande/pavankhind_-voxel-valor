
const VERSION_KEY = 'pavankhind_save_version';

/** Bump when a stored shape changes incompatibly, and add a migration below. */
export const CURRENT_SAVE_VERSION = 1;

/**
 * Ordered migrations: index N upgrades a save from version N to N+1.
 * Each runs at most once per device. Keep them defensive — stored data
 * may be missing or corrupt.
 */
const MIGRATIONS: Array<() => void> = [
  // 0 -> 1: pre-versioning saves are shape-compatible (every loader merges
  // over defaults), so this is just the initial stamp.
  () => {},
];

/** Run pending save migrations. Call once at startup, before any loads. */
export function migrateSaves() {
  let version = 0;
  try {
    version = parseInt(localStorage.getItem(VERSION_KEY) ?? '0', 10) || 0;
  } catch {
    return; // storage unavailable — nothing to migrate
  }
  if (version >= CURRENT_SAVE_VERSION) return;
  for (let v = version; v < CURRENT_SAVE_VERSION; v++) {
    try {
      MIGRATIONS[v]?.();
    } catch (err) {
      console.warn(`[SaveVersion] migration ${v} -> ${v + 1} failed:`, err);
    }
  }
  try {
    localStorage.setItem(VERSION_KEY, String(CURRENT_SAVE_VERSION));
  } catch { /* storage full/disabled */ }
}
