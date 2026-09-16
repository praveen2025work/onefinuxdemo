import { useEffect, useState } from 'react';
import { FlexGrid, FlexGridColumn } from '@mescius/wijmo.react.grid';
import { bindGridParams, gridRequestUrl } from '../lib/bindGridParams.js';

const TOKEN_KEY = 'ofx-token';

export default function WijmoGrid({ grid, context }) {
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = bindGridParams(grid?.params, context);
  const req = gridRequestUrl(grid?.endpoint, grid?.method, params);

  useEffect(() => {
    if (!grid?.endpoint) {
      setColumns([]);
      setRows([]);
      setError(null);
      return undefined;
    }
    let alive = true;
    setBusy(true);
    setError(null);
    const headers = {};
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
    const init = { method: req.method, headers };
    if (req.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(params);
    }
    fetch(req.url, init)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} on ${grid.endpoint}`);
        return res.json();
      })
      .then((payload) => {
        if (!alive) return;
        setColumns(Array.isArray(payload.columns) ? payload.columns : []);
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
      })
      .catch((e) => {
        if (!alive) return;
        setColumns([]);
        setRows([]);
        setError(e.message);
      })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [grid?.endpoint, grid?.method, req.url, req.method, JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="wijmo-grid">
      <div className="grid-query">
        <span className="chip">{req.method || 'GET'}</span>
        <span className="mono">{grid?.endpoint}</span>
        <div className="grid-params">
          {Object.entries(params).map(([k, v]) => (
            <span key={k} className="chip">{k}={String(v)}</span>
          ))}
        </div>
      </div>
      {error && <p className="muted" style={{ margin: '0 0 8px' }}>{error}</p>}
      {busy && <p className="muted" style={{ margin: '0 0 8px' }}>Loading grid…</p>}
      {!busy && !error && rows.length === 0 && (
        <p className="muted" style={{ margin: '0 0 8px' }}>No rows for this query.</p>
      )}
      <div className="wijmo-host">
        <FlexGrid itemsSource={rows} isReadOnly autoGenerateColumns={columns.length === 0} headersVisibility="Column">
          {columns.map((c) => (
            <FlexGridColumn
              key={c.key}
              binding={c.key}
              header={c.label || c.key}
              width="*"
            />
          ))}
        </FlexGrid>
      </div>
    </div>
  );
}
