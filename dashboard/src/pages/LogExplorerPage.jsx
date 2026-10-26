import { useEffect, useState, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { Search, Filter, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const LEVELS  = ['', 'error', 'warn', 'info', 'debug'];
const RANGES  = ['15m', '1h', '6h', '24h', '7d'];
const BADGE   = { error: 'badge-error', warn: 'badge-warn', info: 'badge-info', debug: 'badge-debug' };

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(log.timestamp).toLocaleString([], {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className={`border-b border-slate-800/60 ${log.level === 'error' ? 'bg-red-950/10' : ''}`}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-slate-500 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={`${BADGE[log.level] || 'badge-debug'} shrink-0`}>{log.level}</span>
        <span className="text-xs text-slate-500 font-mono shrink-0 w-36">{ts}</span>
        {log.method && log.endpoint && (
          <code className="text-xs text-slate-400 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded">
            {log.method} {log.endpoint}
          </code>
        )}
        {log.statusCode && (
          <span className={`text-xs font-mono shrink-0 ${log.statusCode >= 500 ? 'text-red-400' : log.statusCode >= 400 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {log.statusCode}
          </span>
        )}
        {log.durationMs && (
          <span className="text-xs text-slate-500 font-mono shrink-0">{log.durationMs}ms</span>
        )}
        <span className="text-sm text-slate-300 truncate flex-1">{log.message}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-10 pb-4 space-y-3 bg-slate-900/50">
          {log.stack && (
            <pre className="text-xs font-mono text-red-400/80 bg-slate-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-slate-800">
              {log.stack}
            </pre>
          )}
          {log.meta && Object.keys(log.meta).length > 0 && (
            <pre className="text-xs font-mono text-slate-400 bg-slate-900 rounded-lg p-3 overflow-x-auto border border-slate-800">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          )}
          <p className="text-xs text-slate-600 font-mono">ID: {log._id}</p>
        </div>
      )}
    </div>
  );
}

export default function LogExplorerPage() {
  const { project }          = useOutletContext();
  const [logs, setLogs]      = useState([]);
  const [total, setTotal]    = useState(0);
  const [loading, setLoading]= useState(false);
  const [range, setRange]    = useState('1h');
  const [level, setLevel]    = useState('');
  const [q, setQ]            = useState('');
  const [cursor, setCursor]  = useState(null);
  const [hasMore, setHasMore]= useState(false);
  const inputTimer           = useRef(null);

  const fetchLogs = useCallback(async (append = false) => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await api.logs.search({
        projectId: project._id,
        range,
        level:  level || undefined,
        q:      q.trim() || undefined,
        cursor: append ? cursor : undefined,
        limit:  50,
      });
      setLogs(prev => append ? [...prev, ...result.logs] : result.logs);
      setTotal(result.total);
      setCursor(result.nextCursor);
      setHasMore(Boolean(result.nextCursor));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [project, range, level, q, cursor]);

  // Reset + fetch on filter change
  useEffect(() => {
    setCursor(null);
    setLogs([]);
    fetchLogs(false);
  }, [project, range, level]);

  // Debounce search query
  useEffect(() => {
    clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => {
      setCursor(null);
      setLogs([]);
      fetchLogs(false);
    }, 400);
    return () => clearTimeout(inputTimer.current);
  }, [q]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a project from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-3 items-center">
        <h1 className="text-base font-semibold text-white mr-2">Log Explorer</h1>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="log-search"
            className="input pl-8"
            placeholder="Search messages…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {/* Level */}
        <select
          id="level-filter"
          className="select w-32"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          {LEVELS.map(l => (
            <option key={l} value={l}>{l || 'All levels'}</option>
          ))}
        </select>

        {/* Range */}
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <button onClick={() => { setCursor(null); setLogs([]); fetchLogs(false); }} className="btn-ghost flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <span className="text-xs text-slate-500 ml-auto">{total.toLocaleString()} total</span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto">
        {logs.length === 0 && !loading && (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            No logs match the current filters.
          </div>
        )}
        {logs.map(log => <LogRow key={log._id} log={log} />)}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => fetchLogs(true)}
              disabled={loading}
              className="btn-ghost border border-slate-700 px-6"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {loading && logs.length === 0 && (
          <div className="flex justify-center pt-12">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}
