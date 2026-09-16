export default function GenericGrid({ columns = [], rows = [], empty = 'No rows.', query }) {
  return (
    <div className="generic-grid">
      {query && (
        <div className="grid-query">
          <span className="chip">{query.method || 'GET'}</span>
          <span className="mono">{query.endpoint}</span>
          <div className="grid-params">
            {Object.entries(query.params || {}).map(([k, v]) => (
              <span key={k} className="chip">{k}={String(v)}</span>
            ))}
          </div>
        </div>
      )}
      {!columns.length ? (
        <p className="muted" style={{ margin: 0 }}>{empty}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label || c.key}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.eventId || row.sourceKey || row.id || String(i)}>
                  {columns.map((c) => (
                    <td key={c.key} className={statusy(c.key) ? 'sec' : 'mono'}>
                      {fmt(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusy(key) {
  return key === 'eventType' || key === 'status' || key === 'kind';
}

function fmt(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }
  return String(value);
}
