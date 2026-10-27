import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EMPTY_CHROME } from './pageChrome.js';

const PageChromeContext = createContext({
  chrome: EMPTY_CHROME,
  setChrome: () => {},
  infoSlot: null,
  setInfoSlot: () => {},
});

export function PageChromeProvider({ children }) {
  const [chrome, setChrome] = useState(EMPTY_CHROME);
  const [infoSlot, setInfoSlotNode] = useState(null);
  // Callback ref so Layout can mount the top-bar info portal target without storing React nodes in chrome state.
  const setInfoSlot = useCallback((node) => { setInfoSlotNode(node); }, []);
  // Do not clear chrome on pathname here: that effect runs after PageHeader's lift and would wipe the title.
  const value = useMemo(() => ({ chrome, setChrome, infoSlot, setInfoSlot }), [chrome, infoSlot, setInfoSlot]);
  return <PageChromeContext.Provider value={value}>{children}</PageChromeContext.Provider>;
}

export function usePageChrome() {
  return useContext(PageChromeContext);
}

/**
 * Publish the page label into the top bar. Clears itself on unmount so the next screen can take over.
 */
export function useLiftPageChrome({ title, icon, context, enabled = true }) {
  const { setChrome } = usePageChrome();
  useEffect(() => {
    if (!enabled) return undefined;
    setChrome({ title: title ?? null, icon: icon ?? null, context: context ?? null });
    return () => setChrome(EMPTY_CHROME);
  }, [enabled, title, icon, context, setChrome]);
}
