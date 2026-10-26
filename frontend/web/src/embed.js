// Where this document is running. One Finance is the shell; inside the Workspace each screen is the
// same SPA in an iframe (or a torn-out window) with ?ofx-embed=1, so it renders without rail or top bar.
// Read once at boot: client-side navigation inside a view never drops these flags.

const params = new URLSearchParams(window.location.search);
const nameTag = String(window.name || '');

export const EMBED = params.get('ofx-embed') === '1' || nameTag.startsWith('ofx-view:');
export const EMBED_VIEW_ID = params.get('ofx-view') || (nameTag.startsWith('ofx-view:') ? nameTag.slice(9) : null);
export const EMBED_CHANNEL = params.get('ofx-channel') || null;
export const EMBED_TITLE = params.get('ofx-title') || null;

function sameOriginParent() {
  try {
    return window.parent !== window && window.parent.location.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Inside a same-origin Workspace iframe. Such a view never owns the live socket; the host does. */
export const FRAMED = sameOriginParent();

/** A view torn out of the Workspace into its own window. It draws a slim header with link + dock. */
export const POPPED = EMBED && !FRAMED;

/** Scope handed over by the host on the iframe URL. */
export function embedScope() {
  const scope = {};
  for (const key of ['groupUnit', 'cobDate', 'region']) {
    const v = params.get(key);
    if (v != null) scope[key] = v;
  }
  return scope;
}
