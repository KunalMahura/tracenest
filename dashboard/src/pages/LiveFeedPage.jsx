import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Wifi, WifiOff, Trash2 } from 'lucide-react';
import { API_BASE } from '../api';

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
    const url       = `${API_BASE}/api/sse/events?projectId=${project._id}`;

    // Close any existing connection
    esRef.current?.close();
    setLogs([]);
    setAlerts([]);
    setError('');

    const es = new EventSource(url + `&token=${encodeURIComponent(token)}`);
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

  const clear = () => setLogs([]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-ink-500">
        Select a project from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-cream-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ink/15 flex items-center gap-4 bg-cream-50 shadow-2xs">
        <h1 className="font-serif text-[30px] leading-none text-ink">Live <span className="italic">Feed</span></h1>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-300/60 text-teal-700 font-semibold text-xs border border-teal-300">
              <div className="w-2 h-2 bg-vermilion-500 rounded-full animate-pulse" />
              <span>Streaming SSE</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-vermilion-50 text-vermilion-700 font-semibold text-xs border border-vermilion-200">
              <div className="w-2 h-2 bg-vermilion-500 rounded-full" />
              <span>{error || 'Connecting…'}</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              paused
                ? 'bg-teal-500/15 border-teal-500 text-teal-500'
                : 'bg-cream-300 border-ink/20 text-ink hover:bg-cream-300'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            type="button"
            onClick={clear}
            className="btn-ghost flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Log stream */}
        <div className="flex-1 overflow-auto font-mono text-xs bg-cream-50">
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-ink-500 gap-2">
              <Wifi size={28} className="text-teal-300" />
              <p className="text-xs font-medium">Waiting for events from {project.name}…</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div
              key={`${log._id}-${i}`}
              className={`flex gap-3 px-6 py-2 border-b border-ink/15 hover:bg-cream-200 transition-colors items-start ${
                log.level === 'error' ? 'bg-vermilion-50/50' : ''
              }`}
            >
              <span className="text-ink-500 shrink-0 w-20">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`${BADGE[log.level] || 'badge-debug'} shrink-0 font-medium`}>{log.level}</span>
              {log.statusCode && (
                <span className={`shrink-0 font-bold ${log.statusCode >= 500 ? 'text-vermilion-600' : log.statusCode >= 400 ? 'text-cream-600' : 'text-teal-600'}`}>
                  {log.statusCode}
                </span>
              )}
              {log.durationMs && (
                <span className="text-ink-500 shrink-0">{log.durationMs}ms</span>
              )}
              <span className="text-ink break-all flex-1">{log.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Alert sidebar */}
        {alerts.length > 0 && (
          <div className="w-80 shrink-0 border-l border-ink/15 bg-cream-50 overflow-auto">
            <div className="px-4 py-3 border-b border-ink/15 bg-cream-50">
              <p className="text-xs font-bold text-vermilion-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>🚨</span> Real-time Alert Triggers
              </p>
            </div>
            {alerts.map((data, i) => (
              <div key={i} className="px-4 py-3 border-b border-ink/15 hover:bg-cream-50 transition-colors">
                <p className="text-xs font-bold text-vermilion-500">{data.alert?.ruleName}</p>
                <p className="text-xs text-ink mt-0.5 font-medium">{data.alert?.message}</p>
                <p className="text-[10px] text-ink-500 mt-1 font-mono">
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
