// Server-side preferences: desks, saved grids and settings follow the user to any browser. localStorage stays as
// the cache; the newer copy wins. Pure merge rule in `newer`; sync helpers wrap /api/prefs.
import { uxApi } from '../api.js';

/** Which copy to keep: the one saved later. A missing or undated copy loses. */
export function newer(local, remote) {
  const l = Number(local?.savedAt) || 0;
  const r = Number(remote?.savedAt) || 0;
  if (!remote?.state && remote?.state !== 0) return 'local';
  if (!local?.state && local?.state !== 0) return 'remote';
  return r > l ? 'remote' : 'local';
}

/** The server copy of a preference ({savedAt, state}) or null when there is none or the hub is unreachable. */
export async function loadRemote(key) {
  try {
    const res = await uxApi.pref(key);
    return res?.value && typeof res.value === 'object' ? res.value : null;
  } catch {
    return null;
  }
}

/** Debounced saver: call it on every change; the last value in `delayMs` is written. */
export function remoteSaver(key, delayMs = 1200) {
  let timer = null;
  let last = null;
  return function save(state, savedAt = Date.now()) {
    last = { savedAt, state };
    clearTimeout(timer);
    timer = setTimeout(() => { uxApi.savePref(key, last).catch(() => {}); }, delayMs);
    return last;
  };
}
