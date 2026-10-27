import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { outcomesApi } from '../api.js';
import { Loading } from '../components/bits.jsx';

/**
 * /reports/:outcomeId — this outcome's report for the current business date and region (or its latest), so an
 * outcome desk can hold "the report" without knowing the COB when the desk was built.
 */
export default function OutcomeReport() {
  const { outcomeId } = useParams();
  const { filters } = useApp();
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let alive = true;
    outcomesApi.all().then((list) => {
      const mine = list.filter((o) => o.outcomeId === outcomeId);
      const chosen = mine.find((o) => o.cobDate === filters.cobDate && (!filters.region || o.region === filters.region))
        || mine.find((o) => o.cobDate === filters.cobDate)
        || mine.slice().sort((a, b) => String(b.cobDate).localeCompare(String(a.cobDate)))[0];
      if (alive) setTarget(chosen ? `/reports/${encodeURIComponent(chosen.outcomeId)}/${chosen.cobDate}/${encodeURIComponent(chosen.region)}` : 'none');
    }).catch(() => { if (alive) setTarget('none'); });
    return () => { alive = false; };
  }, [outcomeId, filters.cobDate, filters.region]);

  if (!target) return <Loading what="Finding the report…" />;
  if (target === 'none') return <div className="empty">No {outcomeId} report for this business date yet.</div>;
  return <Navigate to={target} replace />;
}
