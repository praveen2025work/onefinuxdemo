import { useEffect, useId, useRef, useState } from 'react';
import { mermaidConfig, themedSource } from '../lib/mermaidTheme.js';

let renderQueue = Promise.resolve();
let mermaidMod = null;

async function getMermaid() {
  if (!mermaidMod) {
    mermaidMod = (await import('mermaid')).default;
  }
  return mermaidMod;
}

function currentMode() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export default function MermaidFig({ source, title }) {
  const hostRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const [mode, setMode] = useState(currentMode);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setMode(currentMode());
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    let cancelled = false;
    const dark = mode !== 'light';
    const id = `ofx-mmd-${uid}-${mode}`;

    const job = async () => {
      const mermaid = await getMermaid();
      mermaid.initialize(mermaidConfig(dark));
      try {
        const { svg, bindFunctions } = await mermaid.render(id, themedSource(source, dark));
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        const node = hostRef.current.querySelector('svg');
        if (node) {
          node.removeAttribute('height');
          node.setAttribute('width', '100%');
          node.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          node.style.width = '100%';
          node.style.maxWidth = '100%';
          node.style.height = 'auto';
          node.style.background = 'transparent';
          node.setAttribute('role', 'img');
          if (title) node.setAttribute('aria-label', title);
        }
        bindFunctions?.(hostRef.current);
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    };

    renderQueue = renderQueue.then(job, job);
    return () => {
      cancelled = true;
    };
  }, [source, mode, uid, title]);

  return (
    <div className="prod-fig">
      {err ? <p className="muted" style={{ margin: 0, padding: 12 }}>{err}</p> : null}
      <div className="mermaid-host" ref={hostRef} />
    </div>
  );
}
