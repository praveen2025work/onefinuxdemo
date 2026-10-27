// Single sign-on: OpenID Connect authorization code with PKCE, in the browser, against the bank identity provider
// the hub names in /api/auth/session. No client secret: the code verifier proves this browser started the login.
// The access token lives in sessionStorage (this tab only) and goes to the hub as a Bearer token.

const PKCE_KEY = 'ofx-oidc';

export function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(bytes = 32, cryptoImpl = globalThis.crypto) {
  const a = new Uint8Array(bytes);
  cryptoImpl.getRandomValues(a);
  return base64url(a);
}

/** RFC 7636 S256: base64url(sha256(verifier)). */
export async function codeChallenge(verifier, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** The authorization request URL for the IdP's authorization endpoint. */
export function authorizeUrl(endpoint, { clientId, redirectUri, scope, state, challenge, nonce }) {
  const u = new URL(endpoint);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', scope || 'openid profile email');
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

/** The subject in a JWT's payload, without verifying it (the hub verifies; the console only shows the name). */
export function tokenSubject(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(part) : Buffer.from(part, 'base64').toString('utf8');
    const claims = JSON.parse(json);
    return claims.preferred_username || claims.email || claims.sub || null;
  } catch {
    return null;
  }
}

async function discovery(issuer) {
  const res = await fetch(issuer.replace(/\/$/, '') + '/.well-known/openid-configuration');
  if (!res.ok) throw new Error(`The identity provider did not answer (${res.status})`);
  return res.json();
}

/** Send the browser to the IdP. `returnTo` is where to land after sign-in. */
export async function startLogin(oidc, returnTo = window.location.pathname + window.location.search) {
  const meta = await discovery(oidc.issuer);
  const verifier = randomString(48);
  const state = randomString(16);
  const nonce = randomString(16);
  const redirectUri = window.location.origin + '/auth/callback';
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo, tokenEndpoint: meta.token_endpoint, redirectUri, clientId: oidc.clientId }));
  window.location.assign(authorizeUrl(meta.authorization_endpoint, {
    clientId: oidc.clientId, redirectUri, scope: oidc.scope, state, nonce, challenge: await codeChallenge(verifier),
  }));
}

/** On /auth/callback: check state, exchange the code for tokens, and return {token, subject, returnTo}. */
export async function completeLogin(search = window.location.search) {
  const q = new URLSearchParams(search);
  if (q.get('error')) throw new Error(q.get('error_description') || q.get('error'));
  const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
  sessionStorage.removeItem(PKCE_KEY);
  if (!saved || !q.get('code') || q.get('state') !== saved.state) throw new Error('This sign-in link is stale. Sign in again.');
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code: q.get('code'), redirect_uri: saved.redirectUri,
    client_id: saved.clientId, code_verifier: saved.verifier,
  });
  const res = await fetch(saved.tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`Sign-in failed at the identity provider (${res.status})`);
  const tokens = await res.json();
  const token = tokens.access_token;
  return { token, subject: tokenSubject(token) || tokenSubject(tokens.id_token || ''), returnTo: saved.returnTo || '/' };
}
