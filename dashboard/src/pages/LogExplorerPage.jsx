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
    <div className={`border-b border-[#E2DAD0]/70 ${isErr ? 'bg-red-50/50' : 'bg-white'}`}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-[#F8F4EF] transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[#67786E] shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={`${BADGE[log.level] || 'badge-debug'} shrink-0 font-medium`}>{log.level}</span>
        <span className="text-xs text-[#67786E] font-mono shrink-0 w-36">{ts}</span>
        {log.method && log.endpoint && (
          <code className="text-xs text-[#1D2621] shrink-0 bg-[#F2ECE2] px-2 py-0.5 rounded font-mono font-medium border border-[#DDD5C7]">
            {log.method} {log.endpoint}
          </code>
        )}
        {log.statusCode && (
          <span className={`text-xs font-mono font-bold shrink-0 ${log.statusCode >= 500 ? 'text-[#BA1A1A]' : log.statusCode >= 400 ? 'text-[#B58859]' : 'text-[#508167]'}`}>
            {log.statusCode}
          </span>
        )}
        {log.durationMs && (
          <span className="text-xs text-[#67786E] font-mono shrink-0 font-medium">{log.durationMs}ms</span>
        )}
        <span className="text-xs text-[#2E3A33] truncate flex-1 font-mono">{log.message}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-12 py-4 space-y-3 bg-[#FAF7F2] border-t border-[#E2DAD0]/50">
          {log.stack && (
            <div>
              <p className="text-[11px] font-semibold text-[#BA1A1A] mb-1 uppercase tracking-wider">Stack Trace</p>
              <pre className="text-xs font-mono text-red-950 bg-white rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-red-200 shadow-2xs">
                {log.stack}
              </pre>
            </div>
          )}
          {log.meta && Object.keys(log.meta).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#67786E] mb-1 uppercase tracking-wider">Metadata</p>
              <pre className="text-xs font-mono text-[#1D2621] bg-white rounded-lg p-3 overflow-x-auto border border-[#DDD5C7] shadow-2xs">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[11px] text-[#67786E] font-mono">Trace/Log ID: {log._id}</p>
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
      <div className="flex items-center justify-center h-full text-[#67786E]">
        Select a project from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F4EF]">
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-[#E2DAD0] bg-white flex flex-wrap gap-3 items-center shadow-2xs">
        <h1 className="text-base font-bold text-[#1D2621] mr-2 font-display-hero">Log Explorer</h1>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#67786E]" />
          <input
            id="log-search"
            className="input pl-8 bg-[#F8F4EF]"
            placeholder="Search messages, paths, payload…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {/* Level */}
        <select
          id="level-filter"
          className="select w-32 bg-[#F8F4EF]"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          {LEVELS.map(l => (
            <option key={l} value={l}>{l || 'All levels'}</option>
          ))}
        </select>

        {/* Range */}
        <div className="flex bg-[#F2ECE2] border border-[#E2DAD0] rounded-lg p-0.5 shadow-xs">
          {RANGES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
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
          onClick={() => { setCursor(null); setLogs([]); fetchLogs(false); }}
          className="p-2 rounded-lg bg-white border border-[#DDD5C7] text-[#53645A] hover:text-[#1D2621] hover:border-[#CADFD5] shadow-xs transition-colors cursor-pointer"
          title="Refresh logs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <span className="text-xs text-[#67786E] font-medium ml-auto">
          <span className="font-bold text-[#1D2621]">{total.toLocaleString()}</span> logs
        </span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto bg-white">
        {logs.length === 0 && !loading && (
          <div className="flex items-center justify-center h-64 text-[#67786E] text-xs">
            No logs match the current filters.
          </div>
        )}
        {logs.map(log => <LogRow key={log._id} log={log} />)}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-6 bg-[#FAF7F2] border-t border-[#E2DAD0]">
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-white border border-[#DDD5C7] hover:border-[#508167] text-xs font-semibold text-[#1D2621] shadow-xs transition-colors cursor-pointer"
            >
              {loading ? 'Loading…' : 'Load more logs'}
            </button>
          </div>
        )}

        {loading && logs.length === 0 && (
          <div className="flex justify-center pt-16">
            <RefreshCw size={20} className="animate-spin text-[#508167]" />
          </div>
        )}
      </div>
    </div>
  );
}
