import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { EMPTY_CHROME } from './pageChrome.js';

const PageChromeContext = createContext({ chrome: EMPTY_CHROME, setChrome: () => {} });

export function PageChromeProvider({ children }) {
  const [chrome, setChrome] = useState(EMPTY_CHROME);
  // Do not clear on pathname here: that effect runs after PageHeader's lift and would wipe the title.
  // Unmount cleanup on useLiftPageChrome (all cleanups, then new lifts) is enough.
  const value = useMemo(() => ({ chrome, setChrome }), [chrome]);
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
