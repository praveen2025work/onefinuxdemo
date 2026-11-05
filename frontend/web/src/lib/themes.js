// Console themes. `mode` drives html[data-theme]; `skin` drives html[data-skin]. Both select a palette in the
// design standard (frontend/theme/onefinux-tokens.css). "barclays" — Barclays brand colours on the STEPS (stepsv3)
// structure — is the standard and the default; "steps" (STEPS Banking Blue) and "ofx" (the earlier MITR indigo look)
// stay selectable. Pure data + lookups so node --test can load it.

export const THEME_KEY = 'ofx-theme';
export const DEFAULT_THEME = 'barclays';

export const THEMES = [
  { id: 'barclays', label: 'Barclays', family: 'Barclays standard', mode: 'light', skin: 'barclays', icon: 'palette', chrome: '#ffffff' },
  { id: 'barclays-dark', label: 'Barclays dark', family: 'Barclays standard', mode: 'dark', skin: 'barclays', icon: 'moon', chrome: '#161b2f' },
  { id: 'steps', label: 'STEPS Banking Blue', family: 'STEPS', mode: 'light', skin: 'steps', icon: 'palette', chrome: '#ffffff' },
  { id: 'steps-dark', label: 'STEPS dark', family: 'STEPS', mode: 'dark', skin: 'steps', icon: 'moon', chrome: '#0b111e' },
  { id: 'dark', label: 'One Finance dark', family: 'One Finance (MITR)', mode: 'dark', skin: 'ofx', icon: 'moon', chrome: '#090d1c' },
  { id: 'light', label: 'One Finance light', family: 'One Finance (MITR)', mode: 'light', skin: 'ofx', icon: 'sun', chrome: '#ffffff' },
];

// Names STEPS and MITR AI persisted map onto the closest console theme.
const ALIASES = {
  'barclays-light': 'barclays', midnight: 'barclays-dark',
  'banking-blue': 'steps', 'steps-light': 'steps', 'regulatory-green': 'steps', blue: 'steps', 'dark-blue': 'steps-dark',
};

export function themeById(id) {
  const key = ALIASES[id] || id;
  return THEMES.find((t) => t.id === key) || THEMES.find((t) => t.id === DEFAULT_THEME);
}

export function isThemeId(id) {
  const key = ALIASES[id] || id;
  return THEMES.some((t) => t.id === key);
}

/** A review link can force a theme (?theme=steps); otherwise the stored choice; otherwise the default. */
export function resolveTheme(forced, stored) {
  if (forced && isThemeId(forced)) return themeById(forced).id;
  if (stored && isThemeId(stored)) return themeById(stored).id;
  return DEFAULT_THEME;
}

/** Tab and installed-style icon for a light or dark theme. */
export function appIconForMode(mode) {
  return mode === 'dark' ? '/app-icon-dark.png' : '/app-icon-light.png';
}

/** Query a framed screen gets, so it sets html[data-theme] + html[data-skin] and paints from the same tokens. */
export function partnerThemeParams(id) {
  const t = themeById(id);
  return { theme: t.mode, skin: t.skin };
}
