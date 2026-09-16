import { Link, Navigate, useSearchParams } from 'react-router-dom';
import InfoHint from '../components/InfoHint.jsx';
import Icon from '../components/Icon.jsx';
import { PageTitle } from '../components/bits.jsx';
import GuideNav from '../components/GuideNav.jsx';
import MermaidFig from '../components/MermaidFig.jsx';
import dEnterprise from '@diagrams/01-enterprise-context.mmd?raw';
import dDeploy from '@diagrams/02-deployment-containers.mmd?raw';
import dSequence from '@diagrams/03-event-sequence.mmd?raw';
import dModel from '@diagrams/04-data-model.mmd?raw';
import dStitch from '@diagrams/05-outcome-state.mmd?raw';
import dEngine from '@diagrams/06-engine-stage.mmd?raw';

const SCREENS = [
  { to: '/', title: 'Home', who: 'Everyone', job: 'Today’s close in one paragraph, then the fold. View lives in the top bar.', creates: 'Nothing — read', not: 'Scenario buttons or a role picker' },
  { to: '/product', title: 'Product', who: 'Everyone', job: 'Why this exists. The morning story a BU head and a controller both recognise.', creates: 'This guide', not: 'Live outcomes' },
  { to: '/architecture', title: 'Architecture', who: 'Everyone', job: 'How facts become Ready or Blocked. Same diagrams as docs/design.', creates: 'This guide', not: 'Live outcomes' },
  { to: '/guide', title: 'Developer guide', who: 'Engineer', job: 'Run it, extend it with data, review a PR. First change is Onboarding, not a Java type.', creates: 'This guide', not: 'Live outcomes' },
  { to: '/onboarding', title: 'Onboarding', who: 'Maker', job: 'Create a live outcome: question, feeds, SLA, on-ready action.', creates: 'A new outcome (data, not a release)', not: 'Inspecting every existing outcome' },
  { to: '/configuration', title: 'Configuration', who: 'Owner / config', job: 'Govern the registry. Pick an outcome or kit on the left; anatomy on the right.', creates: 'Nothing — inspect and bind', not: 'A create form (that is Onboarding)' },
  { to: '/drive', title: 'Drive scenarios', who: 'Demo / QA', job: 'Reset and inject COB facts. Product pages stay view-only.', creates: 'Simulator events into the hub', not: 'Buttons on Home or Reports' },
  { to: '/reports', title: 'Reports', who: 'Controller', job: 'Engine outcomes and the 15C3 five-stage pack. Normal, Compact, or Table — then open the produced report.', creates: 'Nothing — open the artifact', not: 'Scenario buttons' },
  { to: '/board', title: 'Outcome board', who: 'CIO / MD / BU head', job: 'Traffic lights for the whole unit. Named blocker, SLA, escalation count.', creates: 'Nothing — read only', not: 'Sign-off or post' },
  { to: '/outcomes', title: 'My outcomes', who: 'Outcome user', job: 'Doer worklist. Open a ready instance to sign off or post.', creates: 'Nothing until you open an instance', not: 'Head roll-ups or RTB queues' },
  { to: '/instance/:id', title: 'Instance detail', who: 'Outcome user', job: 'Fold + embed + kit-declared actions. Drill-down only — no rail item.', creates: 'Sign-off / post / kit verb (audited)', not: 'A left-nav destination' },
  { to: '/operations', title: 'Operations', who: 'RTB', job: 'Escalations, watermarks, dead letters, dual-control replay.', creates: 'Replay / escalate (audited)', not: 'Business sign-off' },
  { to: '/monitoring', title: 'Monitoring', who: 'RTB / engineering', job: 'Received → persisted → propagated → audited.', creates: 'Nothing — observe the tape', not: 'Business sign-off' },
];

const DIAGRAMS = [
  { source: dEnterprise, title: '1. Enterprise context', caption: 'Unchanged systems of record publish facts. The hub folds them. Entitled frontend/web is the only UX.' },
  { source: dDeploy, title: '2. Deployment', caption: 'Three processes: console 7091, hub 7070 (REST + SSE), simulator 7081. Browser never touches a bus.' },
  { source: dSequence, title: '3. Event sequence', caption: 'Fact → translate → deterministic fold → ActionExecutor → outbox → SSE back to the console.' },
  { source: dModel, title: '4. Data model', caption: 'Stitch kit (sources, destinations, embed, userActions) plus the engine projection on the same event store.' },
  { source: dStitch, title: '5. Stitch states', caption: 'Human kit: NOT_YET → READY → CLEARED (or BLOCKED / DELAYED / ESCALATED). Sign-off is audited.' },
  { source: dEngine, title: '6. Engine stages', caption: 'Report lifecycle: NOT_STARTED → FEEDS → READY → PROCESSING → GENERATED | AVAILABLE.' },
];

export default function Product() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  if (tab === 'architecture') return <Navigate to="/architecture" replace />;
  if (tab === 'start' || tab === 'works' || tab === 'screens') return <Navigate to="/guide" replace />;
  return <ProductStory />;
}

export function ArchitecturePage() {
  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">How facts become an answer</div>
          <PageTitle icon="compass">Architecture
            <InfoHint title="Architecture">Same diagrams as docs/design/architecture.md. Origins stay origins. The hub folds. This console is the only UX.</InfoHint>
          </PageTitle>
          <p className="sub">Three processes. The browser never sees Kafka. Motif, SAP, Helix and Axiom keep their screens — we stitch their facts.</p>
        </div>
        <GuideNav />
      </div>

      <FoboHow />

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat info"><div className="lbl">Origins</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Publish a fact</div><div className="foot">Motif, SAP, Helix, Axiom — or the simulator</div></div>
        <div className="stat ok"><div className="lbl">Hub</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Fold to Ready or Blocked</div><div className="foot">Deterministic. Named blocker when a required key fails.</div></div>
        <div className="stat"><div className="lbl">Console</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Show the answer, then act</div><div className="foot">SSE. Sign-off lives on the instance, not on Home.</div></div>
      </div>

      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div>
          <b>These pictures are the product, not a second deck.</b>
          <span className="mono-sm">Live Mermaid from docs/design/diagrams/*.mmd — follows dark/light. Charts scale to the page so the whole picture is on screen.</span>
        </div>
      </div>
      {DIAGRAMS.map((d) => (
        <div key={d.title} className="panel">
          <div className="panel-hd"><h2>{d.title}</h2></div>
          <div className="panel-bd">
            <p className="muted" style={{ marginTop: 0 }}>{d.caption}</p>
            <MermaidFig source={d.source} title={d.title} />
          </div>
        </div>
      ))}
    </>
  );
}

export function GuidePage() {
  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Join the repo · about 15 minutes</div>
          <PageTitle icon="code">Developer guide
            <InfoHint title="Developer guide">How to run the three processes, add an outcome as data, and get a PR reviewed. Same write-up as docs/design/start.md.</InfoHint>
          </PageTitle>
          <p className="sub">Your first change is a row of data, not a Java product type. FOBO is a kit. There is no FOBO code path.</p>
        </div>
        <GuideNav />
      </div>
      <StartTab />
      <div id="how-it-works"><WorksTab /></div>
      <div id="screens"><ScreensTab /></div>
    </>
  );
}

function FoboHow() {
  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>How a FOBO rec is completed</h2>
        <span className="hint">FOBO does not send events</span>
      </div>
      <div className="panel-bd">
        <p className="muted" style={{ marginTop: 0 }}>
          <b>FOBO is the question</b> (“Can I execute this rec?”), not a source system.
          Motif, CATS and MBR publish facts. The hub folds them. Helix is a destination the hub
          calls when the fold says ready — nobody clicks Helix on Home.
        </p>

        <div className="grid g2">
          <div className="oc" style={{ cursor: 'default' }}>
            <div className="oc-hd"><span className="pill bo">On the board</span></div>
            <h3>The rec a controller signs</h3>
            <ol className="prod-ol">
              <li><b>CATS</b> sends <span className="mono">TRADE_BOOKED</span> (a trade key).</li>
              <li><b>Motif</b> sends <span className="mono">LEDGER_POSTED</span> or <span className="mono">LEDGER_REJECTED</span> (a book, e.g. MB012 / MB014).</li>
              <li><b>MBR</b> sends <span className="mono">BREAK_CLEARED</span> (a break key).</li>
              <li><b>Decide:</b> all three required keys COMPLETED → <span className="pill ok">READY</span>. Any required FAILED → <span className="pill fail">BLOCKED</span> with that named key (EMEA R-2031 = Motif MB014).</li>
              <li><b>Finish:</b> on a READY row the controller <b>signs off</b> (instance CLEARED) or <b>posts to Motif</b> via FAS. The head does not. Helix here is the iframe + an echo fact (<span className="mono">HELIX_ANALYSIS_COMPLETE</span> RUN-A37C on APAC) — not a Home button.</li>
            </ol>
          </div>
          <div className="oc" style={{ cursor: 'default' }}>
            <div className="oc-hd"><span className="pill info">On Reports</span></div>
            <h3>When the hub calls Helix</h3>
            <ol className="prod-ol">
              <li><b>Motif</b> publishes <span className="mono">MASTERBOOK_READY</span> — one fact per book (300 in the demo). FOBO still sends nothing.</li>
              <li><b>Hub</b> counts distinct books for outcome <span className="mono">FOBO_HELIX</span>. At 300 → READY.</li>
              <li><b>Call:</b> because on-ready is <span className="mono">HTTP_COMMAND</span> / target <span className="mono">helix</span>, the hub POSTs <span className="mono">/helix/analysis</span> with run id, COB, region, and <span className="mono">completionEvent: HELIX_ANALYSIS_COMPLETE</span>.</li>
              <li><b>Helix</b> answers 202 ACCEPTED, runs the analysis, then publishes <span className="mono">HELIX_ANALYSIS_COMPLETE</span> back to the hub with that <span className="mono">runId</span>. No polling.</li>
              <li><b>Finish:</b> the engine stage moves READY → PROCESSING → GENERATED. Watch it on <Link to="/reports">Reports</Link>, not on Home.</li>
            </ol>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 0, marginTop: 14 }}>
          Prove it on Drive (testing only): <b>FOBO stitch</b> = CATS/Motif/MBR → Board. <b>FOBO / Helix</b> = 300 Motif books → hub POSTs Helix → Reports.
          Step-by-step for a lead: <Link to="/guide">Developer guide</Link> and <span className="mono">docs/design/helix-walkthrough.md</span>.
        </p>
      </div>
    </div>
  );
}

function ProductStory() {
  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Why this exists</div>
          <PageTitle icon="book">One answer at close of business
            <InfoHint title="Product">A thin outcome layer. Origins stay origins. Destinations stay destinations. We stitch their facts into Ready / Blocked / Delayed and act when ready.</InfoHint>
          </PageTitle>
          <p className="sub">Revenue Accounting is not asking “is Motif done?”. It is asking: can I run this rec, produce this report, post this book — for this COB, in this region?</p>
        </div>
        <GuideNav />
      </div>

      <div className="story" style={{ marginBottom: 16 }}>
        <div className="story-kicker">A morning a BU head recognises</div>
        <h2>Two rows. One unit. Different days.</h2>
        <p className="story-lead">Same question: <b>Can I execute this rec?</b> APAC is ready — the controller signs off. EMEA is blocked — Motif rejected ledger MB014. RTB owns that delay. Nobody opens a second ticket and hopes.</p>
        <div className="story-rows">
          <div className="story-row ok">
            <span className="pill ok">READY</span>
            <div>
              <b>APAC · R-1042</b>
              <div className="sec">All required keys arrived. The person who owns the rec can sign off or post. The head does not.</div>
            </div>
          </div>
          <div className="story-row fail">
            <span className="pill fail">BLOCKED</span>
            <div>
              <b>EMEA · R-2031 · Motif MB014</b>
              <div className="sec">A named key failed. Escalation sits with RTB. Replay is dual-control. Sign-off is not.</div>
            </div>
          </div>
        </div>
        <div className="wrapflex">
          <Link className="btn" to="/board">Open the unit board</Link>
          <Link className="btn ghost" to="/architecture">See how this is stitched</Link>
          <Link className="btn ghost" to="/guide">Developer guide</Link>
        </div>
      </div>

      <FoboHow />

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat info"><div className="lbl">We keep</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Motif, SAP, Helix, Axiom</div><div className="foot">Their screens stay theirs. We frame them when we must.</div></div>
        <div className="stat ok"><div className="lbl">We add</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>One row per outcome</div><div className="foot">Ready, blocked, delayed — with a named reason</div></div>
        <div className="stat"><div className="lbl">We never</div><div className="num" style={{ fontSize: 16, lineHeight: 1.35 }}>Rebuild the books grid</div><div className="foot">No FOBO code path. Products are data.</div></div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Two models, one event backbone</h2><span className="hint">plain language</span></div>
        <div className="panel-bd">
          <div className="grid g2">
            <div className="oc" style={{ cursor: 'default' }}>
              <div className="oc-hd"><span className="pill info">The question</span></div>
              <h3>Outcome Engine</h3>
              <p className="q">A business question plus the feeds that must land, an SLA, and what to do when ready. FOBO analysis and 15C3 live here. When Motif’s books are in, the hub POSTs Helix. When 15C3 feeds are in, it POSTs Axiom. No one polls.</p>
            </div>
            <div className="oc" style={{ cursor: 'default' }}>
              <div className="oc-hd"><span className="pill bo">The work</span></div>
              <h3>Stitch kit</h3>
              <p className="q">The human console: sources, destinations, the partner screen in a frame, buttons like sign-off. FOBO is the first kit. Adding the next kit is data, not a fork of this app.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Walk a visitor through it</h2><span className="hint">four beats</span></div>
        <div className="panel-bd">
          <ol className="prod-ol">
            <li><b>Home</b> — today’s close in one paragraph, then the named blocker.</li>
            <li><b>Board</b> — what a CIO sees. Open the blocked row.</li>
            <li><b>Architecture</b> — why Motif is still Motif, and how a failed key becomes that red cell.</li>
            <li><b>Developer guide</b> — if they will build: run three processes, onboard as data, watch the tape.</li>
          </ol>
          <div className="wrapflex" style={{ marginTop: 12 }}>
            <Link className="btn" to="/">Start on Home</Link>
            <Link className="btn ghost" to="/architecture">Architecture</Link>
            <Link className="btn ghost" to="/guide">Developer guide</Link>
          </div>
        </div>
      </div>
    </>
  );
}

function StartTab() {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div>
          <b>New to this repo? Read this page, then top bar → View → Developer if you want a shorter rail.</b>
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
            <li><b>Console:</b> <span className="mono">cd frontend/web && npm install && npm run dev</span>. Open http://localhost:7091.</li>
            <li><b>Read the story:</b> <Link to="/product">Product</Link>, then <Link to="/architecture">Architecture</Link>. Then pick View → <b>Developer</b> if you want a shorter rail.</li>
            <li><b>First change:</b> open <Link to="/onboarding">Onboarding</Link>, submit the Month-end close example. That is <span className="mono">POST /api/outcomes/definitions</span> — no Java class.</li>
            <li><b>Prove it:</b> <Link to="/drive">Drive</Link> → Reset → one scenario. Watch <Link to="/monitoring">Monitoring</Link>. Switch View to <b>BU head</b> and open Board — Drive disappears from the rail on purpose.</li>
          </ol>
          <div className="wrapflex" style={{ marginTop: 12 }}>
            <Link className="btn" to="/onboarding">Open Onboarding</Link>
            <Link className="btn ghost" to="/drive">Open Drive</Link>
            <Link className="btn ghost" to="/architecture">Open Architecture</Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Run Helix in real time</h2><span className="hint">lead / joining engineer</span></div>
        <div className="panel-bd">
          <p className="muted" style={{ marginTop: 0 }}>Two Helix stories. The engine one is what a lead should Drive first. Full write-up: <span className="mono">docs/design/helix-walkthrough.md</span>.</p>
          <ol className="prod-ol">
            <li><b>Do not mix COBs.</b> <b>FOBO / Helix</b> (Reports) uses <b>today</b> (NY). <b>FOBO stitch</b> (Board recs R-1042 / R-2031) uses <b>2026-09-12</b>.</li>
            <li><b>Reset</b> on <Link to="/drive">Drive</Link> — stitch + engine. Product pages stay view-only.</li>
            <li>Set the header date to <b>today</b>. Card <b>FOBO / Helix</b> → Drive. Motif publishes 300 <span className="mono">MASTERBOOK_READY</span> over ~45s.</li>
            <li>Watch <Link to="/reports">Reports</Link>: FOBO investigation climbs 0/300 → READY → hub POSTs Helix → ~6s later <span className="mono">HELIX_ANALYSIS_COMPLETE</span> → GENERATED. Not a Home button.</li>
            <li>Then set COB to <b>2026-09-12</b>, Drive <b>FOBO stitch</b>. Board: APAC R-1042 READY (Helix echo RUN-A37C); EMEA R-2031 BLOCKED on Motif MB014. Controller signs the ready row; RTB replays the failed key.</li>
          </ol>
          <div className="wrapflex" style={{ marginTop: 12 }}>
            <Link className="btn" to="/drive">Open Drive</Link>
            <Link className="btn ghost" to="/reports">Open Reports</Link>
            <Link className="btn ghost" to="/board">Open Board</Link>
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
              <tr><td className="mono">frontend/web</td><td>7091</td><td>This console. Vite proxies /api → 7070 and /sim → 7081.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
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
            <li><b>Console:</b> <span className="mono">cd frontend/web && npm install && npm run dev</span> — open http://localhost:7091.</li>
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
    </>
  );
}
