import { Link, useSearchParams } from 'react-router-dom';
import InfoHint from '../components/InfoHint.jsx';
import Icon from '../components/Icon.jsx';

const TABS = [
  { id: 'start', label: 'Start here' },
  { id: 'product', label: 'Product' },
  { id: 'works', label: 'How it works' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'screens', label: 'Screens & setup' },
];

const SCREENS = [
  { to: '/', title: 'Home', who: 'Everyone', job: 'Morning glance plus opt-in views. Pick one job; the rail hides the rest.', creates: 'Nothing — read + pick a view', not: 'Scenario buttons' },
  { to: '/product', title: 'Product', who: 'Everyone', job: 'What the platform is, how the fold works, architecture diagrams, start path, and how we review code.', creates: 'This guide', not: 'Live outcomes' },
  { to: '/onboarding', title: 'Onboarding', who: 'Maker', job: 'Create a live OutcomeDefinition: question, feeds, SLA, on-ready action.', creates: 'A new outcome (data, not a release)', not: 'Inspecting every existing outcome' },
  { to: '/configuration', title: 'Configuration', who: 'Owner / config', job: 'Govern the registry. Pick an outcome or kit on the left; anatomy and live state on the right.', creates: 'Nothing — inspect and bind', not: 'A create form (that is Onboarding)' },
  { to: '/drive', title: 'Drive scenarios', who: 'Demo / QA', job: 'Reset and inject COB facts. Product pages stay view-only.', creates: 'Simulator events into the hub', not: 'Buttons on Home or Reports' },
  { to: '/reports', title: 'Reports', who: 'Controller', job: 'Engine outcomes and the 15C3 five-stage pack: feeds → ready → processing → generated → available.', creates: 'Nothing — view the artifact', not: 'Scenario buttons' },
  { to: '/board', title: 'Outcome board', who: 'CIO / MD / BU head', job: 'Traffic lights for the whole unit. Named blocker, SLA, escalation count.', creates: 'Nothing — read only', not: 'Sign-off or post' },
  { to: '/outcomes', title: 'My outcomes', who: 'Outcome user', job: 'Doer worklist. Open a ready instance to sign off or post.', creates: 'Nothing until you open an instance', not: 'Head roll-ups or RTB queues' },
  { to: '/instance/:id', title: 'Instance detail', who: 'Outcome user', job: 'Fold + embed + kit-declared actions. Drill-down only — no rail item.', creates: 'Sign-off / post / kit verb (audited)', not: 'A left-nav destination' },
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
            <InfoHint title="Product">The live guide for this console. Same content as docs/design — start path for new developers, architecture diagrams, how the fold works, every screen, and how we review code.</InfoHint>
          </h1>
          <p className="sub">A thin outcome layer. Origins stay origins. Destinations stay destinations. We stitch their facts into Ready / Blocked / Delayed and act when ready.</p>
        </div>
        <div className="seg">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'start' && <StartTab />}
      {tab === 'product' && <ProductTab />}
      {tab === 'works' && <WorksTab />}
      {tab === 'architecture' && <ArchitectureTab />}
      {tab === 'screens' && <ScreensTab />}
    </>
  );
}

function StartTab() {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div>
          <b>New to this repo? Read this tab, then pick the Developer view on Home.</b>
          <span className="mono-sm">Same write-up: docs/design/start.md · views are a nav filter, not security</span>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat info"><div className="lbl">The idea</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Answer the close-of-business question, not “is Motif done?”</div><div className="foot">Ready / Blocked / Delayed per outcome, COB, region</div></div>
        <div className="stat ok"><div className="lbl">How you extend it</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Add a row of data, not a Java product type</div><div className="foot">Onboarding form or POST /api/outcomes/definitions</div></div>
        <div className="stat"><div className="lbl">What you never do</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>if (FOBO) · Drive on Home · Kafka in the browser</div><div className="foot">see the never-list on a pull request</div></div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Explain it like you joined yesterday</h2></div>
        <div className="panel-bd stack">
          <p className="muted" style={{ margin: 0 }}>A group unit (Revenue Accounting, Product Control, …) closes the day by answering one question per outcome: can I run this rec, produce this report, post this book?</p>
          <p className="muted" style={{ margin: 0 }}>Motif, SAP, Helix and Axiom already exist. We do not rebuild them. They publish facts. This platform <b>stitches</b> those facts into one row with a status, then acts when the row is READY.</p>
          <p className="muted" style={{ margin: 0 }}>There are two models on one event backbone. The <b>Outcome Engine</b> is the business question (feeds + SLA + on-ready command). A <b>Stitch kit</b> is the human console (sources + destinations + partner iframe + buttons like sign-off). FOBO is the first kit — there is no FOBO code path.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Start development (about 15 minutes)</h2><span className="hint">two terminals</span></div>
        <div className="panel-bd">
          <ol className="prod-ol">
            <li><b>API:</b> from the repo root run <span className="mono">./scripts/run.sh</span>. Hub is 7070, simulator is 7081. Do not open 7070 as the UI.</li>
            <li><b>Console:</b> <span className="mono">cd frontend/web && npm install && npm run dev</span>. Open http://localhost:5173.</li>
            <li><b>Pick a view:</b> top bar → View → <b>Developer</b> (or the chooser on Home). The left rail now shows only the screens for that job.</li>
            <li><b>First change:</b> open <Link to="/onboarding">Onboarding</Link>, submit the Month-end close example. That is <span className="mono">POST /api/outcomes/definitions</span> — no Java class.</li>
            <li><b>Prove it:</b> <Link to="/drive">Drive</Link> → Reset → one scenario. Watch <Link to="/monitoring">Monitoring</Link>. Switch View to <b>BU head</b> and open Board — Drive disappears from the rail on purpose.</li>
          </ol>
          <div className="wrapflex" style={{ marginTop: 12 }}>
            <Link className="btn" to="/onboarding">Open Onboarding</Link>
            <Link className="btn ghost" to="/drive">Open Drive</Link>
            <Link className="btn ghost" to="/">Choose a view on Home</Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Where to change code</h2><span className="hint">repo map</span></div>
        <div className="panel-bd tight">
          <table className="tbl">
            <thead><tr><th>Path</th><th>When you touch it</th></tr></thead>
            <tbody>
              <tr><td className="mono">frontend/web</td><td>Screens, chrome, theme. Visual truth. Vite proxies /api → 7070 and /sim → 7081.</td></tr>
              <tr><td className="mono">onefinux-hub</td><td>Ingest, both folds, REST + SSE, outbox, audit. Package <span className="mono">workflow/ActionExecutor</span> for a new on-ready type.</td></tr>
              <tr><td className="mono">source-simulator</td><td>Stand-in origins and destinations. New Drive scenario = a simulator story, not a console button on Home.</td></tr>
              <tr><td className="mono">contracts/</td><td>JSON Schema the hub enforces on ingest.</td></tr>
              <tr><td className="mono">docs/design/</td><td>The only design folder. Keep it in sync when behaviour changes.</td></tr>
              <tr><td className="mono">.cursor/skills/</td><td>Job-specific rules the reviewer and the coding agent follow.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>How code review is done</h2><span className="hint">GitHub PR + CI</span></div>
        <div className="panel-bd">
          <ol className="prod-ol">
            <li><b>Branch off main</b> with a conventional commit: <span className="mono">feat:</span>, <span className="mono">fix:</span>, <span className="mono">docs:</span>, <span className="mono">chore:</span>.</li>
            <li><b>Open a pull request.</b> There is no CODEOWNERS file. A human reviews against AGENTS.md and the skill for the job you touched.</li>
            <li><b>CI must be green</b> (<span className="mono">.github/workflows/ci.yml</span>): <span className="mono">mvn -B verify</span> (Java 21 hub + simulator tests) and <span className="mono">frontend/web</span> <span className="mono">npm ci && npm run build</span>.</li>
            <li><b>Reviewer checklist:</b> no <span className="mono">if (FOBO)</span>; no Drive / scenario buttons on Home or Reports; no frosted glass; Configuration is not a create form; LLM never sits on the fold; browser never talks to Kafka.</li>
            <li><b>Local before you push:</b> <span className="mono">mvn -B test</span> and <span className="mono">cd frontend/web && npm run build</span>. Then click the screens you changed — a green build is not a demo.</li>
          </ol>
          <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>Skills are the review contract: <span className="mono">barclays-ib-console</span> (chrome), <span className="mono">register-outcome-kit</span> (onboard), <span className="mono">outcome-engine</span> (fold + ActionExecutor), <span className="mono">drive-and-demo</span> (scenarios).</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Unwanted screens or leftover code?</h2><span className="hint">audit 14 Sep 2026</span></div>
        <div className="panel-bd">
          <p className="muted" style={{ marginTop: 0 }}><b>No unused product screens.</b> Every page under <span className="mono">frontend/web/src/pages</span> is routed and has a job. Instance detail is drill-down only (no rail item). Drive is testing-only — it is not a leftover; it is kept off Home and Reports on purpose.</p>
          <p className="muted">Pairs that look like duplicates are not: <b>Board</b> vs <b>My outcomes</b> (supervisor table vs doer cards, same instances). <b>Onboarding</b> vs <b>Configuration</b> (create vs govern).</p>
          <p className="muted">Already removed in earlier cleanups: leftover static HTML board, Analyst explorer UI, unused stitch analyst APIs, design docs outside <span className="mono">docs/design/</span>.</p>
          <p className="muted" style={{ marginBottom: 0 }}><b>Kept on purpose, not wired to a screen:</b> hub <span className="mono">/api/contracts</span>, <span className="mono">/api/workflow</span>, <span className="mono">/api/config</span>, <span className="mono">/dev-token</span> (platform APIs and <span className="mono">http/onefinux.http</span>). Client helpers <span className="mono">api.destinations</span> and <span className="mono">api.registerKit</span> match live hub endpoints; kit create is still API-only. This pass dropped unused <span className="mono">PromptModal</span> / <span className="mono">ConfirmModal</span> and unused <span className="mono">search</span> / <span className="mono">play</span> icons.</p>
        </div>
      </div>
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
            <Link className="btn ghost" to="/product?tab=start">Start developing</Link>
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
                {SCREENS.map((s) => {
                  const href = s.to.includes(':') ? '/outcomes' : s.to;
                  return (
                  <tr key={s.to}>
                    <td><Link className="lead" to={href}>{s.title}</Link><div className="sec mono">{s.to === '/' ? '/' : s.to}</div></td>
                    <td>{s.who}</td>
                    <td>{s.job}</td>
                    <td className="sec">{s.creates}</td>
                    <td className="sec">{s.not}</td>
                  </tr>
                  );
                })}
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
