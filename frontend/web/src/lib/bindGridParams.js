/** Bind outcome.grids request parameters from the current console context. */

export function bindGridParams(spec, context) {
  const params = {};
  if (!Array.isArray(spec)) return params;
  const ctx = context || {};
  for (const item of spec) {
    if (!item || !item.name) continue;
    const literal = item.value;
    if (literal != null && String(literal) !== '') {
      params[item.name] = String(literal);
      continue;
    }
    if (!item.from) continue;
    const bound = ctx[item.from];
    if (bound == null || bound === '') continue;
    params[item.name] = String(bound);
  }
  return params;
}

export function gridRequestUrl(endpoint, method, params) {
  const verb = (method || 'GET').toUpperCase();
  const bound = params || {};
  if (verb !== 'GET') {
    return { url: endpoint, method: verb, params: bound };
  }
  const qs = new URLSearchParams(bound).toString();
  if (!qs) return { url: endpoint, method: verb, params: bound };
  const join = String(endpoint || '').includes('?') ? '&' : '?';
  return { url: `${endpoint}${join}${qs}`, method: verb, params: bound };
}
