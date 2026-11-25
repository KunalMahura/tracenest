import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo, { NestMark } from '../components/Logo';
import Tilt from '../components/Tilt';

const NestScene = lazy(() => import('../components/NestScene'));

const GITHUB_URL = 'https://github.com/KunalMahura/tracenest';
const INSTALL = 'npm install @tracenest/sdk';

const SNIPPETS = {
  Express: [
    ['c', "const { tracenest } = require('@tracenest/sdk');"],
    ['', ''],
    ['h', 'app.use(tracenest({'],
    ['h', '  apiKey: process.env.TRACENEST_API_KEY,'],
    ['h', '  host:   process.env.TRACENEST_HOST,'],
    ['h', '}));'],
    ['', ''],
    ['c', '// that’s it. every route below is traced.'],
  ],
  'node:http': [
    ['c', "const { createClient } = require('@tracenest/sdk');"],
    ['', 'const tn = createClient({ apiKey, host });'],
    ['', ''],
    ['h', 'http.createServer(tn.wrap((req, res) => {'],
    ['', "  res.end('ok');"],
    ['h', '})).listen(3000);'],
    ['', ''],
    ['c', '// or log anything: tn.captureException(err)'],
  ],
};

// Fake-but-plausible traffic for the preview stream (clearly labelled on the page)
const ROUTES = [
  ['GET', '/api/products'], ['GET', '/api/products/:id'], ['POST', '/api/cart'],
  ['POST', '/api/checkout'], ['GET', '/api/orders/:id'], ['PATCH', '/api/users/:id'],
  ['GET', '/health/db'], ['DELETE', '/api/cart/:item'], ['POST', '/api/auth/login'],
];
function fakeEvent(id) {
  const [method, route] = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const roll = Math.random();
  const status = roll > 0.94 ? 500 : roll > 0.86 ? 404 : roll > 0.8 ? 201 : 200;
  const ms = Math.round(status >= 500 ? 300 + Math.random() * 900 : 6 + Math.random() ** 2.2 * 260);
  return { id, method, route, status, ms, at: new Date() };
}

function useInView(ref, threshold = 0.25) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}

function CountUp({ to, duration = 1400, format = (n) => n.toLocaleString() }) {
  const ref = useRef(null);
  const inView = useInView(ref, 0.6);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref} className="tabular">{format(n)}</span>;
}

function InstallPill() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(INSTALL); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-3 rounded-lg border border-ink/20 bg-cream-50/70 pl-3 pr-2 py-2 font-mono text-[13px] text-ink-700 hover:border-ink transition-colors"
      title="Copy install command"
    >
      <span className="text-vermilion-500">$</span>
      <span>{INSTALL}</span>
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors ${copied ? 'bg-teal-300 border-ink' : 'border-ink/15 group-hover:border-ink/40'}`}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </span>
    </button>
  );
}

function NestFallback() {
  // Shown while three.js loads (and if WebGL is unavailable): concentric woven rings
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full opacity-70" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx="200" cy={170 + i * 6} rx={150 - i * 16} ry={46 - i * 5}
          fill="none" stroke={i % 2 ? '#78a39a' : '#c2ac83'} strokeWidth="3" strokeDasharray={`${40 + i * 7} 9`} />
      ))}
      <circle cx="200" cy="150" r="9" fill="#e73213" />
    </svg>
  );
}

function Hero({ user }) {
  const [caught, setCaught] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  return (
    <section className="relative">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-10 grid lg:grid-cols-[1.02fr_1fr] gap-6 lg:gap-2 items-center">
        <div className="relative z-10">
          <p className="eyebrow animate-rise-in">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-vermilion-500 mr-2 align-middle animate-blink" />
            Request tracing &amp; logs for Node.js
          </p>
          <h1 className="font-serif text-[52px] leading-[0.95] sm:text-[72px] lg:text-[88px] tracking-[-0.02em] mt-5 text-balance animate-rise-in [animation-delay:60ms]">
            Every request,{' '}
            <span className="italic text-vermilion-500">caught</span>{' '}
            in the nest.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-700 animate-rise-in [animation-delay:120ms]">
            TraceNest records the route, status, latency and stack trace of every request your app serves,
            then streams them to a dashboard while they&apos;re still warm. Two lines of code.
            No agent to install, no YAML.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise-in [animation-delay:180ms]">
            <Link to={user ? '/overview' : '/register'} className="btn-primary !text-[15px] !px-5 !py-3">
              {user ? 'Open your dashboard' : 'Start free'} <ArrowRight size={16} />
            </Link>
            <InstallPill />
          </div>
          <p className="mt-5 text-[13px] text-ink-500 animate-rise-in [animation-delay:240ms]">
            Free for 10,000 logs a day per project. No card.
          </p>
        </div>

        <div className="relative h-[340px] sm:h-[440px] lg:h-[560px] -mx-5 lg:mx-0">
          {!sceneReady && <NestFallback />}
          <Suspense fallback={null}>
            <NestScene className="absolute inset-0" onReady={() => setSceneReady(true)} onCatch={() => setCaught((c) => c + 1)} />
          </Suspense>
          <div className="absolute left-5 lg:left-2 bottom-6 rounded-lg border border-ink bg-cream-50 shadow-hard px-3.5 py-2.5 rotate-[-2deg]">
            <p className="eyebrow !text-[10px]">caught since you got here</p>
            <p className="font-mono text-2xl tabular text-ink mt-0.5">
              {caught.toLocaleString()}<span className="text-vermilion-500"> ●</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const [items] = useState(() => Array.from({ length: 14 }, (_, i) => fakeEvent(i)));
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((e) => (
        <span key={e.id} className="font-mono text-[12px] whitespace-nowrap text-cream-100/80">
          <span className="text-teal-300">{e.method}</span> {e.route}{' '}
          <span className={e.status >= 500 ? 'text-vermilion-400' : e.status >= 400 ? 'text-cream-400' : 'text-cream-50'}>{e.status}</span>{' '}
          <span className="text-cream-100/50">{e.ms}ms</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="border-y border-ink bg-ink overflow-hidden py-2.5 -rotate-[0.6deg] scale-[1.02]" aria-hidden="true">
      <div className="flex w-max animate-marquee">{row}{row}</div>
    </div>
  );
}

function Stats() {
  const stats = [
    { n: 4425, unit: 'logs / sec', note: 'sustained ingest, one API node' },
    { n: 18, unit: 'ms p50', note: 'from POST to 202 Accepted' },
    { n: 0, unit: 'dependencies', note: 'in the SDK. Node core only', fixed: '0' },
    { n: 10000, unit: 'free logs / day', note: 'per project, resets at UTC midnight' },
  ];
  return (
    <section className="max-w-[1240px] mx-auto px-5 md:px-8 py-16">
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-ink">
        {stats.map((s, i) => (
          <div key={s.unit} className={`pt-5 pb-2 pr-4 ${i > 0 ? 'lg:border-l lg:pl-5' : ''} ${i % 2 ? 'border-l pl-5 lg:pl-5' : ''} border-ink/15`}>
            <p className="font-serif text-[56px] leading-none tracking-tight">
              {s.fixed ?? <CountUp to={s.n} />}
            </p>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink mt-2">{s.unit}</p>
            <p className="text-[13px] text-ink-500 mt-1">{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CodeCard() {
  const [tab, setTab] = useState('Express');
  return (
    <Tilt>
      <div className="rounded-[12px] border border-ink bg-ink text-cream-100 shadow-hard-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-100/10 px-4 py-2.5">
          <div className="flex gap-1">
            {Object.keys(SNIPPETS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded font-mono text-[12px] transition-colors cursor-pointer ${tab === t ? 'bg-cream-100 text-ink' : 'text-cream-100/60 hover:text-cream-100'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] text-cream-100/40">{tab === 'Express' ? 'app.js' : 'server.js'}</span>
        </div>
        <pre className="px-0 py-4 font-mono text-[13.5px] leading-[1.75] overflow-x-auto">
          {SNIPPETS[tab].map(([kind, line], i) => (
            <div key={`${tab}-${i}`} className={`flex px-4 ${kind === 'h' ? 'bg-vermilion-500/15 border-l-2 border-vermilion-500' : 'border-l-2 border-transparent'}`}>
              <span className="w-7 shrink-0 select-none text-cream-100/25 tabular">{i + 1}</span>
              <span className={kind === 'c' ? 'text-teal-300' : ''}>{line || ' '}</span>
            </div>
          ))}
        </pre>
      </div>
    </Tilt>
  );
}

function PreviewStream() {
  const [rows, setRows] = useState(() => Array.from({ length: 7 }, (_, i) => fakeEvent(i)));
  const ref = useRef(null);
  const inView = useInView(ref, 0.1);
  useEffect(() => {
    if (!inView) return undefined;
    let id = 100;
    const t = setInterval(() => setRows((r) => [fakeEvent(id++), ...r].slice(0, 7)), 1100);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-[12px] border border-ink bg-cream-50 shadow-hard overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/15">
        <span className="font-mono text-[12px] text-ink-700 inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-vermilion-500 animate-blink" /> live feed
        </span>
        <span className="eyebrow !text-[10px]">simulated preview</span>
      </div>
      <ul className="divide-y divide-ink/10">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[54px_1fr_48px_60px] items-center gap-2 px-4 py-2.5 font-mono text-[12.5px] animate-row-in">
            <span className="text-teal-600 font-semibold">{r.method}</span>
            <span className="truncate text-ink">{r.route}</span>
            <span className={`text-center rounded px-1 ${r.status >= 500 ? 'bg-vermilion-500 text-cream-50' : r.status >= 400 ? 'bg-cream-300 text-ink' : 'text-ink-600'}`}>{r.status}</span>
            <span className={`text-right tabular ${r.ms > 250 ? 'text-vermilion-600' : 'text-ink-500'}`}>{r.ms}ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TwoLines() {
  return (
    <section id="sdk" className="relative border-y border-ink bg-teal-300/35">
      <div className="absolute inset-0 dotgrid opacity-50" aria-hidden="true" />
      <div className="relative max-w-[1240px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">01 / Setup</p>
          <h2 className="font-serif text-[44px] md:text-[60px] leading-[1] tracking-tight mt-3">
            Two lines in. <span className="italic">Everything</span> out.
          </h2>
          <p className="mt-4 text-ink-700 text-[16px] leading-relaxed max-w-xl">
            The SDK times each response, batches the results in memory and ships them every few seconds.
            It never blocks a request. If TraceNest is unreachable it holds the logs for later instead of failing.
          </p>
        </div>
        <div className="mt-12 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
          <CodeCard />
          <div className="lg:mt-10">
            <PreviewStream />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  const stops = [
    ['your app', 'the SDK times the request'],
    ['buffer', 'batched every 5s'],
    ['/api/ingest', '202 in ~18ms'],
    ['queue', 'Redis + BullMQ'],
    ['worker', 'bulk insert into MongoDB'],
    ['dashboard', 'pushed live over SSE'],
  ];
  return (
    <section id="how" className="max-w-[1240px] mx-auto px-5 md:px-8 py-20 md:py-28">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
        <div>
          <p className="eyebrow">02 / Under the hood</p>
          <h2 className="font-serif text-[44px] md:text-[56px] leading-[1] tracking-tight mt-3">
            Built so a traffic spike in <span className="italic">your</span> app doesn&apos;t become one in ours.
          </h2>
        </div>
        <p className="text-ink-700 text-[16px] leading-relaxed lg:pt-10 max-w-lg">
          The ingest API only validates the batch and queues it, so it answers in milliseconds.
          A separate worker writes to the database in bulk. Each project has a daily quota,
          so one noisy app can&apos;t crowd out the others.
        </p>
      </div>

      <div className="relative mt-14 hidden md:block">
        <div className="absolute left-[4%] right-[4%] top-[19px] h-px bg-ink" />
        <div className="absolute left-[8%] right-[8%] top-[14px] h-[10px]" aria-hidden="true">
          {[0, 1.1, 2.2].map((d) => (
            <span key={d} className="absolute top-0 -ml-[5px] w-[10px] h-[10px] rounded-full bg-vermilion-500 animate-travel" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
        <ol className="relative grid grid-cols-6">
          {stops.map(([name, note], i) => (
            <li key={name} className="flex flex-col items-center text-center px-2">
              <span className="w-10 h-10 rounded-full border border-ink bg-cream-100 grid place-items-center font-mono text-[12px] shadow-hard-sm">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-mono text-[13px] mt-4 text-ink">{name}</span>
              <span className="text-[12.5px] text-ink-500 mt-1">{note}</span>
            </li>
          ))}
        </ol>
      </div>
      <ol className="md:hidden mt-10 border-l border-ink ml-2 space-y-6">
        {stops.map(([name, note], i) => (
          <li key={name} className="pl-5 relative">
            <span className="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-vermilion-500 border border-ink" />
            <span className="font-mono text-[12px] text-ink-500 mr-2">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-mono text-[13px]">{name}</span>
            <p className="text-[13px] text-ink-500">{note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Features() {
  const items = [
    ['Live feed', 'New requests appear as they happen over server-sent events, with no refresh button.', 'SSE · last 20 on connect'],
    ['Latency you can act on', 'p50, p95 and p99 for any time range, plus the slowest and most-failing endpoints, ranked.', '15m → 7d'],
    ['Alerts that reach you', 'Set rules on error rate or latency. When one trips, TraceNest calls your webhook, so Slack works out of the box.', 'webhook · auto-resolve'],
    ['Search that keeps up', 'Filter by level, status code or route, or search message text across everything you’ve kept.', 'indexed per project'],
    ['Yours to run', 'Open source on Node, Redis and MongoDB. Use the hosted dashboard, or bring it up yourself with one compose file.', 'MIT · docker compose'],
  ];
  return (
    <section id="features" className="border-t border-ink">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-20 md:py-28 grid lg:grid-cols-[0.7fr_1.3fr] gap-10">
        <div className="lg:sticky lg:top-24 self-start">
          <p className="eyebrow">03 / What you get</p>
          <h2 className="font-serif text-[44px] md:text-[56px] leading-[1] tracking-tight mt-3">
            Less dashboard. <span className="italic">More answer.</span>
          </h2>
          <div className="mt-8 hidden lg:block w-40 h-40">
            <NestMark size={160} className="text-ink" />
          </div>
        </div>
        <ul className="border-t border-ink/20">
          {items.map(([title, body, meta], i) => (
            <li key={title} className="group grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_180px] gap-x-4 gap-y-1 py-7 border-b border-ink/20 transition-colors hover:bg-cream-100/70">
              <span className="font-serif italic text-[34px] leading-none text-ink-400 group-hover:text-vermilion-500 transition-colors">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight">{title}</h3>
                <p className="text-ink-700 text-[15px] leading-relaxed mt-1.5 max-w-xl">{body}</p>
              </div>
              <span className="col-start-2 md:col-start-auto font-mono text-[12px] text-teal-600 md:text-right md:pt-1.5">{meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pricing({ user }) {
  return (
    <section id="pricing" className="max-w-[1240px] mx-auto px-5 md:px-8 pb-24">
      <div className="grid md:grid-cols-[1fr_1fr] gap-6 items-stretch">
        <div className="rounded-[14px] border border-ink bg-cream-50 shadow-hard-lg p-7 md:p-9 rotate-[-0.6deg]">
          <p className="eyebrow">04 / Pricing</p>
          <p className="font-serif text-[64px] leading-none mt-4">$0</p>
          <p className="text-ink-600 mt-1">for now, while TraceNest is small</p>
          <ul className="mt-7 space-y-3 text-[15px]">
            {[
              '10,000 logs per project, per day',
              'Up to 5 projects per account',
              'Live feed, analytics and alerts included',
              'Usage shown on every response (X-Quota-* headers)',
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-vermilion-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Link to={user ? '/projects' : '/register'} className="btn-primary mt-8 !px-5 !py-2.5">
            {user ? 'Create a project' : 'Create your account'} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="rounded-[14px] border border-ink/20 p-7 md:p-9 flex flex-col justify-between ruled">
          <div>
            <p className="eyebrow">Need more than that?</p>
            <p className="font-serif text-[36px] leading-[1.05] mt-4">
              Run the whole thing <span className="italic">yourself</span>. No limits but your hardware.
            </p>
            <p className="text-ink-600 mt-4 text-[15px] leading-relaxed max-w-md">
              The API, worker and dashboard are open source. Point it at your own MongoDB and Redis,
              and set the quota to whatever you like.
            </p>
          </div>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-8 w-fit !px-5 !py-2.5">
            View on GitHub <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ user }) {
  return (
    <section className="bg-vermilion-500 border-y border-ink text-cream-50 relative overflow-hidden">
      <div className="absolute -right-24 -bottom-24 opacity-[0.16] text-ink" aria-hidden="true">
        <NestMark size={420} />
      </div>
      <div className="relative max-w-[1240px] mx-auto px-5 md:px-8 py-20 md:py-24">
        <h2 className="font-serif text-[48px] md:text-[84px] leading-[0.95] tracking-tight max-w-4xl text-balance">
          Your next bug report could come <span className="italic">with</span> a stack trace.
        </h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to={user ? '/overview' : '/register'}
            className="inline-flex items-center gap-2 rounded-lg border border-ink bg-cream-50 text-ink px-5 py-3 font-semibold shadow-hard transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {user ? 'Open your dashboard' : 'Get your API key'} <ArrowRight size={16} />
          </Link>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-lg border border-cream-50/60 px-5 py-3 font-semibold hover:bg-cream-50/10 transition-colors">
            Read the setup guide
          </Link>
        </div>
      </div>
    </section>
  );
}

function Nav({ user }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-[background-color,border-color] duration-300 border-b ${scrolled ? 'bg-cream-200/90 backdrop-blur border-ink/20' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" aria-label="TraceNest home"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px] text-ink-700">
          <a href="#sdk" className="hover:text-ink transition-colors">SDK</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          <Link to="/docs" className="hover:text-ink transition-colors">Docs</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/overview" className="btn-primary">Dashboard <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="max-w-[1240px] mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between text-[13px] text-ink-600">
      <div className="flex items-center gap-4">
        <Logo size={24} />
        <span className="text-ink-400">Open-source request monitoring for Node.js.</span>
      </div>
      <nav className="flex gap-6">
        <Link to="/docs" className="hover:text-ink">Docs</Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
        <Link to="/login" className="hover:text-ink">Sign in</Link>
      </nav>
    </footer>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-cream-200 text-ink overflow-x-hidden">
      <Nav user={user} />
      <main>
        <Hero user={user} />
        <Ticker />
        <Stats />
        <TwoLines />
        <Pipeline />
        <Features />
        <Pricing user={user} />
        <FinalCta user={user} />
      </main>
      <Footer />
    </div>
  );
}
