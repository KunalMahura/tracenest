import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { api } from '../api';
import {
  Activity, AlertTriangle, Clock, TrendingUp, RefreshCw, Zap,
} from 'lucide-react';

const RANGES = ['15m', '1h', '6h', '24h', '7d'];

const CHART_COLORS = {
  requests: '#6366f1',
  errors:   '#ef4444',
  avgMs:    '#f59e0b',
};

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand:  'text-brand-400 bg-brand-600/10 border-brand-800',
    red:    'text-red-400 bg-red-600/10 border-red-900',
    yellow: 'text-yellow-400 bg-yellow-600/10 border-yellow-900',
    emerald:'text-emerald-400 bg-emerald-600/10 border-emerald-900',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
        <Icon size={20} className={colorMap[color].split(' ')[0]} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { project }           = useOutletContext();
  const [range, setRange]     = useState('1h');
  const [loading, setLoading] = useState(false);
  const [stats, setStats]     = useState(null);
  const [throughput, setThroughput] = useState([]);
  const [slowest, setSlowest] = useState([]);
  const [failing, setFailing] = useState([]);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [s, t, slow, fail] = await Promise.all([
        api.analytics.overview(project._id, range),
        api.analytics.throughput(project._id, range),
        api.analytics.topEndpoints(project._id, range),
        api.analytics.topFailing(project._id, range),
      ]);
      setStats(s);
      setThroughput(t.map(pt => ({
        ...pt,
        time: new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })));
      setSlowest(slow);
      setFailing(fail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [project, range]);

  useEffect(() => { load(); }, [load]);
  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a project from the sidebar to view metrics.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  range === r ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}    label="Total Requests"  value={stats?.totalRequests?.toLocaleString() ?? '—'}  color="brand"   />
        <StatCard icon={AlertTriangle} label="Errors"          value={stats?.errorCount?.toLocaleString() ?? '—'}     color="red"     sub={`${stats?.errorRate ?? 0}% error rate`} />
        <StatCard icon={Clock}         label="P95 Latency"     value={stats ? `${stats.p95}ms` : '—'}                 color="yellow"  sub={`p99: ${stats?.p99 ?? 0}ms`} />
        <StatCard icon={Activity}      label="Avg Latency"     value={stats ? `${stats.avgMs}ms` : '—'}               color="emerald" sub={`p50: ${stats?.p50 ?? 0}ms`} />
      </div>

      {/* Throughput Chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Requests & Errors over time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={throughput} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.requests} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.requests} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gErr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.errors} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.errors} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="requests" name="Requests" stroke={CHART_COLORS.requests} fill="url(#gReq)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="errors"   name="Errors"   stroke={CHART_COLORS.errors}   fill="url(#gErr)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Slowest endpoints */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Slowest Endpoints (avg)</h2>
          <div className="space-y-2.5">
            {slowest.length === 0 && <p className="text-slate-500 text-sm">No data in this range.</p>}
            {slowest.map((ep) => (
              <div key={ep.endpoint} className="flex items-center gap-3">
                <code className="flex-1 text-xs text-slate-300 font-mono truncate">{ep.endpoint}</code>
                <div className="shrink-0 flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-yellow-500"
                    style={{ width: `${Math.min((ep.avgMs / (slowest[0]?.avgMs || 1)) * 80, 80)}px` }}
                  />
                  <span className="text-xs text-yellow-400 font-mono w-16 text-right">{ep.avgMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top failing endpoints */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Top Failing Endpoints</h2>
          <div className="space-y-2.5">
            {failing.length === 0 && <p className="text-slate-500 text-sm">No errors in this range.</p>}
            {failing.map((ep) => (
              <div key={ep.endpoint} className="flex items-center gap-3">
                <code className="flex-1 text-xs text-slate-300 font-mono truncate">{ep.endpoint}</code>
                <div className="shrink-0 flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-red-500"
                    style={{ width: `${Math.min((ep.errors / (failing[0]?.errors || 1)) * 80, 80)}px` }}
                  />
                  <span className="text-xs text-red-400 font-mono w-20 text-right">{ep.errors} err ({ep.errorRate}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
