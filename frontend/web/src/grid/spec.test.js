import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyFilter, coerceRows, decodeJson, encodeJson, gridColumns, normalizeSpec, paramContext, requestFor, rowsFrom, shareContext,
} from './spec.js';
import { BUILTIN_SPECS, builtinSpec, outcomeGridSpecs } from './specs.js';

test('normalizeSpec fills defaults and rejects what cannot be shown', () => {
  const { spec, errors } = normalizeSpec({ id: 'breaks', source: { endpoint: '/api/breaks' } });
  assert.deepEqual(errors, []);
  assert.equal(spec.title, 'breaks');
  assert.deepEqual(spec.views, ['grid', 'pivot', 'chart']);
  assert.equal(spec.defaultView, 'grid');
  assert.equal(spec.source.method, 'GET');
  assert.equal(spec.height, 'auto');
  assert.equal(normalizeSpec(null).spec, null);
  assert.equal(normalizeSpec({ source: { rows: [] } }).spec, null);
  assert.equal(normalizeSpec({ id: 'x' }).spec, null);
  assert.match(normalizeSpec({ id: 'x', source: { endpoint: 'javascript:alert(1)' } }).errors[0], /same-origin path or an http/);
  assert.equal(normalizeSpec({ id: 'x', source: { endpoint: '//evil.example/rows' } }).spec, null);
});

test('normalizeSpec keeps valid options and reports the rest', () => {
  const { spec, errors } = normalizeSpec({
    id: 'b', title: '  Breaks  ', source: { rows: [{ a: 1 }, 'junk'] },
    columns: [{ key: 'amount', type: 'money', tones: { OPEN: 'fail', X: 'neon' } }, { key: 'bad key!' }, { key: 'k', type: 'rainbow' }],
    views: ['chart', 'nope'], defaultView: 'pivot', live: ['outcome', 'kafka'], refreshSeconds: 2,
    filter: { status: ['OPEN', 'HOLD'], 'bad key': 1, nested: { a: 1 } },
    share: { type: 'ofx.break', fields: { id: 'breakId', 'x y': 'z' } }, height: 50, rowHeight: 200,
  });
  assert.equal(spec.title, 'Breaks');
  assert.deepEqual(spec.source.rows, [{ a: 1 }]);
  assert.deepEqual(spec.columns.map((c) => [c.key, c.type]), [['amount', 'money'], ['k', 'text']]);
  assert.deepEqual(spec.columns[0].tones, { OPEN: 'fail' });
  assert.deepEqual(spec.views, ['chart']);
  assert.equal(spec.defaultView, 'chart');
  assert.deepEqual(spec.live, ['outcome']);
  assert.equal(spec.refreshSeconds, 10);
  assert.deepEqual(spec.filter, { status: ['OPEN', 'HOLD'] });
  assert.deepEqual(spec.share, { type: 'ofx.break', fields: { id: 'breakId' } });
  assert.equal(spec.height, 120);
  assert.equal(spec.rowHeight, 80);
  assert.equal(errors.length, 2);
});

test('an outcome definition grid entry is a spec too', () => {
  const { spec } = normalizeSpec({ id: 'investigation', endpoint: '/sim/grids/investigation', method: 'get', params: [{ name: 'cobDate', from: 'cobDate' }] });
  assert.equal(spec.source.endpoint, '/sim/grids/investigation');
  assert.deepEqual(requestFor(spec, paramContext({ groupUnit: 'REV-ACC', cobDate: '2026-09-12' })), {
    url: '/sim/grids/investigation?cobDate=2026-09-12', method: 'GET', params: { cobDate: '2026-09-12' },
  });
  assert.equal(requestFor(normalizeSpec({ id: 's', source: { rows: [] } }).spec, {}), null);
});

test('rowsFrom finds the rows and applies the filter', () => {
  const spec = normalizeSpec({ id: 'e', source: { endpoint: '/api/stitch/rtb', rowsPath: 'escalations' }, filter: { status: 'OPEN' } }).spec;
  assert.deepEqual(rowsFrom({ escalations: [{ status: 'OPEN', id: 1 }, { status: 'CLOSED', id: 2 }] }, spec), [{ status: 'OPEN', id: 1 }]);
  assert.deepEqual(rowsFrom([{ a: 1 }, null], null), [{ a: 1 }]);
  assert.deepEqual(rowsFrom({ rows: [{ a: 2 }] }, null), [{ a: 2 }]);
  assert.deepEqual(rowsFrom('nope', null), []);
  assert.deepEqual(applyFilter([{ k: 1 }, { k: 2 }], { k: [2, 3] }), [{ k: 2 }]);
  assert.deepEqual(applyFilter([{ a: { b: 'x' } }, { a: { b: 'y' } }], { 'a.b': 'y' }), [{ a: { b: 'y' } }]);
});

test('gridColumns maps types onto the standard grid', () => {
  const spec = normalizeSpec({ id: 'c', source: { rows: [] }, columns: [
    { key: 'amount', label: 'Amount', type: 'money' }, { key: 'pct', type: 'percent' }, { key: 'status', type: 'status', tones: { OPEN: 'fail' } },
    { key: 'at', type: 'datetime' }, { key: 'book', type: 'chip' }, { key: 'n', type: 'number', format: 'n2' },
  ] }).spec;
  const cols = gridColumns(spec);
  assert.deepEqual(cols[0], { binding: 'amount', header: 'Amount', format: 'n2', align: 'right', mono: true });
  assert.equal(cols[1].suffix, '%');
  assert.equal(cols[2].pill, true);
  assert.equal(cols[2].tone('OPEN'), 'fail');
  assert.equal(cols[2].tone('OTHER'), null);
  assert.equal(cols[3].format, 'yyyy-MM-dd HH:mm');
  assert.equal(cols[4].chip, true);
  assert.equal(cols[5].format, 'n2');
  const declared = gridColumns(normalizeSpec({ id: 'd', source: { endpoint: '/x' } }).spec, [{ key: 'status', label: 'Status' }, { key: 'note' }]);
  assert.deepEqual(declared.map((c) => [c.binding, Boolean(c.pill)]), [['status', true], ['note', false]]);
  assert.equal(gridColumns(normalizeSpec({ id: 'd', source: { endpoint: '/x' } }).spec), null);
});

test('dates become Dates; a pick becomes the configured context', () => {
  const spec = normalizeSpec({ id: 'x', source: { rows: [] }, columns: [{ key: 'at', type: 'date' }],
    share: { type: 'ofx.instance', fields: { id: 'instanceId', region: 'region' } } }).spec;
  const [row] = coerceRows([{ at: '2026-09-12', instanceId: 'R-1' }], spec);
  assert.ok(row.at instanceof Date);
  assert.deepEqual(shareContext(spec, { instanceId: 'R-1', region: 'EMEA' }), { type: 'ofx.instance', id: 'R-1', region: 'EMEA' });
  assert.equal(shareContext(spec, { other: 1 }), null);
  assert.equal(shareContext(normalizeSpec({ id: 'n', source: { rows: [] } }).spec, { a: 1 }), null);
});

test('a spec travels in a URL and comes back intact', () => {
  const spec = { id: 'breaks', title: 'Breaks — €', source: { rows: [{ k: 'ü' }] } };
  const text = encodeJson(spec);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeJson(text), spec);
  assert.equal(decodeJson('not base64 json'), null);
  assert.equal(decodeJson(encodeJson([1, 2])), null);
  assert.equal(decodeJson(''), null);
});

test('every built-in spec is valid; outcome grids become specs', () => {
  for (const s of BUILTIN_SPECS) {
    const { spec, errors } = normalizeSpec(s);
    assert.ok(spec, s.id);
    assert.deepEqual(errors, [], s.id);
  }
  assert.equal(new Set(BUILTIN_SPECS.map((s) => s.id)).size, BUILTIN_SPECS.length);
  assert.equal(builtinSpec('instances').share.type, 'ofx.instance');
  assert.equal(builtinSpec('nope'), null);
  const specs = outcomeGridSpecs([{ id: 'FOBO_HELIX', name: 'FOBO investigation', question: 'Q', grids: [
    { id: 'investigation', title: 'Investigation', endpoint: '/sim/grids/investigation', params: [{ name: 'cobDate', from: 'cobDate' }] },
    { id: 'broken' },
  ] }, { id: 'NO_GRIDS' }]);
  assert.deepEqual(specs.map((s) => s.id), ['outcome:FOBO_HELIX:investigation']);
  assert.ok(normalizeSpec(specs[0]).spec);
});
