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

  const isErr = log.level === 'error';

  return (
    <div className={`border-b border-ink/15 ${isErr ? 'bg-vermilion-50/50' : 'bg-cream-50'}`}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-cream-200 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-ink-500 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={`${BADGE[log.level] || 'badge-debug'} shrink-0 font-medium`}>{log.level}</span>
        <span className="text-xs text-ink-500 font-mono shrink-0 w-36">{ts}</span>
        {log.method && log.endpoint && (
          <code className="text-xs text-ink shrink-0 bg-cream-300 px-2 py-0.5 rounded font-mono font-medium border border-ink/20">
            {log.method} {log.endpoint}
          </code>
        )}
        {log.statusCode && (
          <span className={`text-xs font-mono font-bold shrink-0 ${log.statusCode >= 500 ? 'text-vermilion-600' : log.statusCode >= 400 ? 'text-cream-600' : 'text-teal-600'}`}>
            {log.statusCode}
          </span>
        )}
        {log.durationMs && (
          <span className="text-xs text-ink-500 font-mono shrink-0 font-medium">{log.durationMs}ms</span>
        )}
        <span className="text-xs text-ink-800 truncate flex-1 font-mono">{log.message}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-12 py-4 space-y-3 bg-cream-50 border-t border-ink/15">
          {log.stack && (
            <div>
              <p className="text-[11px] font-semibold text-vermilion-500 mb-1 uppercase tracking-wider">Stack Trace</p>
              <pre className="text-xs font-mono text-vermilion-800 bg-cream-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-vermilion-200 shadow-2xs">
                {log.stack}
              </pre>
            </div>
          )}
          {log.meta && Object.keys(log.meta).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-500 mb-1 uppercase tracking-wider">Metadata</p>
              <pre className="text-xs font-mono text-ink bg-cream-50 rounded-lg p-3 overflow-x-auto border border-ink/20 shadow-2xs">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[11px] text-ink-500 font-mono">Trace/Log ID: {log._id}</p>
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
      setLogs(prev => append ? [...prev, ...(result.logs || [])] : (result.logs || []));
      setTotal(result.total ?? 0);
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
      <div className="flex items-center justify-center h-full text-ink-500">
        Select a project from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cream-200">
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-ink/15 bg-cream-50 flex flex-wrap gap-3 items-center shadow-2xs">
        <h1 className="font-serif text-[30px] leading-none text-ink mr-2">Log Explorer</h1>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            id="log-search"
            className="input pl-8 bg-cream-200"
            placeholder="Search messages, paths, payload…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {/* Level */}
        <select
          id="level-filter"
          className="select w-32 bg-cream-200"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          {LEVELS.map(l => (
            <option key={l} value={l}>{l || 'All levels'}</option>
          ))}
        </select>

        {/* Range */}
        <div className="flex bg-cream-300 border border-ink/15 rounded-lg p-0.5 shadow-xs">
          {RANGES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                range === r
                  ? 'bg-ink text-cream-100'
                  : 'text-ink-600 hover:text-ink'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setCursor(null); setLogs([]); fetchLogs(false); }}
          className="p-2 rounded-lg bg-cream-50 border border-ink/20 text-ink-600 hover:text-ink hover:border-teal-300 shadow-xs transition-colors cursor-pointer"
          title="Refresh logs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <span className="text-xs text-ink-500 font-medium ml-auto">
          <span className="font-bold text-ink">{total.toLocaleString()}</span> logs
        </span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto bg-cream-50">
        {logs.length === 0 && !loading && (
          <div className="flex items-center justify-center h-64 text-ink-500 text-xs">
            No logs match the current filters.
          </div>
        )}
        {logs.map(log => <LogRow key={log._id} log={log} />)}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-6 bg-cream-50 border-t border-ink/15">
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-cream-50 border border-ink/20 hover:border-ink text-xs font-semibold text-ink shadow-xs transition-colors cursor-pointer"
            >
              {loading ? 'Loading…' : 'Load more logs'}
            </button>
          </div>
        )}

        {loading && logs.length === 0 && (
          <div className="flex justify-center pt-16">
            <RefreshCw size={20} className="animate-spin text-vermilion-500" />
          </div>
        )}
      </div>
    </div>
  );
}
