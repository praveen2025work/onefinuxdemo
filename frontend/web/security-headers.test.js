import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = path.dirname(fileURLToPath(import.meta.url));
const nginx = fs.readFileSync(path.join(webDir, 'nginx.conf'), 'utf8');
const iis = fs.readFileSync(path.join(webDir, 'public/web.config'), 'utf8');

const nginxCsp = /set \$ofx_csp "([^"]+)"/.exec(nginx)[1];
const iisCsp = (ancestors) => {
  const values = [...iis.matchAll(/RESPONSE_Content_Security_Policy[\s\S]*?<action type="Rewrite" value="([^"]+)"/g)].map((m) => m[1]);
  return values.find((v) => v.endsWith(`frame-ancestors ${ancestors}`));
};

test('IIS sends the same Content-Security-Policy as nginx on console pages', () => {
  assert.equal(iisCsp("'self'"), `${nginxCsp}; frame-ancestors 'self'`);
});

test('IIS lets any app frame /widget/ and keeps /api and /sim out of the outbound rewrite', () => {
  assert.equal(iisCsp('*'), `${nginxCsp}; frame-ancestors *`);
  assert.match(iis, /CSP for the embeddable grid[^>]*stopProcessing="true"[\s\S]*?\{REQUEST_URI\}" pattern="\^\/widget\/"/);
  assert.match(iis, /<preCondition name="ConsolePage">\s*<add input="\{REQUEST_URI\}" pattern="\^\/\(api\|sim\)\/" negate="true" \/>/);
});

test('IIS and nginx both send the other security headers', () => {
  for (const name of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy']) {
    assert.match(nginx, new RegExp(`add_header ${name} `), `nginx ${name}`);
    assert.match(iis, new RegExp(`<add name="${name}" value=`), `IIS ${name}`);
  }
  assert.match(iis, /<location path="lib">[\s\S]*?Access-Control-Allow-Origin" value="\*"/);
});
