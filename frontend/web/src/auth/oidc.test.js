import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, webcrypto } from 'node:crypto';
import { authorizeUrl, base64url, codeChallenge, tokenSubject } from './oidc.js';
import { isIdle } from './idle.js';

test('PKCE S256 challenge is base64url(sha256(verifier))', async () => {
  for (const verifier of ['dBjftJeZ4CVP-mJ92K9xOW7rWW7dgFvM1tTo5wy3P7Vg', 'a'.repeat(43), 'Z9-_~.'.repeat(10)]) {
    const expected = createHash('sha256').update(verifier).digest('base64url');
    assert.equal(await codeChallenge(verifier, webcrypto), expected);
  }
});

test('authorize URL carries PKCE, state and nonce', () => {
  const u = new URL(authorizeUrl('https://idp.bank.local/authorize', { clientId: 'console', redirectUri: 'http://localhost:7091/auth/callback', state: 's1', nonce: 'n1', challenge: 'c1' }));
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.get('code_challenge'), 'c1');
  assert.equal(u.searchParams.get('state'), 's1');
  assert.equal(u.searchParams.get('scope'), 'openid profile email');
});

test('token subject and base64url', () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'u1', preferred_username: 'alice' })).toString('base64url');
  assert.equal(tokenSubject(`x.${payload}.y`), 'alice');
  assert.equal(tokenSubject('garbage'), null);
  assert.equal(base64url(new Uint8Array([251, 255])), '-_8');
});

test('idle lock', () => {
  assert.equal(isIdle(0, 15 * 60_000, 15), true);
  assert.equal(isIdle(0, 14 * 60_000, 15), false);
  assert.equal(isIdle(0, 1e12, 0), false);
});
