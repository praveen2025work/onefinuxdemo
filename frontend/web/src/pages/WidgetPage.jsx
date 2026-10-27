import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WIDGETS } from '../workspace/widgets.jsx';
import { interopSelf, onOwnChannel } from '../workspace/interop.js';
import { BUILTIN_APPS, appById } from '../workspace/apps.js';
import { PageHeader } from '../components/bits.jsx';
import { decodeJson } from '../grid/spec.js';

/**
 * /widget/:appId — a desk widget in its own document (a torn-out window or an iframe view).
 * It is also how another team embeds a One Finance grid in its own app:
 *   <iframe src="https://<one-finance>/widget/grid?ofx-embed=1&spec=instances&theme=light">
 *   <iframe src="https://<one-finance>/widget/grid?ofx-embed=1&def=<encodeJson(spec)>">
 * A row pick is posted to the embedding page as { type: 'ofx.grid.select', context, row } (to its origin only).
 */
export default function WidgetPage() {
  const { appId } = useParams();
  const Widget = WIDGETS[appId];
  const app = appById(BUILTIN_APPS, appId);
  const [channel, setChannel] = useState(() => interopSelf().channel);
  useEffect(() => onOwnChannel(setChannel), []);

  const config = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    const fromView = decodeJson(qs.get('ofx-config') || '') || {};
    const def = decodeJson(qs.get('def') || '');
    const spec = def || qs.get('spec') || fromView.spec;
    return spec ? { ...fromView, spec } : fromView;
  }, []);

  if (!Widget) return <div className="empty">Unknown widget “{appId}”.</div>;
  return (
    <>
      <PageHeader icon={app?.icon || 'grid'} title={app?.title || appId} info={app?.desc} />
      <div className="panel wg-page"><Widget view={{ id: interopSelf().viewId, channel, config }} /></div>
    </>
  );
}
