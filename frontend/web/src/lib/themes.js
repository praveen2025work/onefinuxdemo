// Console themes. `mode` drives html[data-theme] (every existing light/dark rule keys off it);
// `skin` drives html[data-skin]. "steps" is the STEPS (stepsv3) look: shadcn tokens, Banking Blue.
// Pure data + lookups so node --test can load it.

export const THEME_KEY = 'ofx-theme';
export const DEFAULT_THEME = 'dark';

export const THEMES = [
  { id: 'dark', label: 'One Finance dark', family: 'One Finance', mode: 'dark', skin: 'ofx', icon: 'moon', chrome: '#090d1c' },
  { id: 'light', label: 'One Finance light', family: 'One Finance', mode: 'light', skin: 'ofx', icon: 'sun', chrome: '#ffffff' },
  { id: 'steps', label: 'STEPS Banking Blue', family: 'STEPS', mode: 'light', skin: 'steps', icon: 'palette', chrome: '#2563eb' },
  { id: 'steps-dark', label: 'STEPS dark', family: 'STEPS', mode: 'dark', skin: 'steps', icon: 'moon', chrome: '#0b111e' },
];

// Names STEPS persisted under localStorage['theme'] map onto the closest console theme.
const ALIASES = { 'banking-blue': 'steps', 'steps-light': 'steps', 'regulatory-green': 'steps', blue: 'steps', 'dark-blue': 'steps-dark' };

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

/** Query a partner iframe gets: its theme file only knows light/dark, plus the skin hint. */
export function partnerThemeParams(id) {
  const t = themeById(id);
  return t.skin === 'ofx' ? { theme: t.mode } : { theme: t.mode, skin: t.skin };
}
