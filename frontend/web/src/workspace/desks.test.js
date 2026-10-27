import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  channelInfo, cleanSubject, deskChannel, deskSubjects, deskTemplate, feedItem, isSharedChannel, matchesSubject, mergeFeed, sameSubject,
} from './desks.js';

const FOBO_HELIX = { kind: 'outcome', id: 'FOBO_HELIX', name: 'FOBO investigation' };
const FOBO_KIT = { kind: 'kit', id: 'FOBO', name: 'FOBO rec' };

test('a desk subject is an engine outcome or a kit; anything else is not', () => {
  assert.deepEqual(cleanSubject({ ...FOBO_HELIX, question: 'Can I execute FOBO analysis?' }), { ...FOBO_HELIX, question: 'Can I execute FOBO analysis?' });
  assert.equal(cleanSubject({ kind: 'planet', id: 'X' }), null);
  assert.equal(cleanSubject({ kind: 'outcome', id: 'bad id!' }), null);
  assert.equal(cleanSubject(null), null);
  assert.ok(sameSubject(FOBO_HELIX, { kind: 'outcome', id: 'fobo_helix' }));
  assert.ok(!sameSubject(FOBO_HELIX, { kind: 'kit', id: 'FOBO_HELIX' }));
});

test('each outcome gets one shared channel, kept apart from kits and colours', () => {
  assert.equal(deskChannel(FOBO_HELIX), 'outcome:fobo_helix');
  assert.equal(deskChannel(FOBO_KIT), 'outcome:kit-fobo');
  assert.equal(deskChannel({ kind: 'outcome', id: 'REPORT_15C3' }), 'outcome:report_15c3');
  assert.ok(isSharedChannel('outcome:fobo_helix'));
  assert.ok(!isSharedChannel('blue'));
  assert.ok(!isSharedChannel('app:fobo-desk'));
  assert.deepEqual(channelInfo('outcome:fobo_helix', FOBO_HELIX), { id: 'outcome:fobo_helix', label: 'FOBO investigation desk', color: '#0891b2', shared: true });
  assert.equal(channelInfo('blue').shared, false);
  assert.equal(channelInfo('app:x'), null);
});

test('desk subjects come from engine outcomes and kits, once each', () => {
  const list = deskSubjects(
    [{ outcomeId: 'FOBO_HELIX', name: 'FOBO investigation', question: 'Q', ownerGroup: 'FOBO Controllers', region: 'GLOBAL' },
      { outcomeId: 'FOBO_HELIX', name: 'FOBO investigation', region: 'EMEA' }],
    [{ kitId: 'FOBO', question: 'Can I execute this rec?', groupUnitId: 'REV-ACC' }],
  );
  assert.deepEqual(list.map((s) => `${s.kind}:${s.id}`), ['outcome:FOBO_HELIX', 'kit:FOBO']);
  assert.equal(list[1].name, 'FOBO kit');
});

test('matchesSubject routes hub items to the right desk', () => {
  assert.ok(matchesSubject(FOBO_HELIX, { outcomeId: 'FOBO_HELIX' }));
  assert.ok(matchesSubject(FOBO_HELIX, { outcomeKey: 'FOBO_HELIX/2026-09-12/GLOBAL' }));
  assert.ok(!matchesSubject(FOBO_HELIX, { kitId: 'FOBO' }));
  assert.ok(matchesSubject(FOBO_KIT, { kitId: 'fobo' }));
  assert.ok(matchesSubject(FOBO_KIT, { outcomeKey: 'FOBO|2026-09-12|EMEA' }));
  assert.ok(matchesSubject(FOBO_KIT, { outcomeKey: 'PLATFORM' }), 'announcements reach every desk');
  assert.ok(matchesSubject(null, { kitId: 'ANY' }), 'a free desk hears everything');
  assert.ok(!matchesSubject(FOBO_KIT, null));
});

test('feed items from activity, notifications and shared contexts merge newest first', () => {
  const action = feedItem('activity', { id: 'ACT-1', at: '2026-09-12T10:00:00Z', action: 'SIGN_OFF', actor: 'pk', summary: 'R-2031 signed off' });
  const note = feedItem('notification', { id: 7, createdAt: '2026-09-12T10:05:00Z', severity: 'WARN', transition: 'ESCALATED', title: 'Escalation', message: 'raised' });
  const shared = feedItem('context', { id: 'c1:1', at: Date.parse('2026-09-12T10:02:00Z'), by: 'alex', remote: true, context: { type: 'ofx.instance', id: 'R-2031', kitId: 'FOBO' } });
  assert.deepEqual(action, { id: 'ACT-1', at: '2026-09-12T10:00:00Z', kind: 'action', verb: 'SIGN_OFF', actor: 'pk', text: 'R-2031 signed off', tone: 'ok' });
  assert.equal(note.text, 'Escalation — raised');
  assert.equal(note.tone, 'warn');
  assert.equal(shared.actor, 'alex');
  assert.equal(shared.remote, true);
  assert.deepEqual(mergeFeed([action, shared, note, action]).map((i) => i.id), ['n-7', 'c1:1', 'ACT-1']);
  assert.equal(feedItem('activity', null), null);
});

test('an outcome desk starts with activity, readiness, the report and its lineage grids', () => {
  const t = deskTemplate(FOBO_HELIX, { grids: [{ id: 'investigation', title: 'Investigation' }, { id: 'close' }, { id: 'third' }] });
  assert.equal(t.name, 'FOBO investigation');
  assert.deepEqual(t.views.map((v) => v.appId), ['activity', 'grid', 'reports', 'grid', 'grid']);
  assert.deepEqual(t.views[1].config, { spec: 'outcomes', filter: { outcomeId: 'FOBO_HELIX' }, subject: FOBO_HELIX });
  assert.equal(t.views[2].path, '/reports/FOBO_HELIX');
  assert.equal(t.views[2].channel, null);
  assert.equal(t.views[3].config.spec, 'outcome:FOBO_HELIX:investigation');
  assert.ok(t.views.filter((v) => v.appId !== 'reports').every((v) => v.channel === 'outcome:fobo_helix'));
  assert.equal(deskTemplate({ kind: 'nope' }), null);
});
