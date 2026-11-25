import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, AlertTriangle, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, PUBLIC_API_URL } from '../api';
import { recallApiKey } from '../lib/apiKeys';
import CodeBlock from '../components/CodeBlock';
import Logo from '../components/Logo';

const TABS = ['Express', 'node:http', 'Any event'];

function snippets({ apiKey, projectId, host }) {
  return {
    install: 'npm install @tracenest/sdk',

    env: `# .env: keep your key out of source control
TRACENEST_API_KEY=${apiKey}
TRACENEST_HOST=${host}
TRACENEST_PROJECT_ID=${projectId}`,

    Express: `const { tracenest } = require('@tracenest/sdk');
app.use(tracenest({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST }));

// Optional, to also record stack traces of errors thrown in routes:
//   const mw = tracenest({ ... }); app.use(mw);
//   /* ...your routes... */
//   app.use(mw.client.errorHandler());`,

    'node:http': `const http = require('http');
const { createClient } = require('@tracenest/sdk');

const tn = createClient({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST });

http.createServer(tn.wrap((req, res) => {
  res.end('hello world');
})).listen(3000);`,

    'Any event': `const { createClient } = require('@tracenest/sdk');
const tn = createClient({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST });

tn.info('User signed up', { userId: 42 });
tn.warn('Slow query', { table: 'orders', ms: 812 });
tn.captureException(err, { orderId: 'A-1009' });

tn.capture({ level: 'info', message: 'Job done', endpoint: 'job:send-emails', durationMs: 1840 });`,

    curl: `curl -X POST "${host}/api/ingest/batch" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"logs":[{"level":"info","message":"Hello from TraceNest","method":"GET","endpoint":"/hello","statusCode":200,"durationMs":12}]}'`,
  };
}

function Step({ n, title, done, children }) {
  return (
    <section className="relative pl-10">
      <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full border bg-cream-50 border-ink font-mono text-xs text-ink shadow-hard-sm">
        {done ? <CheckCircle2 size={18} className="text-teal-600" /> : n}
      </div>
      <h2 className="text-base font-bold text-ink mb-2 pt-0.5">{title}</h2>
      <div className="space-y-3 text-sm text-ink-600">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tn_project'))?._id || ''; } catch { return ''; }
  });
  const [tab, setTab] = useState('Express');

  useEffect(() => {
    if (!user) return;
    api.projects.list()
      .then((d) => {
        const list = d.projects || [];
        setProjects(list);
        setSelectedId((id) => (list.some((p) => p._id === id) ? id : list[0]?._id || ''));
      })
      .catch(() => {});
  }, [user]);

  const project = projects.find((p) => p._id === selectedId) || null;
  const fullKey = project ? recallApiKey(project._id) : null;

  const values = useMemo(() => ({
    apiKey:    fullKey || (project ? `${project.apiKeyPrefix}…your_full_key` : 'tn_your_api_key'),
    projectId: project?._id || 'your_project_id',
    host:      PUBLIC_API_URL,
  }), [fullKey, project]);

  const s = snippets(values);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-10">
      <header>
        <p className="eyebrow">Setup guide</p>
        <h1 className="font-serif text-[44px] md:text-[56px] leading-[1] tracking-tight text-ink mt-2">
          Monitor your Node.js app in 3 minutes
        </h1>
        <p className="text-sm text-ink-500 mt-2">
          Install the SDK, add two lines, and every request your app serves shows up here with its status, latency and errors.
        </p>
      </header>

      {/* Key/project status */}
      {user && projects.length > 0 && (
        <div className="card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="docs-project" className="text-xs font-semibold text-ink-500 shrink-0">Snippets for project</label>
            <select
              id="docs-project"
              className="select sm:max-w-xs"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          {fullKey ? (
            <p className="text-xs text-teal-700 flex items-center gap-1.5">
              <KeyRound size={13} /> The snippets below include your full API key. Keep it secret.
            </p>
          ) : (
            <p className="text-xs text-teal-700 flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Your full API key is only shown when it&apos;s created, so the snippets use its prefix (<code className="font-mono">{project?.apiKeyPrefix}…</code>).
                Paste the key you saved, or{' '}
                <Link to="/projects" className="font-semibold underline decoration-vermilion-500 decoration-2 underline-offset-4">generate a new one</Link>.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-10">
        <Step n={1} title="Create an account and a project" done={Boolean(user && projects.length)}>
          {!user && (
            <>
              <p>Each project gets an API key that identifies it. Sign up free, with up to 10,000 logs per project per day.</p>
              <div className="flex gap-2">
                <Link to="/register" className="btn-primary text-xs">Create free account</Link>
                <Link to="/login" className="btn-ghost text-xs border border-ink/20">Sign in</Link>
              </div>
            </>
          )}
          {user && projects.length === 0 && (
            <>
              <p>You&apos;re signed in. Create a project to get your API key.</p>
              <Link to="/projects?new=1" className="btn-primary text-xs inline-block">Create a project</Link>
            </>
          )}
          {user && projects.length > 0 && (
            <p>
              Done: you&apos;re using <strong className="text-ink">{project?.name}</strong>
              {' '}(ID <code className="font-mono text-xs">{values.projectId}</code>).
            </p>
          )}
        </Step>

        <Step n={2} title="Install the SDK">
          <p>It has no dependencies and needs Node.js 16 or later.</p>
          <CodeBlock title="terminal" code={s.install} />
        </Step>

        <Step n={3} title="Add your API key to the environment">
          <CodeBlock title=".env" code={s.env} />
        </Step>

        <Step n={4} title="Add two lines of code">
          <div className="flex gap-1 bg-cream-300 border border-ink/15 rounded-lg p-0.5 w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  tab === t ? 'bg-ink text-cream-100' : 'text-ink-600 hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'Express' && (
            <p>Register the middleware <strong>before</strong> your routes. Each request is recorded with its method, route, status and duration.</p>
          )}
          {tab === 'node:http' && <p>Wrap your request handler. This works for any server built on Node&apos;s <code className="font-mono text-xs">http</code> module.</p>}
          {tab === 'Any event' && <p>Log anything: background jobs, queues, cron tasks, CLIs. Logs are batched and sent every 5 seconds.</p>}
          <CodeBlock title={tab === 'Express' ? 'app.js' : tab === 'node:http' ? 'server.js' : 'anywhere.js'} code={s[tab]} />
        </Step>

        <Step n={5} title="Check that logs arrive">
          <p>Start your app and make a few requests. You can also send a test log straight from your terminal:</p>
          <CodeBlock title="terminal" code={s.curl} />
          <p>
            A <code className="font-mono text-xs">202</code> response means the log was accepted.
            The response headers <code className="font-mono text-xs">X-Quota-Used</code> and <code className="font-mono text-xs">X-Quota-Remaining</code> show today&apos;s usage.
          </p>
          {user ? (
            <div className="flex gap-2">
              <Link to="/live" className="btn-primary text-xs inline-flex items-center gap-1.5"><Radio size={13} /> Open Live Feed</Link>
              <Link to="/overview" className="btn-ghost text-xs border border-ink/20">Overview</Link>
            </div>
          ) : null}
        </Step>
      </div>

      <section className="card space-y-2 text-xs text-ink-600">
        <h2 className="text-sm font-bold text-ink">Limits</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each project can send <strong>10,000 logs per day</strong> by default. The count resets at midnight UTC. After that, ingestion returns <code className="font-mono">429</code> and the SDK drops the extra logs.</li>
          <li>Each request can carry up to 1,000 logs. The SDK splits batches for you.</li>
          <li>Logs are deleted automatically after the retention period.</li>
        </ul>
      </section>
    </div>
  );
}

/** Minimal shell for visitors who aren't signed in. */
export function PublicDocsShell({ children }) {
  return (
    <div className="min-h-screen bg-cream-200">
      <header className="border-b border-ink bg-cream-200/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" aria-label="TraceNest home"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-xs">Sign in</Link>
            <Link to="/register" className="btn-primary text-xs">Get started</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

