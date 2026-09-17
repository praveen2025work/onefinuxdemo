import Icon from './Icon.jsx';
import InfoHint from './InfoHint.jsx';
import { BLANK_GRID, BLANK_PARAM, GRID_FROM } from '../lib/outcomeForm.js';

export default function GridConfigFields({ grids = [], onChange }) {
  function setGrid(i, patch) {
    onChange(grids.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }
  function setParam(gi, pi, patch) {
    onChange(grids.map((g, idx) => {
      if (idx !== gi) return g;
      return { ...g, params: g.params.map((p, j) => (j === pi ? { ...p, ...patch } : p)) };
    }));
  }
  function addGrid() { onChange([...grids, { ...BLANK_GRID, params: [{ ...BLANK_PARAM, name: 'cobDate' }] }]); }
  function removeGrid(i) { onChange(grids.filter((_, idx) => idx !== i)); }
  function addParam(gi) {
    onChange(grids.map((g, idx) => idx === gi ? { ...g, params: [...g.params, { ...BLANK_PARAM }] } : g));
  }
  function removeParam(gi, pi) {
    onChange(grids.map((g, idx) => {
      if (idx !== gi) return g;
      const params = g.params.filter((_, j) => j !== pi);
      return { ...g, params: params.length ? params : [{ ...BLANK_PARAM }] };
    }));
  }

  return (
    <div className="field">
      <label>Lineage grids <InfoHint title="Console fetches; hub does not proxy" width={320}>
        Optional. Each grid is a MESCIUS FlexGrid after Grid view on the instance and report.
        Name an HTTP path the console calls (simulator <span className="mono">/sim/grids/…</span> in the demo)
        and bind request parameters from context (<span className="mono">from</span>) or a literal (<span className="mono">value</span>).
      </InfoHint>
        <span className="muted"> — optional · {grids.length} configured</span></label>
      <div className="ob-feeds">
        {grids.length === 0 && (
          <div className="ob-feed" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            No grids. Grid view stays hidden for this outcome until you add one.
          </div>
        )}
        {grids.length > 0 && (
          <div className="ob-feed ob-feed-hd ob-grid-hd">
            <span>Id</span><span>Title</span><span>Endpoint</span><span>Method</span><span />
          </div>
        )}
        {grids.map((g, i) => (
          <div className="ob-grid" key={i}>
            <div className="ob-feed">
              <input className="inp mono" placeholder="investigation" value={g.id}
                onChange={(e) => setGrid(i, { id: e.target.value.replace(/[^A-Za-z0-9_-]/g, '_') })} />
              <input className="inp" placeholder="Investigation" value={g.title}
                onChange={(e) => setGrid(i, { title: e.target.value })} />
              <input className="inp mono" placeholder="/sim/grids/investigation" value={g.endpoint}
                onChange={(e) => setGrid(i, { endpoint: e.target.value })} />
              <select className="inp" value={g.method || 'GET'} onChange={(e) => setGrid(i, { method: e.target.value })}>
                <option>GET</option>
                <option>POST</option>
              </select>
              <button type="button" className="ob-x" title="Remove grid" aria-label="Remove grid" onClick={() => removeGrid(i)}>
                <Icon name="x" size={13} />
              </button>
            </div>
            <div className="ob-params">
              {(g.params || []).map((p, pi) => (
                <div className="ob-param" key={pi}>
                  <input className="inp mono" placeholder="name" value={p.name}
                    onChange={(e) => setParam(i, pi, { name: e.target.value })} />
                  <select className="inp" value={p.from || ''} onChange={(e) => setParam(i, pi, { from: e.target.value, value: e.target.value ? '' : p.value })}>
                    <option value="">literal value</option>
                    {GRID_FROM.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input className="inp mono" placeholder={p.from ? 'from context' : 'value'} value={p.value}
                    disabled={Boolean(p.from)} onChange={(e) => setParam(i, pi, { value: e.target.value, from: '' })} />
                  <button type="button" className="ob-x" title="Remove parameter" aria-label="Remove parameter" onClick={() => removeParam(i, pi)}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={() => addParam(i)}><Icon name="plus" size={12} /> Parameter</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" onClick={addGrid}><Icon name="plus" size={13} /> Add grid</button>
    </div>
  );
}
