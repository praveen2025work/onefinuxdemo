export function entitledGroupUnit(stored, units = []) {
  const ids = units.map((u) => u?.groupUnitId).filter(Boolean);
  if (stored && ids.includes(stored)) return stored;
  return ids[0] || '';
}
