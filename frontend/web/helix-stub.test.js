import assert from 'node:assert/strict';
import { test } from 'node:test';
import { helixStubHtml } from './helix-stub.js';

test('helix stub renders embedded recon without a masthead', () => {
  const html = helixStubHtml(new URLSearchParams({
    groupUnitId: 'REV-ACC',
    outcomeId: 'FOBO|2026-09-12|APAC|R-1042',
    cobDate: '2026-09-12',
    region: 'APAC',
    runId: 'RUN-A37C',
    theme: 'dark',
  }));
  assert.match(html, /data-ofx-embedded="1"/);
  assert.match(html, /FOBO recon/);
  assert.match(html, /BK-4420/);
  assert.match(html, /2026-09-12/);
  assert.doesNotMatch(html, /One Finance/);
});
