import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localHits, mergeGroups, safeRoute, searchProvider } from './providers.js';
import { NAV } from '../nav.js';
import { BUILTIN_SPECS } from '../grid/specs.js';

test('localHits finds screens, grids and tasks', () => {
  const groups = localHits('break', { nav: NAV, specs: BUILTIN_SPECS });
  const grids = groups.find((g) => g.group === 'grids');
  assert.ok(grids.hits.some((h) => h.id === 'break-register'));
  assert.equal(grids.hits[0].route, '/grids?spec=break-register');
  const screens = localHits('desks', { nav: NAV, specs: [] }).find((g) => g.group === 'screens');
  assert.equal(screens.hits[0].route, '/desks');
  assert.ok(localHits('feedback', { nav: [], specs: [] }).find((g) => g.group === 'tasks').hits.some((h) => h.action === 'feedback'));
  assert.deepEqual(localHits('a', { nav: NAV }), []);
});

test('mergeGroups orders hub, partners, local and drops empties', () => {
  const g = mergeGroups([{ id: 1 }], [{ id: 'breaks', label: 'Breaks', hits: [{ id: 2 }] }, { id: 'x', hits: [] }], [{ group: 'screens', label: 'Screens', hits: [{ id: 3 }] }]);
  assert.deepEqual(g.map((x) => x.group), ['hub', 'p:breaks', 'screens']);
});

test('partner hits must route inside the console', async () => {
  assert.equal(safeRoute('/grids?spec=x'), '/grids?spec=x');
  assert.equal(safeRoute('//evil.example'), null);
  assert.equal(safeRoute('https://evil.example'), null);
  const fetchImpl = async () => ({ ok: true, json: async () => ({ hits: [
    { kind: 'break', id: 'BK-1', title: 'BK-1 · MB014', detail: 'OPEN', route: '/grids?spec=break-register&focus=BK-1' },
    { title: 'bad', route: 'javascript:alert(1)' },
  ] }) });
  const hits = await searchProvider({ id: 'breaks', url: '/sim/search' }, 'MB014', fetchImpl);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'break');
  assert.deepEqual(await searchProvider({ id: 'x', url: '/x' }, 'q', async () => { throw new Error('down'); }), []);
});
