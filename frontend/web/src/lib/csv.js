// CSV export for grids. RFC 4180 quoting; formula-leading cells are prefixed so a spreadsheet does not
// execute them (CSV injection). Pure: node --test loads it.

function cell(value) {
  if (value == null) return '';
  let text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** rows: array of objects. header: [{ key, label }] or null to use the keys of the first row. */
export function rowsToCsv(rows = [], header = null) {
  const cols = header && header.length
    ? header
    : Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));
  const lines = [cols.map((c) => cell(c.label ?? c.key)).join(',')];
  for (const row of rows) lines.push(cols.map((c) => cell(row?.[c.key])).join(','));
  return lines.join('\r\n') + '\r\n';
}
