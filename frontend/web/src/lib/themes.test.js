import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_THEME, THEMES, appIconForMode, isThemeId, partnerThemeParams, resolveTheme, themeById } from './themes.js';

test('Barclays is the default and first theme; STEPS and MITR stay selectable', () => {
  assert.equal(DEFAULT_THEME, 'barclays');
  assert.equal(THEMES[0].id, 'barclays');
  assert.deepEqual(THEMES.map((t) => `${t.mode}/${t.skin}`), ['light/barclays', 'dark/barclays', 'light/steps', 'dark/steps', 'dark/ofx', 'light/ofx']);
});

test('theme names STEPS and MITR stored map onto console themes', () => {
  assert.equal(themeById('banking-blue').id, 'steps');
  assert.equal(themeById('dark-blue').id, 'steps-dark');
  assert.equal(themeById('midnight').id, 'barclays-dark');
  assert.equal(themeById('neon').id, 'barclays');
  assert.equal(isThemeId('regulatory-green'), true);
  assert.equal(isThemeId('neon'), false);
});

test('resolveTheme: forced, then stored, then the default', () => {
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('neon', 'light'), 'light');
  assert.equal(resolveTheme(null, 'banking-blue'), 'steps');
  assert.equal(resolveTheme(null, null), 'barclays');
});

test('light and dark themes use their own app icon', () => {
  assert.equal(appIconForMode('light'), '/app-icon-light.png');
  assert.equal(appIconForMode('dark'), '/app-icon-dark.png');
  assert.equal(appIconForMode(undefined), '/app-icon-light.png');
});

test('framed screens get mode and skin', () => {
  assert.deepEqual(partnerThemeParams('barclays-dark'), { theme: 'dark', skin: 'barclays' });
  assert.deepEqual(partnerThemeParams('steps-dark'), { theme: 'dark', skin: 'steps' });
  assert.deepEqual(partnerThemeParams('light'), { theme: 'light', skin: 'ofx' });
  assert.deepEqual(partnerThemeParams(undefined), { theme: 'light', skin: 'barclays' });
});
