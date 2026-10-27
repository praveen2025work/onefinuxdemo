// Integrated access provisioning: one request for everything a desk needs. Pure helpers for the Access screen.

/**
 * The entitlements a desk needs: the group unit it works in, the CEES product of a kit desk, and the role the user
 * picks. Duplicates collapse; anything already held is left out so the request asks only for what is missing.
 */
export function itemsForDesk(desk, { groupUnit, role, held = {} } = {}) {
  const items = [];
  if (groupUnit) items.push({ kind: 'GROUP_UNIT', value: groupUnit });
  if (desk?.subject?.kind === 'kit' && desk.subject.id) items.push({ kind: 'CEES', value: `product:${String(desk.subject.id).replace(/^kit-/i, '').toUpperCase()}` });
  if (role) items.push({ kind: 'ROLE', value: role });
  const has = (it) => (it.kind === 'GROUP_UNIT' && (held.groupUnits || []).some((g) => g === it.value || g === '*'))
    || (it.kind === 'ROLE' && (held.roles || []).includes(it.value))
    || (it.kind === 'CEES' && (held.ceesProducts || []).includes(it.value));
  const seen = new Set();
  return items.filter((it) => {
    const k = it.kind + ':' + it.value;
    if (seen.has(k) || has(it)) return false;
    seen.add(k);
    return true;
  });
}

/** True when the user's verbs include this one ("*" means every verb). */
export function canDo(me, verb) {
  return Boolean(me?.superuser || (me?.actions || []).includes('*') || (me?.actions || []).includes(verb));
}
