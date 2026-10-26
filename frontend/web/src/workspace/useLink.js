import { useCallback, useEffect, useState } from 'react';
import { broadcastContext, interopSelf, onOwnChannel } from './interop.js';
import { instanceContext } from './channels.js';

/** This document's link colour (null outside the Workspace or when unlinked). */
export function useLinkChannel() {
  const [channel, setChannel] = useState(() => interopSelf().channel);
  useEffect(() => onOwnChannel(setChannel), []);
  return channel;
}

/** Share an instance row on the link channel. Returns the shared id, or null when not linked. */
export function useShareInstance() {
  const [picked, setPicked] = useState(null);
  const share = useCallback((inst) => {
    if (!inst?.instanceId) return null;
    if (!broadcastContext(instanceContext(inst))) return null;
    setPicked(inst.instanceId);
    return inst.instanceId;
  }, []);
  return { picked, share };
}
