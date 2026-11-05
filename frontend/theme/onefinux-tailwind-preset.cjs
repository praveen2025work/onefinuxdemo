/**
 * One Finance design standard — Tailwind CSS v3 preset (STEPS v3 and any Tailwind 3 app).
 *
 *   // tailwind.config.js
 *   module.exports = { presets: [require('./src/styles/ofx/onefinux-tailwind-preset.cjs')], … }
 *
 * Load onefinux-tokens.css in the app (a synced copy, or the host's /theme/onefinux-tokens.css when framed), then:
 *   - blue, slate and gray follow the brand: under html[data-skin="barclays"] they are the Barclays ramps
 *     (--ofx-tw-*: blue-600 is Royal Blue #006de3, the greys are the Barclays neutrals); under any other skin, or with
 *     no tokens loaded, they are Tailwind's own values. Hard-coded text-blue-600 / bg-gray-50 classes need no edit.
 *   - ofx-* colours paint straight from the tokens: bg-ofx-page, bg-ofx-card, text-ofx-ink, border-ofx-line …
 *   - text-xs … text-3xl are the STEPS type scale (Tailwind's defaults); write those, never text-[13px].
 *
 * Tailwind 4 apps (MITR AI) need no preset: the tokens file sets their --color-* variables (MITR bridge).
 * Edit this file in One Finance (frontend/theme); apps hold a synced copy.
 */
const colors = require('tailwindcss/colors');

/** "#2563eb" → "37 99 235" */
function triplet(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

/** A Tailwind palette whose steps read --ofx-tw-<name>-<step>, with Tailwind's value as the fallback. */
function ramp(name, base) {
  return Object.fromEntries(
    Object.entries(base)
      .filter(([step, v]) => /^\d+$/.test(step) && typeof v === 'string' && v.startsWith('#'))
      .map(([step, hex]) => [step, `rgb(var(--ofx-tw-${name}-${step}, ${triplet(hex)}) / <alpha-value>)`]),
  );
}

const token = (name) => `var(--ofx-${name})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        blue: ramp('blue', colors.blue),
        slate: ramp('slate', colors.slate),
        gray: ramp('gray', colors.gray),
        ofx: {
          page: token('page'),
          card: token('card'),
          'surface-2': token('surface-2'),
          line: token('line'),
          'line-2': token('line-2'),
          ink: token('ink'),
          'ink-2': token('ink-2'),
          'ink-3': token('ink-3'),
          accent: token('accent'),
          'accent-2': token('accent-2'),
          'on-accent': token('on-accent'),
          ok: token('ok'),
          warn: token('warn'),
          fail: token('fail'),
          gold: token('gold'),
          navy: token('navy'),
          sky: token('sky'),
        },
      },
      height: { 'ofx-header': token('header-h'), 'ofx-ctl': token('ctl-h'), 'ofx-field': token('field-h') },
      fontFamily: { ofx: token('font') },
    },
  },
};
