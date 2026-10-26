import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WIDGETS } from '../workspace/widgets.jsx';
import { interopSelf, onOwnChannel } from '../workspace/interop.js';
import { BUILTIN_APPS, appById } from '../workspace/apps.js';
import { PageHeader } from '../components/bits.jsx';

/** /widget/:appId — a Workspace widget in its own document (torn-out window or an iframe view). */
export default function WidgetPage() {
  const { appId } = useParams();
  const Widget = WIDGETS[appId];
  const app = appById(BUILTIN_APPS, appId);
  const [channel, setChannel] = useState(() => interopSelf().channel);
  useEffect(() => onOwnChannel(setChannel), []);

  if (!Widget) return <div className="empty">Unknown widget “{appId}”.</div>;
  return (
    <>
      <PageHeader icon={app?.icon || 'grid'} title={app?.title || appId} info={app?.desc} />
      <div className="panel wg-page"><Widget view={{ id: interopSelf().viewId, channel }} /></div>
    </>
  );
}
