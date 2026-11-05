import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRole, conformance, dominantSize, firstFamily, normColor, onScale, snap } from './scale.js';

test('the STEPS scale: Tailwind steps plus the 10/11px badge sizes; 13px only inside a grid', () => {
  for (const s of ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '30px']) assert.equal(onScale(s), true, s);
  for (const s of ['12.5px', '13px', '13.5px', '15px', '9px', '17px']) assert.equal(onScale(s), false, s);
  assert.equal(onScale('13px', { inGrid: true }), true);
  assert.equal(onScale('14.0001px'), true, 'sub-pixel rounding');
});

test('snap moves an off-scale size to the nearest step, ties up', () => {
  assert.equal(snap('12.5px'), 12);
  assert.equal(snap('13px'), 14);
  assert.equal(snap('13.5px'), 14);
  assert.equal(snap('15px'), 16);
  assert.equal(snap('9px'), 10);
  assert.equal(snap('26px'), 24);
});

test('conformance weighs characters and allows 13px grid cells', () => {
  const c = conformance({ '14px': { chars: 900 }, '13px': { chars: 100, grid: 80 }, '12.5px': { chars: 20 } });
  assert.equal(c.total, 1020);
  assert.ok(Math.abs(c.ratio - 980 / 1020) < 1e-9);
  assert.deepEqual(c.off.map((o) => [o.size, o.chars, o.snapTo]), [['13px', 20, 14], ['12.5px', 20, 12]]);
  assert.equal(dominantSize({ '12px': { chars: 3 }, '14px': { chars: 9 } }), '14px');
});

test('colours compare across rgb, rgba and color(srgb) spellings', () => {
  assert.equal(normColor('rgb(0, 109, 227)'), normColor('rgba(0, 109, 227, 1)'));
  assert.equal(normColor('color(srgb 0 0.427451 0.890196)'), '0,109,227');
  assert.equal(normColor('rgba(0, 0, 0, 0)'), '0,0,0/0');
  assert.equal(firstFamily('"Barclays Effra", system-ui'), 'barclays effra');
});

test('compareRole with pairs: height and text size must be one STEPS Button size together', () => {
  const rule = { props: ['height', 'fontSize'], pairs: [[36, 14], [32, 12]] };
  const ok = (h, fs) => compareRole({ height: 36, fontSize: '14px' }, { height: h, fontSize: fs }, rule).every((c) => c.ok);
  assert.equal(ok(32, '12px'), true, 'STEPS sm');
  assert.equal(ok(36, '14px'), true, 'STEPS default');
  assert.equal(ok(32, '14px'), false, 'a 32px button with 14px text is no STEPS size');
});

test('a pill is a pill: 999px and 9999px radii compare equal', () => {
  assert.equal(compareRole({ borderRadius: '9999px' }, { borderRadius: '999px' }, { props: ['borderRadius'] })[0].ok, true);
  assert.equal(compareRole({ borderRadius: '10px' }, { borderRadius: '999px' }, { props: ['borderRadius'] })[0].ok, false);
});

test('compareRole checks sizes, colours and the control heights STEPS uses', () => {
  const ref = { fontSize: '14px', fontWeight: '500', height: 36, backgroundColor: 'rgb(0, 109, 227)' };
  const got = { fontSize: '14px', fontWeight: '600', height: 32, backgroundColor: 'rgba(0, 109, 227, 1)' };
  const r = compareRole(ref, got, { props: ['fontSize', 'fontWeight', 'height', 'backgroundColor'], heights: [32, 36] });
  assert.deepEqual(r.map((x) => [x.prop, x.ok]), [['fontSize', true], ['fontWeight', false], ['height', true], ['backgroundColor', true]]);
});
