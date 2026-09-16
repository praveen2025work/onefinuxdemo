import { useEffect, useState } from 'react';
import WijmoGrid from './WijmoGrid.jsx';

export default function OutcomeGrids({ definition, context, heading = 'Workspace grids' }) {
  const grids = Array.isArray(definition?.grids) ? definition.grids : [];
  const [gridId, setGridId] = useState(grids[0]?.id || '');

  useEffect(() => {
    setGridId(grids[0]?.id || '');
  }, [definition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!grids.length) return null;
  const grid = grids.find((g) => g.id === gridId) || grids[0];

  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>{heading}</h2>
        <span className="hint">MESCIUS FlexGrid · outcome.grids</span>
      </div>
      <div className="panel-bd stack">
        <div className="wrapflex">
          {grids.map((g) => (
            <button
              key={g.id}
              type="button"
              className={'btn ghost sm' + (g.id === grid.id ? ' on' : '')}
              onClick={() => setGridId(g.id)}
            >
              {g.title || g.id}
            </button>
          ))}
        </div>
        <WijmoGrid grid={grid} context={context} />
      </div>
    </div>
  );
}
