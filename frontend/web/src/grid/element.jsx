import { createRoot } from 'react-dom/client';
import '../wijmo.js'; // licence key (VITE_WIJMO_LICENSE at build)
import SpecGrid from './SpecGrid.jsx';
import { LIVE_IDS, decodeJson, encodeJson, normalizeSpec, paramContext, shareContext } from './spec.js';
import { BUILTIN_SPECS, builtinSpec } from './specs.js';

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * <ofx-grid>: the One Finance read-only grid as a web component, for any page: Angular, React, .NET Razor, plain HTML.
 *
 *   <link rel="stylesheet" href="https://<one-finance>/lib/onefinux-grid.css">
 *   <script src="https://<one-finance>/lib/onefinux-grid.js"></script>
 *   <ofx-grid base="https://<one-finance>" spec="instances" context='{"groupUnit":"REV-ACC","cobDate":"2026-09-12"}'></ofx-grid>
 *   <ofx-grid spec='{"id":"breaks","source":{"rows":[…]},"columns":[…]}'></ofx-grid>
 *   grid.addEventListener('ofx-select', (e) => use(e.detail.row, e.detail.context));
 *
 * Attributes: spec (a built-in id, or a GridSpec as JSON) | def (encoded spec) | src (URL of a spec JSON);
 * base (One Finance origin for relative endpoints; the hub must allow your origin); context (JSON scope the spec's
 * params bind to); height (px); live (refetch on hub pushes over SSE from `base`, else the spec's refreshSeconds).
 * Method: refresh(). Light DOM, styled by onefinux-grid.css (Wijmo, the One Finance tokens and the grid components,
 * scoped under ofx-grid so the host page is untouched); the theme follows data-theme / data-skin on <html>.
 */
class OfxGridElement extends HTMLElement {
  static get observedAttributes() {
    return ['spec', 'def', 'src', 'base', 'context', 'height', 'live'];
  }

  constructor() {
    super();
    this.listeners = new Set();
    this.tick = 0;
    this.subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  }

  connectedCallback() {
    if (!this.hasAttribute('data-skin')) this.setAttribute('data-skin', document.documentElement.getAttribute('data-skin') || 'steps');
    if (!this.root) this.root = createRoot(this);
    this.load();
  }

  disconnectedCallback() {
    this.closeLive();
    this.root?.unmount();
    this.root = null;
  }

  attributeChangedCallback() {
    if (this.root) this.load();
  }

  /** Refetch the rows now. */
  refresh() {
    this.tick += 1;
    this.render();
  }

  async load() {
    const def = this.getAttribute('def');
    const raw = (this.getAttribute('spec') || '').trim();
    const src = this.getAttribute('src');
    let spec = null;
    if (def) spec = decodeJson(def);
    else if (raw.startsWith('{')) spec = parseJson(raw);
    else if (raw) spec = builtinSpec(raw);
    else if (src) {
      try { spec = await (await fetch(src)).json(); } catch { spec = null; }
    }
    this.spec = spec;
    this.openLive();
    this.render();
  }

  openLive() {
    this.closeLive();
    if (!this.hasAttribute('live') || typeof EventSource === 'undefined') return;
    const base = (this.getAttribute('base') || '').replace(/\/$/, '');
    this.events = new EventSource(`${base}/api/stream`);
    LIVE_IDS.forEach((name) => this.events.addEventListener(name, () => this.listeners.forEach((fn) => fn(name))));
  }

  closeLive() {
    this.events?.close();
    this.events = null;
  }

  render() {
    if (!this.root) return;
    const scope = parseJson(this.getAttribute('context') || '') || {};
    const height = Number(this.getAttribute('height')) || undefined;
    const spec = this.spec;
    const select = (row) => {
      const plain = Object.fromEntries(Object.entries(row || {}).filter(([k]) => !k.startsWith('_')));
      const { spec: clean } = normalizeSpec(spec);
      this.dispatchEvent(new CustomEvent('ofx-select', { bubbles: true, composed: true, detail: { row: plain, context: shareContext(clean, row) } }));
    };
    this.root.render(
      <SpecGrid key={this.tick} spec={spec ?? 'missing'} context={paramContext(scope, scope)} baseUrl={this.getAttribute('base') || ''}
        subscribe={this.subscribe} onSelect={select} height={height} />,
    );
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ofx-grid')) customElements.define('ofx-grid', OfxGridElement);

export { OfxGridElement, BUILTIN_SPECS, normalizeSpec, encodeJson, decodeJson };
