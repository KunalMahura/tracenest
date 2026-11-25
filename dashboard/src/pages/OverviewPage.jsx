import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { api } from '../api';
import QuotaBar from '../components/QuotaBar';
import Tilt from '../components/Tilt';

const RANGES = ['15m', '1h', '6h', '24h', '7d'];

const CHART = {
  requests: '#57857c', // teal-500
  errors:   '#e73213', // vermilion-500
  grid:     'rgba(28,25,21,0.10)',
  tick:     '#776e60',
};

/** Animates a number toward its new value whenever it changes. */
function useTweened(value, duration = 700) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);
  useEffect(() => {
    if (value == null || Number.isNaN(value)) return undefined;
    const start = from.current;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const v = start + (value - start) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

function Stat({ label, value, unit = '', sub, accent = false, decimals = 0 }) {
  const n = useTweened(value);
  const text = value == null
    ? '—'
    : n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  return (
    <Tilt max={5}>
      <div className={`rounded-[12px] border p-5 h-full ${accent ? 'bg-vermilion-500 text-cream-50 border-ink shadow-hard' : 'bg-cream-50 border-ink/20'}`}>
        <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${accent ? 'text-cream-50/80' : 'text-ink-500'}`}>{label}</p>
        <p className="font-serif text-[46px] leading-none tracking-tight mt-3 tabular">
          {text}
          {value != null && unit && <span className={`font-sans text-[15px] ml-1 ${accent ? 'text-cream-50/80' : 'text-ink-500'}`}>{unit}</span>}
        </p>
        {sub && <p className={`text-[12.5px] mt-2 ${accent ? 'text-cream-50/85' : 'text-ink-600'}`}>{sub}</p>}
      </div>
    </Tilt>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink bg-cream-50 px-3 py-2 shadow-hard-sm text-[12px]">
      <p className="font-mono text-ink-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name} <span className="font-mono font-semibold ml-auto pl-3">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function Panel({ title, note, children, className = '' }) {
  return (
    <section className={`rounded-[12px] border border-ink/20 bg-cream-50 ${className}`}>
      <header className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3 border-b border-ink/10">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="text-[12px] text-ink-500">{note}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function BarList({ rows, value, max, format, danger = false, empty }) {
  if (!rows.length) return <p className="text-ink-500 text-[13px] py-6 text-center">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = max ? Math.max(4, (value(r) / max) * 100) : 0;
        return (
          <li key={r.endpoint} className="relative">
            <div
              className={`absolute inset-y-0 left-0 rounded-md ${danger ? 'bg-vermilion-100' : 'bg-teal-100'}`}
              style={{ width: `${pct}%`, transition: 'width .6s cubic-bezier(.2,.7,.2,1)' }}
            />
            <div className="relative flex items-center justify-between gap-3 px-3 py-2">
              <code className="font-mono text-[12.5px] truncate">{r.endpoint}</code>
              <span className={`font-mono text-[12.5px] shrink-0 ${danger ? 'text-vermilion-700' : 'text-ink-700'}`}>{format(r)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function OverviewPage() {
  const { project }           = useOutletContext();
  const [range, setRange]     = useState('1h');
  const [loading, setLoading] = useState(false);
  const [stats, setStats]     = useState(null);
  const [throughput, setThroughput] = useState([]);
  const [slowest, setSlowest] = useState([]);
  const [failing, setFailing] = useState([]);
  const [usage, setUsage]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    // Quota is independent of the analytics range — don't let one failure hide the other
    api.projects.usage(project._id).then((d) => setUsage(d.usage)).catch(() => {});
    try {
      const [s, t, slow, fail] = await Promise.all([
        api.analytics.overview(project._id, range),
        api.analytics.throughput(project._id, range),
        api.analytics.topEndpoints(project._id, range),
        api.analytics.topFailing(project._id, range),
      ]);
      setStats(s);
      setThroughput(t.map((pt) => ({
        ...pt,
        time: new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })));
      setSlowest(slow);
      setFailing(fail);
      setUpdatedAt(new Date());
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
      <div className="min-h-[70vh] grid place-items-center p-8">
        <div className="max-w-md text-center">
          <p className="font-serif text-[40px] leading-tight">The nest is <span className="italic">empty.</span></p>
          <p className="text-ink-600 mt-3">Create a project to get an API key, then add two lines to your app.</p>
          <Link to="/projects" className="btn-primary mt-6">Create a project</Link>
        </div>
      </div>
    );
  }

  const hasErrors = (stats?.errorCount ?? 0) > 0;
  const noData = stats && !stats.totalRequests;

  return (
    <div className="px-5 md:px-10 py-8 space-y-6 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Overview · last {range}</p>
          <h1 className="font-serif text-[44px] md:text-[54px] leading-[0.95] tracking-tight mt-2">{project.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="hidden sm:inline font-mono text-[11px] text-ink-500">
              updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <div className="flex rounded-lg border border-ink bg-cream-50 p-0.5 shadow-hard-sm" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md font-mono text-[12px] transition-colors cursor-pointer ${
                  range === r ? 'bg-ink text-cream-100' : 'text-ink-600 hover:text-ink'
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
            className="p-2.5 rounded-lg border border-ink bg-cream-50 shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow] cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {noData && (
        <div className="rounded-[12px] border border-dashed border-ink/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream-100">
          <p className="text-[14px] text-ink-700">No requests in this range yet. Is the SDK installed?</p>
          <Link to="/docs" className="inline-flex items-center gap-1 text-[14px] font-semibold underline decoration-vermilion-500 decoration-2 underline-offset-4">
            Open the setup guide <ArrowUpRight size={14} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Requests" value={stats?.totalRequests} sub="ingested in this range" />
        <Stat
          label="Errors"
          value={stats?.errorCount}
          sub={`${stats?.errorRate ?? 0}% error rate`}
          accent={hasErrors}
        />
        <Stat label="p95 latency" value={stats?.p95} unit="ms" sub={`p99 ${stats?.p99 ?? 0}ms`} />
        <Stat label="Average" value={stats?.avgMs} unit="ms" sub={`p50 ${stats?.p50 ?? 0}ms`} />
      </div>

      {/* Quota */}
      <div className="rounded-[12px] border border-ink/20 bg-cream-50 px-5 py-4 grid sm:grid-cols-[180px_1fr] gap-3 items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">Daily quota</p>
          <p className="text-[12px] text-ink-500">ingest returns 429 when full</p>
        </div>
        <QuotaBar usage={usage} />
      </div>

      {/* Throughput */}
      <Panel
        title="Requests and errors over time"
        note={
          <span className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART.requests }} /> requests</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART.errors }} /> errors</span>
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={throughput} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <pattern id="hatchErr" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={CHART.errors} strokeWidth="2" opacity="0.45" />
              </pattern>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: CHART.tick, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={48} />
            <YAxis tick={{ fontSize: 11, fill: CHART.tick, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1c1915', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="requests" name="Requests" stroke={CHART.requests} fill={CHART.requests} fillOpacity={0.18} strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="errors" name="Errors" stroke={CHART.errors} fill="url(#hatchErr)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Slowest endpoints" note="average latency">
          <BarList
            rows={slowest}
            value={(r) => r.avgMs}
            max={Math.max(0, ...slowest.map((r) => r.avgMs))}
            format={(r) => `${r.avgMs}ms · ${r.count}`}
            empty="No requests in this range."
          />
        </Panel>
        <Panel title="Failing endpoints" note="4xx and 5xx responses">
          <BarList
            rows={failing}
            value={(r) => r.errorCount}
            max={Math.max(0, ...failing.map((r) => r.errorCount))}
            format={(r) => `${r.errorCount} · ${r.errorRate}%`}
            danger
            empty="Nothing failing. Enjoy it."
          />
        </Panel>
      </div>
    </div>
  );
}
