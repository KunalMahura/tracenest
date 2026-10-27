import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import {
  Activity, AlertTriangle, Clock, TrendingUp, RefreshCw, Zap, ArrowUpRight
} from 'lucide-react';

const RANGES = ['15m', '1h', '6h', '24h', '7d'];

const CHART_COLORS = {
  requests: '#508167', // Pine green
  errors:   '#BA1A1A', // Deep crimson
  avgMs:    '#B58859', // Bronze caramel
};

function StatCard({ icon: Icon, label, value, sub, color = 'pine' }) {
  const colorMap = {
    pine:   'text-[#508167] bg-[#508167]/10 border-[#508167]/25',
    bronze: 'text-[#B58859] bg-[#B58859]/10 border-[#B58859]/25',
    sage:   'text-[#355845] bg-[#CADFD5]/50 border-[#CADFD5]',
    red:    'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="card flex items-start gap-4 hover:border-[#CADFD5] transition-all">
      <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.pine} shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#67786E] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-[#1D2621] mt-0.5 tracking-tight font-display-hero">{value}</p>
        {sub && <p className="text-xs text-[#67786E] mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#DDD5C7] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[#67786E] font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-mono font-bold text-[#1D2621]">{p.value}</span>
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
      <div className="flex items-center justify-center h-full text-[#67786E]">
        Select a project from the sidebar to view metrics.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1D2621] tracking-tight font-display-hero">{project.name}</h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#CADFD5]/60 text-[#2C493A] font-semibold">
              Live APM
            </span>
          </div>
          <p className="text-xs text-[#67786E] mt-1 font-medium">Real-time performance metrics and service health</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex bg-[#F2ECE2] border border-[#E2DAD0] rounded-lg p-0.5 shadow-xs">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  range === r
                    ? 'bg-[#508167] text-white shadow-xs'
                    : 'text-[#53645A] hover:text-[#1D2621]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white border border-[#DDD5C7] text-[#53645A] hover:text-[#1D2621] hover:border-[#CADFD5] shadow-xs transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Requests"
          value={stats?.totalRequests?.toLocaleString() ?? '—'}
          color="pine"
          sub="Processed through Redis queue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Errors"
          value={stats?.errorCount?.toLocaleString() ?? '—'}
          color="red"
          sub={`${stats?.errorRate ?? 0}% error rate`}
        />
        <StatCard
          icon={Clock}
          label="P95 Latency"
          value={stats ? `${stats.p95}ms` : '—'}
          color="bronze"
          sub={`p99: ${stats?.p99 ?? 0}ms`}
        />
        <StatCard
          icon={Activity}
          label="Avg Latency"
          value={stats ? `${stats.avgMs}ms` : '—'}
          color="sage"
          sub={`p50: ${stats?.p50 ?? 0}ms`}
        />
      </div>

      {/* Throughput Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#1D2621]">Requests &amp; Errors Over Time</h2>
            <p className="text-xs text-[#67786E]">Throughput trend across all ingested service spans</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-[#508167]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#508167]" /> Requests
            </span>
            <span className="flex items-center gap-1.5 text-[#BA1A1A]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]" /> Errors
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={throughput} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.requests} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.requests} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gErr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.errors} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.errors} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2DAD0" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#67786E' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#67786E' }} tickLine={false} axisLine={false} />
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#1D2621]">Slowest Endpoints (avg)</h2>
              <p className="text-xs text-[#67786E]">Highest average response latency</p>
            </div>
            <span className="p-1.5 rounded-lg bg-[#B58859]/15 text-[#B58859]">
              <Clock size={16} />
            </span>
          </div>

          <div className="space-y-3">
            {slowest.length === 0 && <p className="text-[#67786E] text-xs py-4 text-center">No data in this range.</p>}
            {slowest.map((ep) => (
              <div key={ep.endpoint} className="p-2.5 rounded-lg bg-[#F8F4EF] border border-[#E2DAD0] flex items-center justify-between gap-3">
                <code className="text-xs text-[#1D2621] font-mono truncate font-semibold">{ep.endpoint}</code>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-[#B58859]">{ep.avgMs}ms</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#67786E] font-medium border border-[#DDD5C7]">
                    {ep.count} reqs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Failing Endpoints */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#1D2621]">Failing Endpoints</h2>
              <p className="text-xs text-[#67786E]">Most frequent HTTP 4xx &amp; 5xx errors</p>
            </div>
            <span className="p-1.5 rounded-lg bg-red-100 text-red-700">
              <AlertTriangle size={16} />
            </span>
          </div>

          <div className="space-y-3">
            {failing.length === 0 && <p className="text-[#67786E] text-xs py-4 text-center">No failing endpoints in this range.</p>}
            {failing.map((f) => (
              <div key={f.endpoint} className="p-2.5 rounded-lg bg-red-50/60 border border-red-200/70 flex items-center justify-between gap-3">
                <code className="text-xs text-red-900 font-mono truncate font-semibold">{f.endpoint}</code>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-red-700">{f.errorCount} errors</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-red-800 font-medium border border-red-200">
                    {f.errorRate}% rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
