import DataGrid from './DataGrid.jsx';

/** Step grid for a feed or a query result, on the standard Wijmo grid. */
export default function GenericGrid({ columns = [], rows = [], empty = 'No rows.', query }) {
  const cols = columns.map((c) => ({
    binding: c.key,
    header: c.label || c.key,
    pill: statusy(c.key),
    mono: !statusy(c.key),
    format: 'n0',
  }));
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
      {!columns.length
        ? <p className="muted" style={{ margin: 0 }}>{empty}</p>
        : <DataGrid rows={rows} columns={cols} height="auto" maxHeight={460} empty={empty} exportName={query?.endpoint?.split('/').pop() || 'step-grid'} />}
    </div>
  );
}

function statusy(key) {
  return key === 'eventType' || key === 'status' || key === 'kind';
}
