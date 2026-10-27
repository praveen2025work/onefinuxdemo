import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navForPath, resolveTopTitle } from './pageChrome.js';

test('navForPath prefers the longest matching prefix and respects end', () => {
  assert.equal(navForPath('/').label, 'Home');
  assert.equal(navForPath('/finance').label, 'Finance dashboards');
  assert.equal(navForPath('/finance/finance').label, 'Finance dashboards');
  assert.equal(navForPath('/grids').label, 'Grid library');
  assert.equal(navForPath('/reports/FOBO').to, '/reports');
});

test('resolveTopTitle prefers a lifted chrome title over the nav label', () => {
  const lifted = resolveTopTitle({ title: 'Finance dashboard', icon: 'dollar', context: 'REV-ACC' }, '/finance/finance');
  assert.equal(lifted.title, 'Finance dashboard');
  assert.equal(lifted.icon, 'dollar');
  const fallback = resolveTopTitle({ title: null }, '/board');
  assert.equal(fallback.title, 'Outcome board');
  assert.equal(fallback.icon, 'board');
  assert.equal(resolveTopTitle({ title: null }, '/nope'), null);
});
