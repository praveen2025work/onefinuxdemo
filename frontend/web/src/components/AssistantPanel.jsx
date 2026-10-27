import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../store.jsx';
import { assistApi } from '../api.js';
import { broadcastContext } from '../workspace/interop.js';
import { routeKey } from '../ux/telemetry.js';
import { track, trackUse } from '../ux/track.js';
import { uxConfig } from '../ux/experiments.js';
import ChatFrame from '../chat/ChatFrame.jsx';

const STORE = 'ofx-assist';
const STARTERS = [
  'What needs my attention today?',
  'Why is R-2031 blocked?',
  'Which outcomes are at risk of missing SLA?',
  'What changed in the last hour?',
];

function loadTurns() {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { return []; }
}

/**
 * The assistant: ask about your close in plain words and get an answer built from the hub's facts for you (your
 * group unit, COB and entitlements), with buttons that open what the answer points at. With a Claude model
 * configured the answer is written by the model from those facts; without one it is composed from them directly.
 * It is advisory — it never changes anything, and readiness still comes from the fold.
 */
export default function AssistantPanel({ open, onClose, seed }) {
  const { filters } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [turns, setTurns] = useState(loadTurns);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null);
  const [chatbot, setChatbot] = useState(null);
  const [tab, setTab] = useState('assistant');
  const [chatSeen, setChatSeen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const asked = useRef(null);

  useEffect(() => { if (open && !mode) assistApi.status().then((s) => setMode(s.mode)).catch(() => setMode('grounded')); }, [open, mode]);
  useEffect(() => { if (open) uxConfig().then((c) => setChatbot(c?.chatbot || null)); }, [open]);
  // The framed chatbot loads the first time its tab is opened and then stays, so its conversation survives tab switches.
  useEffect(() => { if (tab === 'chat') setChatSeen(true); }, [tab]);
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-20))); } catch { /* no storage */ } }, [turns]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [turns, busy]);
  useEffect(() => {
    if (!open) return undefined;
    setTimeout(() => inputRef.current?.focus(), 50);
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  // A question handed over from search or another screen is asked once.
  useEffect(() => {
    if (open && seed?.question && asked.current !== seed) { asked.current = seed; setTab('assistant'); ask(seed.question); }
  }, [open, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ask(text) {
    const question = String(text || '').trim();
    if (!question || busy) return;
    setInput('');
    const history = turns.slice(-6).map((t) => ({ role: t.role, text: t.text }));
    setTurns((ts) => [...ts, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const r = await assistApi.ask({ question, groupUnit: filters.groupUnit, cobDate: filters.cobDate, path: location.pathname, history });
      setTurns((ts) => [...ts, { role: 'assistant', text: r.answer, actions: r.actions || [], mode: r.mode, note: r.note }]);
      track('ASSIST', { app: routeKey(location.pathname), component: 'assistant', detail: { mode: r.mode } });
    } catch (e) {
      setTurns((ts) => [...ts, { role: 'assistant', text: e.message, error: true, actions: [] }]);
    } finally {
      setBusy(false);
    }
  }

  function follow(a) {
    if (a.context) broadcastContext(a.context);
    trackUse('assistant.action', routeKey(location.pathname), { route: a.route });
    if (a.route?.startsWith('/')) navigate(a.route);
  }

  return (
    <aside className={'npanel assist' + (open ? ' open' : '')} aria-label="Assistant" aria-hidden={!open} inert={open ? undefined : ''}>
      <div className="np-inner">
        <div className="np-hd">
          <div className="np-ttl">
            {chatbot ? (
              <div className="seg sm as-tabs" role="tablist" aria-label="Assistant or chat">
                <button type="button" role="tab" aria-selected={tab === 'assistant'} className={tab === 'assistant' ? 'on' : ''} onClick={() => setTab('assistant')}>Assistant</button>
                <button type="button" role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'on' : ''} onClick={() => { setTab('chat'); trackUse('chatbot.tab'); }}>{chatbot.title}</button>
              </div>
            ) : <h3>Assistant</h3>}
            {tab === 'assistant' && (
              <span className={'np-badge' + (mode === 'claude' ? ' accent' : '')}
                title={mode === 'claude' ? 'Answers are written by Claude from the hub’s facts for you' : 'Answers are composed from the hub’s facts for you (no model configured)'}>
                {mode === 'claude' ? 'Claude' : 'Hub facts'}
              </span>
            )}
          </div>
          <div className="np-tools">
            {tab === 'assistant' && turns.length > 0 && (
              <button type="button" className="np-ic" onClick={() => setTurns([])} title="Clear the conversation" aria-label="Clear the conversation">
                <Icon name="trash" size={15} />
              </button>
            )}
            <button type="button" className="np-ic" onClick={onClose} title="Close" aria-label="Close assistant">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        {chatbot && chatSeen && (
          <div className="as-chat" hidden={tab !== 'chat'}><ChatFrame chatbot={chatbot} /></div>
        )}
        <div className="ofx-chat as-assist" hidden={tab !== 'assistant'}>
          <div className="ofx-chat-list" ref={listRef}>
            {turns.length === 0 && (
              <div className="ofx-chat-empty">
                <Icon name="spark" size={22} />
                <p style={{ margin: 0 }}>Ask about your close. Answers use only what you are entitled to see, and each comes with buttons to open what it points at.</p>
                <div className="ofx-chat-starters">
                  {STARTERS.map((q) => <button key={q} type="button" className="ofx-chat-chip" onClick={() => ask(q)}>{q}</button>)}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={'ofx-chat-msg ' + (t.role === 'user' ? 'ofx-chat-user' : 'ofx-chat-bot') + (t.error ? ' ofx-chat-error' : '')}>
                <div>{t.text}</div>
                {t.note && <div className="ofx-chat-note"><Icon name="info" size={12} /> {t.note}</div>}
                {t.actions?.length > 0 && (
                  <div className="ofx-chat-actions">
                    {t.actions.map((a) => (
                      <button key={a.route + a.label} type="button" className="ofx-chat-action" onClick={() => follow(a)} title={a.route}>
                        <Icon name="open" size={12} /> {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="ofx-chat-msg ofx-chat-bot ofx-chat-pending">Looking at your close…</div>}
          </div>
          <form className="ofx-chat-compose" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input ref={inputRef} className="ofx-chat-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
              placeholder="Ask about an instance, an outcome or your day" aria-label="Ask the assistant" />
            <button type="submit" className="ofx-btn" disabled={busy || !input.trim()} aria-label="Ask"><Icon name="send" size={14} /></button>
          </form>
          <p className="ofx-chat-foot">Advisory. It reads; you act. Readiness comes from the hub’s fold.</p>
        </div>

      </div>
    </aside>
  );
}
