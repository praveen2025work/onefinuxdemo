import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading } from '../components/bits.jsx';
import Select from '../components/Select.jsx';
import InfoHint from '../components/InfoHint.jsx';

const RENDERERS = ['NOTIFY_MILESTONE', 'GRID_PACK', 'ENGINE_REPORT', 'HELIX_RECON'];

export default function Onboarding() {
  const { filters } = useApp();
  const [kits, setKits] = useState(null);
  const [sources, setSources] = useState([]);
  const [dests, setDests] = useState([]);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    kitId: 'NOTIFY-EOD', question: 'Is the EOD milestone reached?', renderer: 'NOTIFY_MILESTONE',
    userActions: 'ACKNOWLEDGE', sourceId: 'CATS', destId: 'PNL_AGENT', slaCutoff: '20:00',
  });

  const load = useCallback(async () => {
    const [k, s, d] = await Promise.all([api.kits(), api.sources(), api.destinations()]);
    setKits(k); setSources(s); setDests(d);
  }, []);
  useEffect(() => { load(); }, [load]);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }

  async function register(e) {
    e.preventDefault();
    setBusy(true); setBanner(null);
    try {
      const body = {
        kitId: form.kitId, groupUnitId: filters.groupUnit, domain: 'Rev Acc', question: form.question,
        renderer: form.renderer, userActions: form.userActions, ceesProduct: 'product:' + form.kitId,
        slaCutoff: form.slaCutoff,
        sources: [{ sourceId: form.sourceId, required: true }],
        destinations: [{ destId: form.destId, stepOrder: 1 }],
        embed: { url: 'https://helix.example/' + form.kitId.toLowerCase(), allowedOrigin: 'https://helix.example', chrome: 'HOST' },
      };
      const r = await api.registerKit(body);
      setBanner({ cls: 'ok', text: `${r.message} Kit ${r.kitId} is LIVE.` });
      await load();
    } catch (err) {
      setBanner({ cls: 'fail', text: err.message });
    } finally { setBusy(false); }
  }

  if (!kits) return <Loading what="Loading catalog…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Config / onboarding · maker-checker</div>
          <h1 className="ph-title">Onboard a product kit
            <InfoHint title="Kits are data, not code" width={340}>A kit is the outcome recipe as data — sources, destinations, renderer, actions. Registering one adds no Java type. There is no <span className="mono">if (product == FOBO)</span>.</InfoHint>
          </h1>
        </div>
      </div>

      {banner && <div className={'banner ' + banner.cls} style={{ marginBottom: 16 }}><div><b>{banner.text}</b></div></div>}

      <div className="split">
        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Live kits</h2><span className="hint">product_kit</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Kit</th><th>Question</th><th>Renderer</th><th>Actions</th><th>Status</th></tr></thead>
                <tbody>
                  {kits.map((k) => (
                    <tr key={k.kitId}>
                      <td className="mono lead">{k.kitId}</td>
                      <td className="sec">{k.question}</td>
                      <td><span className="chip">{k.renderer}</span></td>
                      <td className="sec mono">{k.userActions}</td>
                      <td><StatusPill status={k.status === 'LIVE' ? 'READY' : k.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2>Sources of origin <InfoHint title="Sources are picked, not invented" width={280}>Config cannot invent an origin — every source is picked from this catalog.</InfoHint></h2><span className="hint">source_system</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Source</th><th>Identifier</th><th>Ingest</th><th>Topic / feed</th></tr></thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.sourceId}>
                      <td className="mono lead">{s.sourceId}</td>
                      <td><span className="chip">{s.identifierType}</span></td>
                      <td><span className="pill info">{s.ingestMode}</span></td>
                      <td className="mono sec">{s.topicOrUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="panel accent">
            <div className="panel-hd"><h2>Register a kit as data</h2></div>
            <form className="panel-bd" onSubmit={register}>
              <div className="field"><label>Kit id</label><input className="inp mono" value={form.kitId} onChange={(e) => set({ kitId: e.target.value.toUpperCase() })} required /></div>
              <div className="field"><label>Question the outcome answers</label><input className="inp" value={form.question} onChange={(e) => set({ question: e.target.value })} required /></div>
              <div className="field"><label>Renderer <InfoHint title="Renderer" width={260}>Renderer is data on the kit. Adding one never means a new React app.</InfoHint></label>
                <Select variant="block" value={form.renderer} onChange={(v) => set({ renderer: v })}
                  options={RENDERERS.map((r) => ({ value: r, label: r }))} />
              </div>
              <div className="field"><label>Source of origin</label>
                <Select variant="block" icon="grid" value={form.sourceId} onChange={(v) => set({ sourceId: v })}
                  options={sources.map((s) => ({ value: s.sourceId, label: s.sourceId }))} />
              </div>
              <div className="field"><label>Destination</label>
                <Select variant="block" value={form.destId} onChange={(v) => set({ destId: v })}
                  options={dests.map((d) => ({ value: d.destId, label: d.destId }))} />
              </div>
              <div className="field"><label>User actions</label><input className="inp" value={form.userActions} onChange={(e) => set({ userActions: e.target.value.toUpperCase() })} /></div>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Registering…' : '🛡 Publish kit'}</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
