import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import {
  Plus, Trash2, RefreshCw, Play, Pause, Zap, Globe, Activity, ExternalLink,
} from 'lucide-react';

const INTERVALS = [
  { value: 1,  label: '1m'  },
  { value: 5,  label: '5m'  },
  { value: 15, label: '15m' },
];

const MAX_MONITORS = 10;
const AUTO_REFRESH_MS = 30_000;

function timeAgo(date) {
  if (!date) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 5)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleString();
}

function StatusBadge({ monitor }) {
  if (!monitor.enabled) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border text-ink-500 border-ink/15 bg-cream-300">
        Paused
      </span>
    );
  }
  if (monitor.lastStatus === 'up') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold border text-teal-700 border-teal-300 bg-teal-300/60">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" aria-hidden="true" /> UP
      </span>
    );
  }
  if (monitor.lastStatus === 'down') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold border text-vermilion-700 border-vermilion-200 bg-vermilion-100">
        <span className="w-1.5 h-1.5 rounded-full bg-vermilion-500 animate-blink" aria-hidden="true" /> DOWN
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border text-ink-600 border-ink/15 bg-cream-200">
      Pending
    </span>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow !text-[10px]">{label}</p>
      <p className={`font-mono text-[15px] font-semibold tabular mt-0.5 truncate ${tone || 'text-ink'}`}>{value}</p>
    </div>
  );
}

function MonitorForm({ projectId, onCreated, onCancel }) {
  const [name, setName]         = useState('');
  const [url, setUrl]           = useState('https://');
  const [intervalMin, setIntervalMin] = useState(5);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const created = await api.monitors.create({
        projectId,
        name,
        url: url.trim(),
        intervalMinutes: Number(intervalMin),
      });
      onCreated(created);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card border-teal-300 space-y-4 shadow-sm bg-cream-50">
      <div className="flex items-center justify-between border-b border-ink/15 pb-3">
        <h3 className="text-sm font-bold text-ink">Add URL Monitor</h3>
        <span className="text-xs text-ink-500">No SDK needed — TraceNest pings it for you</span>
      </div>

      {err && (
        <p className="text-xs text-vermilion-700 bg-vermilion-50 border border-vermilion-200 px-3 py-2 rounded-lg font-medium">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3">
        <div>
          <label htmlFor="monitor-name" className="block text-xs text-ink-500 mb-1 font-semibold">Name</label>
          <input
            id="monitor-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Marketing site"
          />
        </div>
        <div>
          <label htmlFor="monitor-url" className="block text-xs text-ink-500 mb-1 font-semibold">Public URL</label>
          <input
            id="monitor-url"
            className="input font-mono"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://example.com/health"
          />
        </div>
        <div>
          <span className="block text-xs text-ink-500 mb-1 font-semibold">Interval</span>
          <div className="flex gap-0.5 bg-cream-300 border border-ink/15 rounded-lg p-0.5 w-fit" role="radiogroup" aria-label="Check interval">
            {INTERVALS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={intervalMin === value}
                onClick={() => setIntervalMin(value)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                  intervalMin === value ? 'bg-ink text-cream-100' : 'text-ink-600 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-ink/15">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary text-xs disabled:opacity-60">
          {loading ? 'Validating…' : 'Start Monitoring'}
        </button>
      </div>
    </form>
  );
}

function MonitorCard({ monitor, busy, onCheck, onToggle, onDelete }) {
  const uptime = monitor.uptimePercent;
  const uptimeTone =
    uptime === null || uptime === undefined ? 'text-ink-500'
      : uptime >= 99 ? 'text-teal-700'
      : uptime >= 95 ? 'text-ink'
      : 'text-vermilion-600';

  const code = monitor.lastStatusCode;
  const codeTone =
    code === null || code === undefined ? 'text-ink-500'
      : code < 400 ? 'text-teal-700'
      : 'text-vermilion-600';

  const isDown = monitor.enabled && monitor.lastStatus === 'down';

  return (
    <div
      className={`card bg-cream-50 transition-all ${
        isDown ? 'border-l-4 border-l-vermilion-500' : monitor.enabled && monitor.lastStatus === 'up' ? 'border-l-4 border-l-teal-400' : 'border-l-4 border-l-ink/15'
      } ${!monitor.enabled ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 w-fit ${isDown ? 'bg-vermilion-100 text-vermilion-500' : 'bg-teal-100 text-teal-600'}`}>
          <Globe size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-ink">{monitor.name}</span>
            <StatusBadge monitor={monitor} />
            <span className="text-[10px] font-mono text-ink-500 border border-ink/15 rounded px-1.5 py-0.5">
              every {monitor.intervalMinutes}m
            </span>
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-1 font-mono max-w-full"
          >
            <span className="truncate">{monitor.url}</span>
            <ExternalLink size={11} className="shrink-0" />
          </a>
          {monitor.lastError && isDown && (
            <p className="text-[11px] text-vermilion-700 mt-1 font-mono truncate" title={monitor.lastError}>
              {monitor.lastError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onCheck(monitor)}
            disabled={busy}
            className="btn-secondary !text-xs !px-3 !py-1.5 disabled:opacity-60 cursor-pointer"
            title="Run a check now"
          >
            <Zap size={13} className={busy ? 'animate-pulse' : ''} />
            {busy ? 'Checking…' : 'Check Now'}
          </button>
          <button
            type="button"
            onClick={() => onToggle(monitor)}
            className="p-2 rounded-lg text-ink-600 hover:text-ink hover:bg-cream-300/70 transition-colors cursor-pointer"
            title={monitor.enabled ? 'Pause monitor' : 'Resume monitor'}
            aria-label={monitor.enabled ? 'Pause monitor' : 'Resume monitor'}
          >
            {monitor.enabled ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(monitor)}
            className="p-2 rounded-lg text-ink-500 hover:text-vermilion-500 hover:bg-vermilion-50 transition-colors cursor-pointer"
            title="Delete monitor"
            aria-label="Delete monitor"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-ink/10">
        <Stat
          label="Uptime"
          value={uptime === null || uptime === undefined ? '—' : `${uptime.toFixed(2)}%`}
          tone={uptimeTone}
        />
        <Stat
          label="Latency"
          value={monitor.lastLatencyMs === null || monitor.lastLatencyMs === undefined ? '—' : `${monitor.lastLatencyMs}ms`}
        />
        <Stat label="Status code" value={code ?? '—'} tone={codeTone} />
        <Stat label="Last checked" value={timeAgo(monitor.lastCheckedAt)} />
      </div>
    </div>
  );
}

export default function MonitorsPage() {
  const { project }               = useOutletContext();
  const [monitors, setMonitors]   = useState([]);
  const [adding, setAdding]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState({});
  const [error, setError]         = useState('');
  const [, setTick]               = useState(0);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!project) return;
    if (!quiet) setLoading(true);
    try {
      const data = await api.monitors.list(project._id);
      setMonitors(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [project]);

  useEffect(() => { load(); }, [load]);

  // Pick up scheduled checks run by the worker, and keep "x ago" labels fresh
  useEffect(() => {
    const refresh = setInterval(() => load({ quiet: true }), AUTO_REFRESH_MS);
    const clock   = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [load]);

  const replace = (updated) => {
    setMonitors((list) => list.map((m) => (m._id === updated._id ? updated : m)));
  };

  const checkNow = async (monitor) => {
    setChecking((c) => ({ ...c, [monitor._id]: true }));
    setError('');
    try {
      const updated = await api.monitors.check(monitor._id);
      replace(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking((c) => ({ ...c, [monitor._id]: false }));
    }
  };

  const toggle = async (monitor) => {
    setError('');
    try {
      const updated = await api.monitors.update(monitor._id, { enabled: !monitor.enabled });
      replace(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (monitor) => {
    if (!confirm(`Delete monitor "${monitor.name}"? Its past check logs stay in the Log Explorer.`)) return;
    setError('');
    try {
      await api.monitors.del(monitor._id);
      setMonitors((list) => list.filter((m) => m._id !== monitor._id));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-full text-ink-500">Select a project.</div>;
  }

  const upCount   = monitors.filter((m) => m.enabled && m.lastStatus === 'up').length;
  const downCount = monitors.filter((m) => m.enabled && m.lastStatus === 'down').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-cream-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[44px] leading-none tracking-tight text-ink">Uptime <span className="italic">&amp;</span> latency</h1>
          <p className="text-xs text-ink-500 mt-1 font-medium">
            {monitors.length} monitor{monitors.length !== 1 ? 's' : ''} in {project.name} ·{' '}
            <span className="text-teal-600 font-bold">{upCount} up</span> ·{' '}
            <span className={downCount > 0 ? 'text-vermilion-600 font-bold' : 'text-ink-500 font-bold'}>{downCount} down</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="p-2 rounded-lg bg-cream-50 border border-ink/20 text-ink-600 hover:text-ink hover:border-teal-300 shadow-xs transition-colors cursor-pointer"
            title="Refresh monitors"
            aria-label="Refresh monitors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            id="new-monitor"
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus size={15} /> Add Monitor
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-vermilion-700 bg-vermilion-50 border border-vermilion-200 px-3 py-2 rounded-lg font-medium">
          {error}
        </p>
      )}

      {adding && (
        <MonitorForm
          projectId={project._id}
          onCreated={(created) => {
            setAdding(false);
            setMonitors((list) => [created, ...list]);
            // Run the first check immediately so the card isn't "Pending"
            checkNow(created);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {monitors.length === 0 && !loading && (
        <div className="card text-center text-ink-500 py-12 bg-cream-50">
          <Activity size={36} className="mx-auto text-teal-500 mb-2" />
          <p className="font-semibold text-sm text-ink">No monitors yet</p>
          <p className="text-xs text-ink-500 mt-0.5 max-w-md mx-auto">
            Add any public URL and TraceNest will ping it every 1, 5 or 15 minutes. Each check is written to this
            project&rsquo;s logs, so it shows up in analytics, the live feed and your alert rules.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {monitors.map((m) => (
          <MonitorCard
            key={m._id}
            monitor={m}
            busy={!!checking[m._id]}
            onCheck={checkNow}
            onToggle={toggle}
            onDelete={remove}
          />
        ))}
      </div>

      {monitors.length > 0 && (
        <p className="text-[11px] text-ink-500 font-mono">
          Up to {MAX_MONITORS} monitors per account · requests come from TraceNest with User-Agent TraceNest-UptimeMonitor/1.0
        </p>
      )}
    </div>
  );
}
