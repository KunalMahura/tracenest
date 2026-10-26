import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const CONDITION_LABELS = {
  error_rate:    'Error Rate %',
  p95_latency:   'P95 Latency (ms)',
  p99_latency:   'P99 Latency (ms)',
  request_count: 'Request Count',
};

function RuleForm({ projectId, onCreated, onCancel }) {
  const [name, setName]         = useState('');
  const [cond, setCond]         = useState('error_rate');
  const [threshold, setThresh]  = useState('');
  const [window, setWindow]     = useState(5);
  const [webhook, setWebhook]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.alerts.createRule({
        projectId,
        name, conditionType: cond,
        threshold: Number(threshold),
        windowMinutes: Number(window),
        webhookUrl: webhook || undefined,
      });
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card border-brand-800 space-y-4">
      <h3 className="text-sm font-semibold text-white">New Alert Rule</h3>
      {err && <p className="text-xs text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Rule name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} required placeholder="High error rate" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Condition</label>
          <select className="select" value={cond} onChange={e=>setCond(e.target.value)}>
            {Object.entries(CONDITION_LABELS).map(([v,l])=>(
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Threshold</label>
          <input className="input" type="number" value={threshold} onChange={e=>setThresh(e.target.value)} required placeholder={cond === 'error_rate' ? '5 (%)' : '1000 (ms)'} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Window (minutes)</label>
          <input className="input" type="number" value={window} onChange={e=>setWindow(e.target.value)} min={1} max={1440} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Webhook URL (optional)</label>
          <input className="input" value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="https://hooks.slack.com/…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Creating…' : 'Create rule'}
        </button>
      </div>
    </form>
  );
}

export default function AlertsPage() {
  const { project }        = useOutletContext();
  const [rules, setRules]  = useState([]);
  const [alerts, setAlerts]= useState([]);
  const [tab, setTab]      = useState('triggered');
  const [adding, setAdding]= useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        api.alerts.listRules(project._id),
        api.alerts.list(project._id),
      ]);
      setRules(r);
      setAlerts(a.alerts || a);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [project]);

  useEffect(() => { load(); }, [load]);

  const toggleRule = async (rule) => {
    try {
      await api.alerts.updateRule(rule._id, { enabled: !rule.enabled });
      load();
    } catch(e) { console.error(e); }
  };

  const deleteRule = async (id) => {
    if (!confirm('Delete this alert rule?')) return;
    try { await api.alerts.deleteRule(id); load(); }
    catch(e) { console.error(e); }
  };

  const resolveAlert = async (id) => {
    try { await api.alerts.resolve(id); load(); }
    catch(e) { console.error(e); }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-full text-slate-500">Select a project.</div>;
  }

  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} · {unresolvedCount} unresolved
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button id="new-alert-rule" onClick={() => setAdding(v => !v)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Rule
          </button>
        </div>
      </div>

      {adding && (
        <RuleForm
          projectId={project._id}
          onCreated={() => { setAdding(false); load(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {[
          { key: 'triggered', label: `Triggered (${alerts.length})` },
          { key: 'rules',     label: `Rules (${rules.length})`      },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Triggered Alerts */}
      {tab === 'triggered' && (
        <div className="space-y-3">
          {alerts.length === 0 && (
            <div className="card text-center text-slate-500 py-10">
              <CheckCircle size={32} className="mx-auto text-emerald-600 mb-2" />
              <p>No alerts triggered. All quiet!</p>
            </div>
          )}
          {alerts.map(alert => (
            <div
              key={alert._id}
              className={`card flex items-start gap-4 ${!alert.resolved ? 'border-red-900/60 bg-red-950/5' : 'opacity-60'}`}
            >
              <AlertTriangle size={18} className={alert.resolved ? 'text-slate-500' : 'text-red-400'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{alert.ruleName}</span>
                  {alert.resolved && (
                    <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full">Resolved</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                <p className="text-xs text-slate-600 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
              </div>
              {!alert.resolved && (
                <button
                  onClick={() => resolveAlert(alert._id)}
                  className="shrink-0 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900 hover:border-emerald-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rules */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="card text-center text-slate-500 py-10">
              <p>No alert rules yet. Create one to start monitoring.</p>
            </div>
          )}
          {rules.map(rule => (
            <div key={rule._id} className="card flex items-center gap-4">
              <button onClick={() => toggleRule(rule)} className="shrink-0">
                {rule.enabled
                  ? <ToggleRight size={22} className="text-brand-400" />
                  : <ToggleLeft  size={22} className="text-slate-600" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{rule.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {CONDITION_LABELS[rule.conditionType]} &gt; {rule.threshold} over {rule.windowMinutes}min window
                </p>
                {rule.webhookUrl && (
                  <p className="text-xs text-slate-600 mt-0.5 truncate">🔗 {rule.webhookUrl}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${rule.enabled ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-slate-500 border-slate-700'}`}>
                {rule.enabled ? 'Active' : 'Paused'}
              </span>
              <button onClick={() => deleteRule(rule._id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
