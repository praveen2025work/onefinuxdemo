// Wijmo (MESCIUS) licence — applied once, before any control mounts. Same contract as STEPS
// (NEXT_PUBLIC_WIJMO_LICENSE_KEY there, VITE_WIJMO_LICENSE here). Without a key Wijmo runs in
// evaluation mode: every control still works, with a watermark.
import { setLicenseKey } from '@mescius/wijmo';

const key = String(import.meta.env.VITE_WIJMO_LICENSE || '').trim();

if (key) {
  setLicenseKey(key);
} else if (import.meta.env.DEV) {
  console.warn('[wijmo] VITE_WIJMO_LICENSE is not set; grids and charts run in evaluation mode.'); // eslint-disable-line no-console
}
