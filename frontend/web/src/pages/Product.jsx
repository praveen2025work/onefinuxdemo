import { Link, useSearchParams } from 'react-router-dom';
import InfoHint from '../components/InfoHint.jsx';
import Icon from '../components/Icon.jsx';

const TABS = [
  { id: 'product', label: 'Product' },
  { id: 'works', label: 'How it works' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'screens', label: 'Screens & setup' },
];

const SCREENS = [
  { to: '/', title: 'Home', who: 'Everyone', job: 'Morning glance: ready / blocked / delayed / escalations for the unit.', creates: 'Nothing — read + pick a job', not: 'Scenario buttons' },
  { to: '/product', title: 'Product', who: 'Everyone', job: 'What the platform is, how the fold works, architecture diagrams, and how to set up a screen.', creates: 'This guide', not: 'Live outcomes' },
  { to: '/onboarding', title: 'Onboarding', who: 'Maker', job: 'Create a live OutcomeDefinition: question, feeds, SLA, on-ready action.', creates: 'A new outcome (data, not a release)', not: 'Inspecting every existing outcome' },
  { to: '/configuration', title: 'Configuration', who: 'Owner / config', job: 'Govern the registry. Pick an outcome or kit on the left; anatomy and live state on the right.', creates: 'Nothing — inspect and bind', not: 'A create form (that is Onboarding)' },
  { to: '/drive', title: 'Drive scenarios', who: 'Demo / QA', job: 'Reset and inject COB facts. Product pages stay view-only.', creates: 'Simulator events into the hub', not: 'Buttons on Home or Reports' },
  { to: '/reports', title: 'Reports', who: 'Controller', job: 'Engine outcomes and the 15C3 five-stage pack: feeds → ready → processing → generated → available.', creates: 'Nothing — view the artifact', not: 'Scenario buttons' },
  { to: '/board', title: 'Outcome board', who: 'CIO / MD / BU head', job: 'Traffic lights for the whole unit. Named blocker, SLA, escalation count.', creates: 'Nothing — read only', not: 'Sign-off or post' },
  { to: '/outcomes', title: 'My outcomes', who: 'Outcome user', job: 'Doer worklist. Open a ready instance to sign off or post.', creates: 'Nothing until you open an instance', not: 'Head roll-ups or RTB queues' },
  { to: '/operations', title: 'Operations', who: 'RTB', job: 'Escalations, watermarks, dead letters, dual-control replay.', creates: 'Replay / escalate (audited)', not: 'Business sign-off' },
  { to: '/monitoring', title: 'Monitoring', who: 'RTB / engineering', job: 'Received → persisted → propagated → audited.', creates: 'Nothing — observe the tape', not: 'Business sign-off' },
];

const DIAGRAMS = [
  { src: '/diagrams/01-enterprise-context.svg', title: '1. Enterprise context', caption: 'Unchanged systems of record publish facts. The hub folds them. Entitled frontend/web is the only UX.' },
  { src: '/diagrams/02-deployment-containers.svg', title: '2. Deployment', caption: 'Three processes: console 5173, hub 7070 (REST + SSE), simulator 7081. Browser never touches a bus.' },
  { src: '/diagrams/03-event-sequence.svg', title: '3. Event sequence', caption: 'Fact → translate → deterministic fold → ActionExecutor → outbox → SSE back to the console.' },
  { src: '/diagrams/04-data-model.svg', title: '4. Data model', caption: 'Stitch kit (sources, destinations, embed, userActions) plus the engine projection on the same event store.' },
  { src: '/diagrams/05-outcome-state.svg', title: '5. Stitch states', caption: 'Human kit: NOT_YET → READY → CLEARED (or BLOCKED / DELAYED / ESCALATED). Sign-off is audited.' },
  { src: '/diagrams/06-engine-stage.svg', title: '6. Engine stages', caption: 'Report lifecycle: NOT_STARTED → FEEDS → READY → PROCESSING → GENERATED | AVAILABLE.' },
];

export default function Product() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'product';
  function go(id) { setParams(id === 'product' ? {} : { tab: id }, { replace: true }); }

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">One Finance UX · product, architecture, setup</div>
          <h1 className="ph-title">Product
            <InfoHint title="Product">The live guide for this console. Same content as docs/design — architecture diagrams, how the fold works, every screen, and how to run it.</InfoHint>
          </h1>
          <p className="sub">A thin outcome layer. Origins stay origins. Destinations stay destinations. We stitch their facts into Ready / Blocked / Delayed and act when ready.</p>
        </div>
        <div className="seg">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'product' && <ProductTab />}
      {tab === 'works' && <WorksTab />}
      {tab === 'architecture' && <ArchitectureTab />}
      {tab === 'screens' && <ScreensTab />}
    </>
  );
}

function ProductTab() {
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat info"><div className="lbl">The question</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Can I run this rec / produce this report / post this book?</div><div className="foot">one answer per outcome, per COB, per region</div></div>
        <div className="stat ok"><div className="lbl">What we unify</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Group unit · two models · one instance row</div><div className="foot">products are data, never a Java type</div></div>
        <div className="stat"><div className="lbl">What we do not do</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Rebuild Helix, Motif or Axiom</div><div className="foot">heavy screens stay partner iframes</div></div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Two complementary models</h2><span className="hint">share one event backbone</span></div>
        <div className="panel-bd">
          <div className="grid g2">
            <div className="oc" style={{ cursor: 'default' }}>
              <div className="oc-hd"><span className="pill info">Outcome Engine</span></div>
              <h3>Business question</h3>
              <p className="q">An <span className="mono">OutcomeDefinition</span> is question + feeds + SLA + on-ready. Seeded: FOBO_HELIX, REPORT_15C3, PNL_REPORTING. Runtime onboard: POST /api/outcomes/definitions. On ready, ActionExecutor runs HTTP_COMMAND or LOG_COMMAND — no polling.</p>
            </div>
            <div className="oc" style={{ cursor: 'default' }}>
              <div className="oc-hd"><span className="pill bo">Stitch console kit</span></div>
              <h3>Human work</h3>
              <p className="q">A kit is sources + destinations + embed + userActions. FOBO is the first kit — there is no FOBO code path. Sign-off, post, escalate and kit-declared verbs (AMEND) go through POST /api/stitch/instance/action.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Worked example (must match every screen)</h2><span className="hint">design contract</span></div>
        <div className="panel-bd">
          <p className="muted" style={{ marginTop: 0 }}>REV-ACC → FOBO → <span className="mono">R-1042 READY (RUN-A37C)</span> / <span className="mono">R-2031 BLOCKED (MOTIF MB014, ESC-19, DL-4402)</span>. Sources: CATS, MOTIF, MBR.</p>
          <div className="wrapflex">
            <Link className="btn" to="/product?tab=architecture">Open architecture</Link>
            <Link className="btn ghost" to="/product?tab=screens">Screens &amp; setup</Link>
            <Link className="btn ghost" to="/onboarding">Create an outcome</Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Brand and shell</h2></div>
        <div className="panel-bd stack">
          <p className="muted" style={{ margin: 0 }}>Solid finance dashboard. Charcoal canvas, opaque cards, dark navy rail in both themes. Cerulean <span className="mono">#00aeef</span> accent. Gold UAT chip. Status colour on KPI tiles. No frosted glass.</p>
          <p className="muted" style={{ margin: 0 }}>Below 820px the rail collapses to icons. A native app can wrap this shell — do not build a second product.</p>
        </div>
      </div>
    </>
  );
}

function WorksTab() {
  return (
    <>
      <div className="panel">
        <div className="panel-hd"><h2>How a fact becomes a screen</h2><span className="hint">browser never touches the bus</span></div>
        <div className="panel-bd">
          <ol className="prod-ol">
            <li><b>Publish.</b> Motif / SAP / the simulator POST a fact to <span className="mono">/api/events</span>. Ingest is idempotent on <span className="mono">eventId</span>.</li>
            <li><b>Translate.</b> The hub maps the source key onto a business identity (group unit, COB, region, instance).</li>
            <li><b>Fold.</b> Outcome Engine matches <span className="mono">eventType + sourceSystem</span>. Stitch fold counts distinct keys. Status is a replay of the event store.</li>
            <li><b>Act.</b> When READY and on-ready is not NOTIFY_ONLY, ActionExecutor runs (HTTP_COMMAND to Helix / Axiom, or LOG_COMMAND).</li>
            <li><b>Echo.</b> Downstream completions must carry <span className="mono">runId</span>. Stale runs are ignored. A reportId attaches an artifact and the stage becomes AVAILABLE.</li>
            <li><b>Notify.</b> SSE pushes outcome, notification and event to the console. Restarts rebuild the board; notifications are not re-sent.</li>
          </ol>
        </div>
      </div>

      <div className="grid g2">
        <div className="panel">
          <div className="panel-hd"><h2>Stitch fold</h2><span className="hint">human kit</span></div>
          <div className="panel-bd tight">
            <table className="tbl">
              <thead><tr><th>When</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>Any required key FAILED</td><td><span className="pill fail">BLOCKED</span> — named blocker</td></tr>
                <tr><td>Else any key WAITING</td><td><span className="pill">NOT_YET</span> or <span className="pill warn">DELAYED</span> past SLA</td></tr>
                <tr><td>All keys COMPLETED</td><td><span className="pill ok">READY</span></td></tr>
                <tr><td>User signs off READY</td><td><span className="pill ok">CLEARED</span></td></tr>
                <tr><td>Upstream restates</td><td>REVOKED withdraws the completion</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h2>Engine stages</h2><span className="hint">report / command</span></div>
          <div className="panel-bd">
            <p className="muted" style={{ marginTop: 0 }}>NOT_STARTED → FEEDS → READY → PROCESSING → GENERATED or AVAILABLE (or BLOCKED / FAILED).</p>
            <p className="muted">Notify on READY, BLOCKED, DELAYED, SLA_BREACHED, REVOKED, CLEARED, SIGNED_OFF, POSTED, ESCALATED and kit verbs. Never on raw facts, progress ticks, or LLM commentary.</p>
            <p className="muted" style={{ marginBottom: 0 }}>LLM is advisory only. It never sits on the readiness fold. Entitlement is fail-closed: unentitled rows return 404, not 403.</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Modules</h2></div>
        <div className="panel-bd tight">
          <table className="tbl">
            <thead><tr><th>Module</th><th>Port</th><th>Role</th></tr></thead>
            <tbody>
              <tr><td className="mono">onefinux-hub</td><td>7070</td><td>Event hub, translation, both folds, REST + SSE, outbox, audit. Not the UI.</td></tr>
              <tr><td className="mono">source-simulator</td><td>7081</td><td>Stands in for Motif, SAP, Helix, Axiom. Drive scenarios land here.</td></tr>
              <tr><td className="mono">frontend/web</td><td>5173</td><td>This console. Vite proxies /api → 7070 and /sim → 7081.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ArchitectureTab() {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div><b>Same diagrams as docs/design/architecture.md.</b><span className="mono-sm">Mermaid source lives in docs/design/diagrams/*.mmd — do not treat the SVG as a second design.</span></div>
      </div>
      {DIAGRAMS.map((d) => (
        <div key={d.src} className="panel">
          <div className="panel-hd"><h2>{d.title}</h2></div>
          <div className="panel-bd">
            <p className="muted" style={{ marginTop: 0 }}>{d.caption}</p>
            <div className="prod-fig">
              <img src={d.src} alt={d.title} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function ScreensTab() {
  return (
    <>
      <div className="panel">
        <div className="panel-hd"><h2>Run it locally</h2><span className="hint">two terminals</span></div>
        <div className="panel-bd">
          <ol className="prod-ol">
            <li><b>API only:</b> <span className="mono">./scripts/run.sh</span> — hub 7070 + simulator 7081. Do not open 7070 as the product UI.</li>
            <li><b>Console:</b> <span className="mono">cd frontend/web && npm install && npm run dev</span> — open http://localhost:5173.</li>
            <li><b>Drive:</b> open <Link to="/drive">/drive</Link>, click Reset, then one scenario. Watch Board and Reports.</li>
            <li><b>Stop:</b> <span className="mono">./scripts/stop.sh</span>, then Ctrl+C Vite. Docker: <span className="mono">docker compose up --build</span> → console :8080.</li>
          </ol>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Setup related screens</h2><span className="hint">create vs govern</span></div>
        <div className="panel-bd">
          <div className="grid g2">
            <Link to="/onboarding" className="oc">
              <div className="oc-hd"><span className="pill bo">Create</span></div>
              <h3>Onboarding</h3>
              <p className="q">Write the business question, feeds, SLA and on-ready. Submit calls POST /api/outcomes/definitions. The outcome appears on Configuration, Board and Reports for the selected COB.</p>
            </Link>
            <Link to="/configuration" className="oc">
              <div className="oc-hd"><span className="pill info">Govern</span></div>
              <h3>Configuration</h3>
              <p className="q">Master-detail registry. Pick an outcome or kit on the left; read the contract and live fold on the right. Do not treat this as a create form.</p>
            </Link>
          </div>
          <p className="muted" style={{ marginBottom: 0, marginTop: 14 }}>A second kit is POST /api/stitch/kits with sources, destinations, embed and userActions. No new Java type. Full operator curl path: docs/design/onboarding.md.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Every console screen</h2><span className="hint">as built</span></div>
        <div className="panel-bd tight">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Screen</th><th>Who</th><th>Job</th><th>Creates</th><th>Does not</th></tr></thead>
              <tbody>
                {SCREENS.map((s) => (
                  <tr key={s.to}>
                    <td><Link className="lead" to={s.to}>{s.title}</Link><div className="sec mono">{s.to === '/' ? '/' : s.to}</div></td>
                    <td>{s.who}</td>
                    <td>{s.job}</td>
                    <td className="sec">{s.creates}</td>
                    <td className="sec">{s.not}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Demo vs later</h2></div>
        <div className="panel-bd">
          <p className="muted" style={{ marginTop: 0 }}><b>In this build:</b> React console, runtime onboard, Drive, Configuration master-detail, 15C3 report flow, FOBO stitch with AMEND, RTB operations, monitoring + outbox + audit, pluggable ActionExecutor.</p>
          <p className="muted" style={{ marginBottom: 0 }}><b>Later:</b> bank Kafka/Solace, live CEES, live Helix/FAS/Axiom, Barclays Now, Wijmo analyst studio, native mobile wrapping this shell.</p>
        </div>
      </div>
    </>
  );
}
