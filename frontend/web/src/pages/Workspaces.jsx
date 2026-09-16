import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { Loading, PageTitle, StatusPill } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import Select from '../components/Select.jsx';
import WijmoGrid from '../components/WijmoGrid.jsx';

export default function Workspaces() {
  const { filters, instances } = useApp();
  const [search, setSearch] = useSearchParams();
  const [defs, setDefs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    outcomesApi.definitions()
      .then((rows) => { if (alive) setDefs(rows); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const withGrids = useMemo(
    () => (defs || []).filter((d) => Array.isArray(d.grids) && d.grids.length),
    [defs],
  );

  const outcomeId = search.get('outcome') || withGrids[0]?.id || '';
  const outcome = withGrids.find((d) => d.id === outcomeId) || withGrids[0] || null;
  const grids = outcome?.grids || [];
  const gridId = search.get('grid') || grids[0]?.id || '';
  const grid = grids.find((g) => g.id === gridId) || grids[0] || null;

  const instanceId = search.get('instance') || instances[0]?.instanceId || '';
  const instance = instances.find((i) => i.instanceId === instanceId) || instances[0] || null;

  const context = useMemo(() => ({
    cobDate: filters.cobDate,
    region: filters.region || instance?.region || '',
    groupUnitId: filters.groupUnit,
    kitId: instance?.kitId,
    instanceId: instance?.instanceId,
    sliceKey: instance?.sliceKey,
    account: instance?.account,
    journalId: instance?.journalId,
    amount: instance?.amount,
    fsLine: instance?.fsLine,
    runId: instance?.runId,
    status: instance?.status,
    namedBlocker: instance?.namedBlocker,
  }), [filters, instance]);

  function setOutcome(id) {
    const next = new URLSearchParams(search);
    next.set('outcome', id);
    next.delete('grid');
    setSearch(next, { replace: true });
  }

  function setGrid(id) {
    const next = new URLSearchParams(search);
    if (outcome?.id) next.set('outcome', outcome.id);
    next.set('grid', id);
    setSearch(next, { replace: true });
  }

  function setInstance(id) {
    const next = new URLSearchParams(search);
    if (id) next.set('instance', id);
    else next.delete('instance');
    setSearch(next, { replace: true });
  }

  if (error) {
    return <div className="panel"><div className="panel-bd"><div className="banner fail"><div><b>Could not load outcome grids</b><span className="mono-sm">{error}</span></div></div></div></div>;
  }
  if (!defs) return <Loading what="Loading workspaces…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Workspaces · outcome.grids · MESCIUS Wijmo</div>
          <PageTitle icon="grid">Workspaces
            <InfoHint title="Configured on the outcome" width={360}>
              Each business outcome may list grids (endpoint, method, request parameters). This page binds those parameters from the header context and the selected instance, then fetches the endpoint in the browser. The hub does not proxy the grid call. Motif and Helix screens stay with their owners.
            </InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/configuration"><Icon name="config" size={15} /> Outcome config</Link>
        </div>
      </div>

      {withGrids.length === 0 && (
        <div className="empty">No outcome has grids configured. Add a <span className="mono">grids</span> list on the outcome definition.</div>
      )}

      {withGrids.length > 0 && (
        <div className="panel">
          <div className="panel-hd">
            <h2>Outcome</h2>
            <span className="hint">{withGrids.length} with grids</span>
          </div>
          <div className="panel-bd stack">
            <div className="wrapflex">
              {withGrids.map((d) => (
                <button key={d.id} type="button" className={'btn ghost sm' + (d.id === outcome?.id ? ' on' : '')}
                  onClick={() => setOutcome(d.id)}>
                  {d.name}
                </button>
              ))}
            </div>
            {outcome && <p className="muted" style={{ margin: 0 }}>{outcome.question}</p>}
            <div className="row">
              <span className="muted">Bind from instance</span>
              <Select variant="plain" value={instance?.instanceId || ''}
                onChange={setInstance}
                options={[
                  { value: '', label: 'Header filters only' },
                  ...instances.map((i) => ({
                    value: i.instanceId,
                    label: `${i.kitId} · ${i.sliceKey} · ${i.status}`,
                  })),
                ]} />
              {instance && <StatusPill status={instance.status} />}
            </div>
          </div>
        </div>
      )}

      {grids.length > 0 && (
        <div className="panel">
          <div className="panel-hd">
            <h2>{grid?.title || 'Grid'}</h2>
            <span className="hint">MESCIUS FlexGrid</span>
          </div>
          <div className="panel-bd stack">
            <div className="wrapflex">
              {grids.map((g) => (
                <button key={g.id} type="button" className={'btn ghost sm' + (g.id === grid?.id ? ' on' : '')}
                  onClick={() => setGrid(g.id)}>
                  {g.title || g.id}
                </button>
              ))}
            </div>
            {grid && <WijmoGrid grid={grid} context={context} />}
          </div>
        </div>
      )}
    </>
  );
}
