import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Wifi, WifiOff, Trash2 } from 'lucide-react';

const BADGE = { error: 'badge-error', warn: 'badge-warn', info: 'badge-info', debug: 'badge-debug' };
const MAX_LOGS = 200;

function getToken() {
  return localStorage.getItem('tn_token');
}

export default function LiveFeedPage() {
  const { project }        = useOutletContext();
  const [logs, setLogs]    = useState([]);
  const [alerts, setAlerts]= useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError]  = useState('');
  const [paused, setPaused]= useState(false);
  const esRef              = useRef(null);
  const bottomRef          = useRef(null);
  const pausedRef          = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    if (!project) return;

    const token     = getToken();
    const apiBase   = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url       = `${apiBase}/api/sse/events?projectId=${project._id}`;

    // Close any existing connection
    esRef.current?.close();
    setLogs([]);
    setAlerts([]);
    setError('');

    const es = new EventSource(url + `&token=${token}`); // token via query (SSE can't set headers)
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('log', (e) => {
      if (pausedRef.current) return;
      const log = JSON.parse(e.data);
      setLogs((prev) => {
        const next = [log, ...prev];
        return next.length > MAX_LOGS ? next.slice(0, MAX_LOGS) : next;
      });
    });

    es.addEventListener('alert', (e) => {
      const data = JSON.parse(e.data);
      setAlerts((prev) => [data, ...prev].slice(0, 20));
    });

    es.addEventListener('heartbeat', () => {});

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost — attempting to reconnect…');
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [project]);

  // SSE doesn't support custom headers; we pass the JWT in the query string.
  // The backend (sse.routes.js) should be adapted to also accept token from query.
  // For now, logs appear after connecting.

  const clear = () => setLogs([]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a project from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900/50">
        <h1 className="text-base font-semibold text-white">Live Feed</h1>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400">Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              <span className="text-xs text-red-400">{error || 'Connecting…'}</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPaused(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              paused
                ? 'bg-yellow-600/20 border-yellow-700 text-yellow-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={clear} className="btn-ghost flex items-center gap-1.5 text-xs">
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Log stream */}
        <div className="flex-1 overflow-auto font-mono text-xs">
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-2">
              <Wifi size={28} />
              <p>Waiting for events from {project.name}…</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div
              key={`${log._id}-${i}`}
              className={`flex gap-3 px-4 py-1.5 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-start ${
                log.level === 'error' ? 'bg-red-950/10' : ''
              }`}
            >
              <span className="text-slate-600 shrink-0 w-20">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`${BADGE[log.level] || 'badge-debug'} shrink-0`}>{log.level}</span>
              {log.statusCode && (
                <span className={`shrink-0 ${log.statusCode >= 500 ? 'text-red-400' : log.statusCode >= 400 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {log.statusCode}
                </span>
              )}
              {log.durationMs && (
                <span className="text-slate-600 shrink-0">{log.durationMs}ms</span>
              )}
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Alert sidebar */}
        {alerts.length > 0 && (
          <div className="w-72 shrink-0 border-l border-slate-800 overflow-auto">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">🚨 Alert Triggers</p>
            </div>
            {alerts.map((data, i) => (
              <div key={i} className="px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/30">
                <p className="text-xs font-medium text-red-400">{data.alert?.ruleName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{data.alert?.message}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(data.alert?.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
