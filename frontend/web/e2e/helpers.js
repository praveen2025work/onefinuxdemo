// Sign in as a demo identity (the hub's dev tokens) for this browser tab.
export async function signInAs(page, user) {
  await page.goto('/product');
  await page.evaluate(async (u) => {
    if (!u) { sessionStorage.removeItem('ofx-token'); sessionStorage.setItem('ofx-actor', 'praveen.kumar'); return; }
    const r = await fetch('/api/auth/dev-token?user=' + encodeURIComponent(u), { method: 'POST' }).then((x) => x.json());
    sessionStorage.setItem('ofx-token', r.access_token);
    sessionStorage.setItem('ofx-actor', r.subject);
  }, user);
}

/** Collect uncaught page errors so a test can assert there were none. */
export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
