import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_THEME, THEMES, appIconForMode, isThemeId, partnerThemeParams, resolveTheme, themeById } from './themes.js';

test('STEPS Banking Blue is the default and first theme', () => {
  assert.equal(DEFAULT_THEME, 'steps');
  assert.equal(THEMES[0].id, 'steps');
  assert.deepEqual(THEMES.map((t) => `${t.mode}/${t.skin}`), ['light/steps', 'dark/steps', 'dark/ofx', 'light/ofx']);
});

test('theme names STEPS stored map onto console themes', () => {
  assert.equal(themeById('banking-blue').id, 'steps');
  assert.equal(themeById('dark-blue').id, 'steps-dark');
  assert.equal(themeById('neon').id, 'steps');
  assert.equal(isThemeId('regulatory-green'), true);
  assert.equal(isThemeId('neon'), false);
});

test('resolveTheme: forced, then stored, then the default', () => {
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('neon', 'light'), 'light');
  assert.equal(resolveTheme(null, 'banking-blue'), 'steps');
  assert.equal(resolveTheme(null, null), 'steps');
});

test('light and dark themes use their own app icon', () => {
  assert.equal(appIconForMode('light'), '/app-icon-light.png');
  assert.equal(appIconForMode('dark'), '/app-icon-dark.png');
  assert.equal(appIconForMode(undefined), '/app-icon-light.png');
});

test('framed screens get mode and skin', () => {
  assert.deepEqual(partnerThemeParams('steps-dark'), { theme: 'dark', skin: 'steps' });
  assert.deepEqual(partnerThemeParams('light'), { theme: 'light', skin: 'ofx' });
  assert.deepEqual(partnerThemeParams(undefined), { theme: 'light', skin: 'steps' });
});
