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
    <form onSubmit={submit} className="card border-[#CADFD5] space-y-4 shadow-sm bg-white">
      <div className="flex items-center justify-between border-b border-[#E2DAD0] pb-3">
        <h3 className="text-sm font-bold text-[#1D2621]">Create Alert Rule</h3>
        <span className="text-xs text-[#67786E]">Evaluated on every incoming log batch</span>
      </div>

      {err && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-[#67786E] mb-1 font-semibold">Rule name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Critical API Error Spike" />
        </div>
        <div>
          <label className="block text-xs text-[#67786E] mb-1 font-semibold">Condition Metric</label>
          <select className="select" value={cond} onChange={e=>setCond(e.target.value)}>
            {Object.entries(CONDITION_LABELS).map(([v,l])=>(
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#67786E] mb-1 font-semibold">Threshold Trigger</label>
          <input className="input" type="number" value={threshold} onChange={e=>setThresh(e.target.value)} required placeholder={cond === 'error_rate' ? '5 (%)' : '1000 (ms)'} />
        </div>
        <div>
          <label className="block text-xs text-[#67786E] mb-1 font-semibold">Window (minutes)</label>
          <input className="input" type="number" value={window} onChange={e=>setWindow(e.target.value)} min={1} max={1440} />
        </div>
        <div>
          <label className="block text-xs text-[#67786E] mb-1 font-semibold">Webhook URL (Slack / Discord)</label>
          <input className="input" value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/…" />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-[#E2DAD0]">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary text-xs disabled:opacity-60">
          {loading ? 'Creating…' : 'Save Rule'}
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
    return <div className="flex items-center justify-center h-full text-[#67786E]">Select a project.</div>;
  }

  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-[#F8F4EF]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D2621] tracking-tight font-display-hero">Alerts &amp; Incidents</h1>
          <p className="text-xs text-[#67786E] mt-1 font-medium">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured · <span className={unresolvedCount > 0 ? "text-[#BA1A1A] font-bold" : "text-[#508167] font-bold"}>{unresolvedCount} unresolved</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-lg bg-white border border-[#DDD5C7] text-[#53645A] hover:text-[#1D2621] hover:border-[#CADFD5] shadow-xs transition-colors cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            id="new-alert-rule"
            type="button"
            onClick={() => setAdding(v => !v)}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
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
      <div className="flex gap-0.5 bg-[#F2ECE2] border border-[#E2DAD0] rounded-lg p-0.5 w-fit shadow-xs">
        {[
          { key: 'triggered', label: `Triggered (${alerts.length})` },
          { key: 'rules',     label: `Rules (${rules.length})`      },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              tab === key ? 'bg-[#508167] text-white shadow-xs' : 'text-[#53645A] hover:text-[#1D2621]'
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
            <div className="card text-center text-[#67786E] py-12 bg-white">
              <CheckCircle size={36} className="mx-auto text-[#508167] mb-2" />
              <p className="font-semibold text-sm text-[#1D2621]">No alerts triggered</p>
              <p className="text-xs text-[#67786E] mt-0.5">All services in {project.name} are healthy and operating normally.</p>
            </div>
          )}
          {alerts.map(alert => (
            <div
              key={alert._id}
              className={`card flex items-start gap-4 transition-all ${
                !alert.resolved
                  ? 'border-l-4 border-l-[#BA1A1A] bg-red-50/30'
                  : 'border-l-4 border-l-[#508167] bg-white opacity-75'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${!alert.resolved ? 'bg-red-100 text-[#BA1A1A]' : 'bg-[#CADFD5]/50 text-[#508167]'}`}>
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#1D2621]">{alert.ruleName}</span>
                  {alert.resolved ? (
                    <span className="text-[10px] text-[#2C493A] bg-[#CADFD5]/70 border border-[#CADFD5] px-2 py-0.5 rounded-full font-bold">
                      Resolved
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      Active Spike
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#2E3A33] mt-1 font-medium">{alert.message}</p>
                <p className="text-[11px] text-[#67786E] mt-1 font-mono">Triggered: {new Date(alert.createdAt).toLocaleString()}</p>
              </div>
              {!alert.resolved && (
                <button
                  type="button"
                  onClick={() => resolveAlert(alert._id)}
                  className="shrink-0 text-xs text-[#508167] hover:text-white hover:bg-[#508167] border border-[#508167] px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
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
            <div className="card text-center text-[#67786E] py-12 bg-white">
              <p className="font-semibold text-sm text-[#1D2621]">No alert rules configured yet</p>
              <p className="text-xs text-[#67786E] mt-0.5">Click &ldquo;New Rule&rdquo; above to start monitoring errors and latencies.</p>
            </div>
          )}
          {rules.map(rule => (
            <div key={rule._id} className="card flex items-center gap-4 bg-white">
              <button type="button" onClick={() => toggleRule(rule)} className="shrink-0 cursor-pointer">
                {rule.enabled
                  ? <ToggleRight size={26} className="text-[#508167]" />
                  : <ToggleLeft  size={26} className="text-[#98A69E]" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1D2621]">{rule.name}</p>
                <p className="text-xs text-[#67786E] mt-0.5 font-medium">
                  {CONDITION_LABELS[rule.conditionType]} &gt; <span className="font-bold text-[#1D2621]">{rule.threshold}</span> over {rule.windowMinutes}min window
                </p>
                {rule.webhookUrl && (
                  <p className="text-xs text-[#B58859] mt-0.5 truncate font-mono">🔗 {rule.webhookUrl}</p>
                )}
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                rule.enabled
                  ? 'text-[#2C493A] border-[#CADFD5] bg-[#CADFD5]/60'
                  : 'text-[#67786E] border-[#E2DAD0] bg-[#F2ECE2]'
              }`}>
                {rule.enabled ? 'Active' : 'Paused'}
              </span>
              <button
                type="button"
                onClick={() => deleteRule(rule._id)}
                className="text-[#67786E] hover:text-[#BA1A1A] transition-colors p-1 cursor-pointer"
                title="Delete rule"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
