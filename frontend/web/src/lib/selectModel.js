/** Pure rules for the shared dropdown: one list, single or many values, and a search box. */

export function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

export function isChosen(value, optionValue, multiple) {
  if (multiple) return asList(value).some((v) => v === optionValue);
  return value === optionValue;
}

export function filterOptions(options, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return options || [];
  return (options || []).filter((o) => {
    const label = String(o?.label ?? '').toLowerCase();
    const val = String(o?.value ?? '').toLowerCase();
    return label.includes(q) || val.includes(q);
  });
}

export function selectionText(options, value, { multiple = false, placeholder = 'Select…' } = {}) {
  const list = options || [];
  if (multiple) {
    const values = asList(value);
    if (!values.length) return placeholder;
    return values.map((v) => list.find((o) => o.value === v)?.label ?? String(v)).join(', ');
  }
  const found = list.find((o) => o.value === value);
  return found ? found.label : placeholder;
}

export function selectionTitle(options, value, multiple) {
  const list = options || [];
  if (!multiple) {
    const found = list.find((o) => o.value === value);
    return found ? String(found.label) : '';
  }
  return asList(value).map((v) => list.find((o) => o.value === v)?.label ?? String(v)).join(', ');
}

export function toggleValue(value, optionValue) {
  const values = asList(value);
  return values.some((v) => v === optionValue) ? values.filter((v) => v !== optionValue) : [...values, optionValue];
}

/** A row for a typed value that is not already in the list. Null when the query is empty or already present. */
export function creatableOption(options, query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const folded = q.toLowerCase();
  const exact = (options || []).some((o) => String(o.label ?? '').toLowerCase() === folded || String(o.value ?? '').toLowerCase() === folded);
  if (exact) return null;
  return { value: q, label: `Add ${q}`, create: true };
}
