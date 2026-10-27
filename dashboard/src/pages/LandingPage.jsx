import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CODE_SNIPPETS = {
  'Node.js': `import { initTraceNest } from '@tracenest/sdk';

// One-line auto-instrumentation for traces, logs & errors
const tracer = initTraceNest({
  apiKey: process.env.TRACENEST_KEY,
  serviceName: 'checkout-service',
  captureUnhandled: true,
  sampleRate: 1.0,
});`,
  'Go': `package main

import (
  "os"
  "github.com/tracenest/sdk-go"
)

func main() {
  // Auto-wraps net/http, gin, gorm, redis
  client := tracenest.Init(tracenest.Config{
    ApiKey:      os.Getenv("TRACENEST_KEY"),
    ServiceName: "checkout-service",
  })
  defer client.Flush()
}`,
  'Python': `import os
from tracenest import TraceNest

# Auto-instruments FastAPI, Django, Flask, SQLAlchemy
tn = TraceNest.init(
  api_key=os.environ.get("TRACENEST_KEY"),
  service_name="checkout-service",
  capture_exceptions=True,
)`,
  'Rust': `use tracenest::TraceNest;

#[tokio::main]
async fn main() {
  // Zero-overhead Tokio tracing layer
  let _guard = TraceNest::builder()
    .api_key(std::env::var("TRACENEST_KEY").unwrap())
    .service_name("checkout-service")
    .init();
}`
};

export default function LandingPage() {
  const { user } = useAuth();
  const [selectedLang, setSelectedLang] = useState('Node.js');
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Interactive toggle checkboxes in DX section
  const [autoHttp, setAutoHttp] = useState(true);
  const [sqlInspection, setSqlInspection] = useState(true);
  const [contextHeaders, setContextHeaders] = useState(true);

  const installCmd = 'curl -sSf https://tracenest.dev/install.sh | sh';

  const copyInstallCmd = () => {
    navigator.clipboard.writeText(installCmd);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[selectedLang]);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen selection:bg-secondary/20 selection:text-secondary">
      {/* HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40">
        <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold font-display-hero text-lg shadow-sm">
              TN
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
              TraceNest
            </span>
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase">
              v2.4
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-gutter-lg">
            <a href="#product" className="transition-colors text-primary font-bold">Product</a>
            <a href="#architecture" className="font-body-md text-on-surface-variant hover:text-on-surface transition-colors">Architecture</a>
            <a href="#sdk" className="font-body-md text-on-surface-variant hover:text-on-surface transition-colors">SDKs</a>
            <a href="#features" className="font-body-md text-on-surface-variant hover:text-on-surface transition-colors">Features</a>
            <a href="#deploy" className="font-body-md text-on-surface-variant hover:text-on-surface transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-space-md">
            {user ? (
              <Link
                to="/"
                className="inline-flex items-center justify-center h-8 px-space-md rounded-lg bg-primary text-on-primary font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container shadow-[0_1px_2px_rgba(15,23,42,0.3)] transition-all font-medium"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex font-body-md text-on-surface-variant hover:text-on-surface transition-colors px-space-sm py-space-xs font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center h-8 px-space-md rounded-lg bg-primary text-on-primary font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container shadow-[0_1px_2px_rgba(15,23,42,0.3)] transition-all font-medium"
                >
                  Deploy Now
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="w-full pt-16 bg-surface">
        <div className="flex flex-col w-full overflow-hidden">
          {/* AMBIENT TOP LIGHT GRADIENTS */}
          <div className="relative w-full">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[580px] pointer-events-none opacity-60">
              <div className="absolute top-12 left-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[100px] mix-blend-multiply" />
              <div className="absolute top-8 right-1/4 w-[420px] h-96 bg-tertiary-fixed-dim/25 rounded-full blur-[120px] mix-blend-multiply" />
              <div className="absolute top-28 left-1/3 w-80 h-80 bg-secondary-fixed/50 rounded-full blur-[90px] mix-blend-multiply" />
            </div>

            {/* HERO SECTION */}
            <section className="relative pt-12 md:pt-20 pb-16 px-margin max-w-7xl mx-auto flex flex-col items-center text-center" id="product">
              {/* Top Announcement Badge */}
              <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-lowest/90 shadow-sm backdrop-blur-md mb-space-lg group transition-all hover:shadow-md cursor-default border border-outline-variant/30">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <span className="font-label-caps text-label-caps text-on-surface font-semibold tracking-wide">
                  ✨ TraceNest 2.4 is live • Zero-overhead OpenTelemetry engine
                </span>
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>

              {/* Primary Headline */}
              <h1 className="font-display-hero text-display-hero md:text-[62px] md:leading-[66px] text-on-surface max-w-4xl tracking-tight text-balance mb-space-md font-bold">
                Observability without the overhead
              </h1>

              {/* Subtitle */}
              <p className="font-body-lg text-body-lg md:text-[18px] md:leading-[28px] text-on-surface-variant max-w-2xl text-balance mb-space-xl">
                Self-hosted logs, performance metrics, and instant error alerts in real time. Built for engineering teams who demand complete data sovereignty.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-space-sm sm:gap-space-md mb-space-md w-full justify-center">
                <Link
                  to={user ? "/" : "/login"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-3 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-medium shadow-[0_2px_8px_rgba(15,23,42,0.18)] hover:bg-primary-container hover:text-on-primary transition-all group"
                >
                  <span>{user ? "Open Dashboard" : "Start Free"}</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <a
                  href="#sdk"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-body-md font-medium shadow-sm hover:bg-surface-container-low transition-all border border-outline-variant/40"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">terminal</span>
                  <span>View Docs</span>
                </a>
              </div>

              {/* Trust Micro-Copy */}
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg flex items-center justify-center gap-space-xs">
                <span>No credit card required</span>
                <span className="text-outline-variant">•</span>
                <span>Deploy in 3 minutes</span>
                <span className="text-outline-variant">•</span>
                <span className="text-on-surface font-medium">100% Open source core</span>
              </p>

              {/* Quick Terminal Copy Bar */}
              <div className="inline-flex items-center gap-space-sm pl-space-md pr-space-xs py-1.5 rounded-xl bg-surface-container-lowest shadow-sm backdrop-blur-md max-w-md w-full sm:w-auto justify-between border border-outline-variant/30">
                <div className="flex items-center gap-space-xs text-on-surface-variant font-mono-code text-mono-code truncate">
                  <span className="text-secondary font-bold select-none">$</span>
                  <span className="truncate font-medium text-on-surface">{installCmd}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                  onClick={copyInstallCmd}
                  title="Copy to clipboard"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedInstall ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </section>

            {/* HERO VISUAL: LIVE OBSERVABILITY DASHBOARD MOCKUP */}
            <div className="relative max-w-6xl mx-auto px-margin pb-16" id="architecture">
              {/* Ambient Glow Behind Container */}
              <div className="absolute -inset-4 bg-gradient-to-r from-secondary-container/20 via-tertiary-fixed-dim/30 to-secondary-fixed/40 rounded-3xl blur-2xl -z-10 opacity-70" />

              {/* Main Shell Window Card */}
              <div className="w-full rounded-2xl bg-surface-container-lowest/95 shadow-[0_20px_50px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur-xl overflow-hidden flex flex-col border border-outline-variant/40">
                {/* Window Top Bar */}
                <div className="h-11 px-space-md bg-surface-container-low/80 flex items-center justify-between text-on-surface-variant border-b border-outline-variant/30">
                  <div className="flex items-center gap-space-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-error/70 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 font-mono-code text-[11px] text-on-surface-variant/80 pl-space-xs">
                      <span className="material-symbols-outlined text-[14px]">cloud</span>
                      <span>prod-eu-west-1</span>
                      <span>/</span>
                      <span>clusters</span>
                      <span>/</span>
                      <span className="text-on-surface font-medium">ingress-api-service</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    {/* Latency Pill */}
                    <div className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-md bg-surface-container font-mono-code text-[11px] text-on-surface">
                      <span className="material-symbols-outlined text-[13px] text-secondary">speed</span>
                      <span>14.2ms avg</span>
                    </div>
                    {/* Health Badge */}
                    <div className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-label-caps text-label-caps font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Healthy 99.99%</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content Grid */}
                <div className="p-space-md md:p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-md">
                  {/* LEFT / TOP TELEMETRY METRIC TILES (4 Cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-space-md">
                    {/* Ingestion Surge Sparkline Card */}
                    <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col justify-between border border-outline-variant/30">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">
                          Ingestion Rate
                        </span>
                        <span className="inline-flex items-center gap-1 font-label-caps text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                          <span className="material-symbols-outlined text-[12px]">trending_up</span> +14.2%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-space-xs mb-space-sm">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">4,582</span>
                        <span className="font-mono-code text-mono-code text-on-surface-variant">logs/sec</span>
                      </div>
                      {/* Sparkline SVG */}
                      <div className="w-full h-14 relative">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 48">
                          <defs>
                            <linearGradient id="streamGrad" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#508167" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#508167" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path d="M 0,38 Q 20,36 35,28 T 70,30 T 105,14 T 140,22 T 175,8 L 200,6 L 200,48 L 0,48 Z" fill="url(#streamGrad)" />
                          <path d="M 0,38 Q 20,36 35,28 T 70,30 T 105,14 T 140,22 T 175,8 L 200,6" fill="none" stroke="#508167" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>

                    {/* Host Load Stats (CPU & Memory) */}
                    <div className="grid grid-cols-2 gap-space-sm">
                      <div className="p-space-sm rounded-xl bg-surface-container-low/60 flex flex-col justify-between border border-outline-variant/30">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Cluster CPU</span>
                        <div className="flex items-baseline gap-1 my-1">
                          <span className="font-headline-md text-headline-md font-bold text-on-surface">18%</span>
                          <span className="font-mono-code text-[10px] text-on-surface-variant">8 Cores</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="w-[18%] h-full bg-secondary rounded-full" />
                        </div>
                      </div>
                      <div className="p-space-sm rounded-xl bg-surface-container-low/60 flex flex-col justify-between border border-outline-variant/30">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Heap Usage</span>
                        <div className="flex items-baseline gap-1 my-1">
                          <span className="font-headline-md text-headline-md font-bold text-on-surface">1.2<span className="font-body-sm font-normal text-on-surface-variant">/16GB</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="w-[15%] h-full bg-emerald-600 rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Instant Alert Card: Spikes Routed to Slack */}
                    <div className="p-space-md rounded-xl bg-amber-50/80 shadow-sm flex flex-col gap-space-xs border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-900 font-label-caps text-label-caps font-bold">
                          <span className="material-symbols-outlined text-[16px] text-amber-600">bolt</span>
                          <span>ACTIVE INTERCEPT</span>
                        </div>
                        <span className="font-mono-code text-[10px] text-amber-700">Just now</span>
                      </div>
                      <p className="font-body-md text-body-md font-semibold text-amber-950">
                        Spike in 504 Gateway Timeout intercepted
                      </p>
                      <div className="flex items-center justify-between pt-space-xs text-amber-800 font-body-sm text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">tag</span>
                          <span className="font-mono-code font-medium">#incidents-oncall</span>
                        </div>
                        <span className="bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-medium">Paged SRE team</span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT / MAIN: LIVE LOG STREAM TABLE (8 Cols) */}
                  <div className="lg:col-span-8 flex flex-col rounded-xl bg-surface-container-low/40 p-space-sm overflow-hidden border border-outline-variant/30">
                    {/* Search & Filters Tool Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-sm">
                      <div className="flex items-center gap-space-xs flex-1 min-w-[200px] bg-surface-container-lowest px-space-sm py-1.5 rounded-lg shadow-sm border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
                        <span className="font-mono-code text-[11px] text-on-surface-variant">search logs, spans, or traceId...</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 rounded bg-surface-container font-mono-code text-[11px] text-on-surface font-medium">status:error</span>
                        <span className="px-2 py-1 rounded bg-surface-container font-mono-code text-[11px] text-on-surface font-medium">env:prod</span>
                        <span className="px-2 py-1 rounded bg-surface-container font-mono-code text-[11px] text-on-surface font-medium">duration:&gt;200ms</span>
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-space-sm py-1.5 text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider">
                      <div className="col-span-2">Timestamp</div>
                      <div className="col-span-2">Level</div>
                      <div className="col-span-2">Service</div>
                      <div className="col-span-4">Message / Payload</div>
                      <div className="col-span-2 text-right">Trace ID</div>
                    </div>

                    {/* Table Rows (Log Stream) */}
                    <div className="flex flex-col gap-1 font-mono-code text-[11px]">
                      {/* Row 1: ERROR */}
                      <div className="grid grid-cols-12 gap-2 px-space-sm py-2 rounded-lg bg-surface-container-lowest shadow-sm items-center hover:bg-surface-container-high/40 transition-colors border border-outline-variant/20">
                        <span className="col-span-2 text-on-surface-variant text-[10px]">14:28:01.402</span>
                        <span className="col-span-2">
                          <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-semibold text-[10px]">ERROR</span>
                        </span>
                        <span className="col-span-2 text-on-surface font-medium truncate">auth-v2</span>
                        <span className="col-span-4 text-on-surface truncate">OAuth handshake timeout upstream: stripe.connect</span>
                        <span className="col-span-2 text-right text-secondary font-medium">tr-9a82f0</span>
                      </div>

                      {/* Row 2: WARN */}
                      <div className="grid grid-cols-12 gap-2 px-space-sm py-2 rounded-lg bg-surface-container-lowest/80 items-center hover:bg-surface-container-high/40 transition-colors border border-outline-variant/20">
                        <span className="col-span-2 text-on-surface-variant text-[10px]">14:28:01.389</span>
                        <span className="col-span-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[10px]">WARN</span>
                        </span>
                        <span className="col-span-2 text-on-surface font-medium truncate">payment-gw</span>
                        <span className="col-span-4 text-on-surface truncate">p99 latency threshold breached (342ms &gt; 250ms)</span>
                        <span className="col-span-2 text-right text-secondary font-medium">tr-4b711e</span>
                      </div>

                      {/* Row 3: INFO */}
                      <div className="grid grid-cols-12 gap-2 px-space-sm py-2 rounded-lg bg-surface-container-lowest/80 items-center hover:bg-surface-container-high/40 transition-colors border border-outline-variant/20">
                        <span className="col-span-2 text-on-surface-variant text-[10px]">14:28:01.214</span>
                        <span className="col-span-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold text-[10px]">INFO</span>
                        </span>
                        <span className="col-span-2 text-on-surface font-medium truncate">db-replica-03</span>
                        <span className="col-span-4 text-on-surface truncate">Vacuum analyzed completed for tenant_metadata</span>
                        <span className="col-span-2 text-right text-secondary font-medium">tr-11c90a</span>
                      </div>

                      {/* Row 4: DEBUG */}
                      <div className="grid grid-cols-12 gap-2 px-space-sm py-2 rounded-lg bg-surface-container-lowest/80 items-center hover:bg-surface-container-high/40 transition-colors border border-outline-variant/20">
                        <span className="col-span-2 text-on-surface-variant text-[10px]">14:28:00.992</span>
                        <span className="col-span-2">
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold text-[10px]">DEBUG</span>
                        </span>
                        <span className="col-span-2 text-on-surface font-medium truncate">ingress-api</span>
                        <span className="col-span-4 text-on-surface truncate">Baggage propagated: tenant_tier=enterprise</span>
                        <span className="col-span-2 text-right text-secondary font-medium">tr-88aa34</span>
                      </div>

                      {/* Row 5: INFO */}
                      <div className="grid grid-cols-12 gap-2 px-space-sm py-2 rounded-lg bg-surface-container-lowest/80 items-center hover:bg-surface-container-high/40 transition-colors border border-outline-variant/20">
                        <span className="col-span-2 text-on-surface-variant text-[10px]">14:28:00.812</span>
                        <span className="col-span-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold text-[10px]">INFO</span>
                        </span>
                        <span className="col-span-2 text-on-surface font-medium truncate">ingress-api</span>
                        <span className="col-span-4 text-on-surface truncate">HTTP 200 POST /v1/telemetry/spans (12ms)</span>
                        <span className="col-span-2 text-right text-secondary font-medium">tr-00fe91</span>
                      </div>
                    </div>

                    {/* Footer status ticker */}
                    <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-mono-code text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Streaming live socket via gRPC worker pool #04</span>
                      </span>
                      <span>Buffer: 42 KB / 2 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SOCIAL PROOF / TRUSTED BY LOGOS */}
          <section className="py-12 bg-surface-container-low/40 border-y border-outline-variant/30">
            <div className="max-w-7xl mx-auto px-margin flex flex-col items-center">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold mb-space-lg text-center">
                Trusted by telemetry and platform teams at scale
              </span>
              <div className="w-full flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all">
                <span className="font-headline-sm text-headline-sm font-bold tracking-tighter text-on-surface">▲ Vercel</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">⚡ Supabase</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">☁ Cloudflare</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">Linear</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">Retool</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">PlanetScale</span>
              </div>
            </div>
          </section>

          {/* THE 4 CORE FEATURES BENTO GRID */}
          <section className="py-24 px-margin max-w-7xl mx-auto w-full" id="features">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
              <div>
                <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider block mb-space-xs">Core Capabilities</span>
                <h2 className="font-headline-lg text-headline-lg md:text-[38px] md:leading-[44px] text-on-surface font-bold tracking-tight">
                  Engineered for speed, built for complete control
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                Eliminate vendor lock-in and multi-million dollar cloud monitoring bills with raw, native telemetry and high-throughput pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              {/* CARD 1: 4,500+ logs/sec ingestion */}
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all border border-outline-variant/30">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-space-md">
                    <span className="material-symbols-outlined text-[22px]">dataset</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                    4,500+ logs/sec ingestion
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                    High-throughput Redis &amp; BullMQ worker pipeline with zero dropped events and sub-millisecond memory footprint.
                  </p>
                </div>

                {/* Telemetry Throughput Meter Visual */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-space-sm border border-outline-variant/20">
                  <div className="flex items-center justify-between text-on-surface font-mono-code text-mono-code">
                    <span>Throughput Stress Test</span>
                    <span className="font-bold text-secondary">99.999% Delivered</span>
                  </div>
                  {/* Mini Bar Chart */}
                  <div className="flex items-end gap-1.5 h-16 pt-2">
                    <div className="flex-1 bg-secondary/30 rounded-t h-[40%]" />
                    <div className="flex-1 bg-secondary/40 rounded-t h-[65%]" />
                    <div className="flex-1 bg-secondary/60 rounded-t h-[50%]" />
                    <div className="flex-1 bg-secondary/50 rounded-t h-[75%]" />
                    <div className="flex-1 bg-secondary/70 rounded-t h-[90%]" />
                    <div className="flex-1 bg-secondary rounded-t h-[100%]" />
                    <div className="flex-1 bg-secondary/80 rounded-t h-[82%]" />
                    <div className="flex-1 bg-secondary/90 rounded-t h-[95%]" />
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-label-caps text-label-caps">
                    <span>0s Ramp</span>
                    <span>4.5k pkts/s Peak</span>
                    <span>18ms Ack</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: Zero-config SDKs */}
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all border border-outline-variant/30">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-space-md">
                    <span className="material-symbols-outlined text-[22px]">code_blocks</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                    Zero-config SDKs
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                    Drop a single line into Node, Go, Python, or Rust. Automatic context propagation and OpenTelemetry auto-instrumentation.
                  </p>
                </div>

                {/* Language Pill Switcher & Mini Code Card */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-space-sm font-mono-code border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 pb-1">
                    {['Node.js', 'Go', 'Python', 'Rust'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          selectedLang === lang
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm text-[12px] leading-relaxed border border-outline-variant/20">
                    <span className="text-secondary font-semibold">import</span> &#123; trace &#125; <span className="text-secondary font-semibold">from</span> <span className="text-emerald-700">&apos;@tracenest/sdk&apos;</span>;<br />
                    <span className="text-on-surface-variant">// auto-wraps express, fastify, pg, redis</span><br />
                    trace.attach(&#123; service: <span className="text-emerald-700">&apos;api&apos;</span> &#125;);
                  </div>
                </div>
              </div>

              {/* CARD 3: Automated alerts to Slack & PagerDuty */}
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all border border-outline-variant/30">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-space-md">
                    <span className="material-symbols-outlined text-[22px]">notifications_active</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                    Automated alerts to Slack &amp; PagerDuty
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                    Real-time alert engine evaluates error spikes, latency percentiles, and pages your team only when critical thresholds are breached.
                  </p>
                </div>

                {/* Slack Incident Rich Notification */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-space-xs border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-on-secondary font-bold text-[10px]">T</div>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface">TraceNest Bot</span>
                    <span className="font-label-caps text-[10px] text-on-surface-variant">APP 12:44 PM</span>
                  </div>
                  <div className="border-l-4 border-error pl-space-sm my-1 flex flex-col gap-1">
                    <span className="font-body-sm text-body-sm font-bold text-error">🔥 High Error Rate: 8.4% on /checkout/pay</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Deviated +3.4σ from standard 0.02% moving window.</span>
                  </div>
                  <div className="flex items-center gap-space-xs pt-1">
                    <Link to="/login" className="px-space-sm py-1 rounded bg-primary text-on-primary font-body-sm text-[11px] font-medium shadow-sm">
                      Resolve Incident
                    </Link>
                    <Link to="/login" className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-body-sm text-[11px] font-medium">
                      View Trace
                    </Link>
                  </div>
                </div>
              </div>

              {/* CARD 4: Self-hosted data privacy */}
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all border border-outline-variant/30">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-space-md">
                    <span className="material-symbols-outlined text-[22px]">shield</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                    Self-hosted data privacy
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                    Keep 100% of sensitive PII, audit trails, and customer data in your VPC. Fully compliant with HIPAA, GDPR, and SOC2.
                  </p>
                </div>

                {/* Compliance Badges and VPC Control Visual */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-space-sm border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-on-surface font-mono-code text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
                      <span>Encrypted at rest (AES-256)</span>
                    </div>
                    <span className="font-label-caps text-label-caps text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">VPC Isolated</span>
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs text-center">
                    <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm font-label-caps text-label-caps text-on-surface font-bold border border-outline-variant/20">SOC 2 Type II</div>
                    <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm font-label-caps text-label-caps text-on-surface font-bold border border-outline-variant/20">HIPAA Compliant</div>
                    <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm font-label-caps text-label-caps text-on-surface font-bold border border-outline-variant/20">GDPR Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SDK SNIPPET SECTION */}
          <section className="py-20 bg-surface-container-low/50 border-t border-outline-variant/30" id="sdk">
            <div className="max-w-6xl mx-auto px-margin">
              <div className="text-center max-w-2xl mx-auto mb-space-xl">
                <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider block mb-space-xs">Developer Experience</span>
                <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mb-space-xs">
                  Instrument your stack in under 60 seconds
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Plug in TraceNest with our lightweight zero-dependency SDKs.
                </p>
              </div>

              {/* Code Box Container */}
              <div className="rounded-2xl bg-surface-container-lowest shadow-[0_4px_24px_rgba(15,23,42,0.06)] overflow-hidden border border-outline-variant/30">
                {/* Header with Tabs */}
                <div className="h-12 bg-surface-container-low/70 px-space-md flex items-center justify-between border-b border-outline-variant/30">
                  <div className="flex items-center gap-space-xs">
                    {['Node.js', 'Go', 'Python', 'Rust'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        className={`px-space-md py-1.5 rounded-lg font-mono-code text-[12px] font-semibold transition-colors cursor-pointer ${
                          selectedLang === lang
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {lang === 'Node.js' ? 'index.ts' : lang === 'Go' ? 'server.go' : lang === 'Python' ? 'app.py' : 'main.rs'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-mono-code text-[11px] transition-colors cursor-pointer"
                    onClick={copySnippet}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedSnippet ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Syntax Highlighted Area */}
                <div className="p-space-lg md:p-space-xl overflow-x-auto bg-surface-container-lowest font-mono-code text-mono-code leading-relaxed text-on-surface">
                  <pre className="leading-6">
                    <code>{CODE_SNIPPETS[selectedLang]}</code>
                  </pre>
                </div>

                {/* Interactive Feature Checkboxes Strip */}
                <div className="p-space-md bg-surface-container-low/40 flex flex-wrap items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-surface border-t border-outline-variant/20">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoHttp}
                      onChange={(e) => setAutoHttp(e.target.checked)}
                      className="rounded text-primary accent-primary h-4 w-4"
                    />
                    <span className="font-medium">Automatic HTTP tracing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sqlInspection}
                      onChange={(e) => setSqlInspection(e.target.checked)}
                      className="rounded text-primary accent-primary h-4 w-4"
                    />
                    <span className="font-medium">SQL query inspection</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={contextHeaders}
                      onChange={(e) => setContextHeaders(e.target.checked)}
                      className="rounded text-primary accent-primary h-4 w-4"
                    />
                    <span className="font-medium">Distributed context headers</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* INTERACTIVE METRIC STATS BAR */}
          <section className="py-16 px-margin max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center border border-outline-variant/30">
                <span className="font-display-hero text-display-hero font-bold text-on-surface tracking-tight mb-space-xs">99.999%</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Delivery Guarantee</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Zero dropped logs even during unexpected upstream failovers.</p>
              </div>
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center border border-outline-variant/30">
                <span className="font-display-hero text-display-hero font-bold text-secondary tracking-tight mb-space-xs">0.4ms</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Added Latency</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Negligible overhead with non-blocking in-memory ring buffer.</p>
              </div>
              <div className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center border border-outline-variant/30">
                <span className="font-display-hero text-display-hero font-bold text-on-surface tracking-tight mb-space-xs">70%</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Cloud Bill Reduction</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Compared to commercial SaaS telemetry pricing like Datadog.</p>
              </div>
            </div>
          </section>

          {/* FINAL CALL TO ACTION BANNER */}
          <section className="py-20 px-margin max-w-6xl mx-auto w-full" id="deploy">
            <div className="relative rounded-3xl bg-surface-container-lowest shadow-[0_20px_60px_rgba(15,23,42,0.07)] p-space-xl md:p-16 overflow-hidden flex flex-col items-center text-center border border-outline-variant/30">
              {/* Ambient mesh under-glow */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-secondary/15 rounded-full blur-[90px] pointer-events-none" />
              <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider mb-space-xs">Instant Deployment</span>
              <h2 className="font-display-hero text-display-hero md:text-[44px] md:leading-[50px] font-bold text-on-surface tracking-tight mb-space-sm max-w-xl">
                Start monitoring in minutes
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-xl text-balance">
                Free forever for up to 500k logs/month. Self-host on your own infrastructure with a single Docker command.
              </p>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-space-sm justify-center w-full max-w-lg">
                <Link
                  to={user ? "/" : "/login"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-3.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-medium shadow-md hover:bg-primary-container transition-all"
                >
                  <span>{user ? "Open Dashboard" : "Start Free Now"}</span>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3.5 rounded-xl bg-surface-container text-on-surface font-body-md text-body-md font-medium hover:bg-surface-container-high transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>Live Sandbox</span>
                </Link>
                <a
                  href="https://github.com/KunalMahura/tracenest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3.5 rounded-xl bg-surface-container-lowest shadow-sm text-on-surface font-body-md text-body-md font-medium hover:bg-surface-container-low transition-all border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/40">
        <div className="max-w-7xl mx-auto px-margin py-space-xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-gutter-lg mb-space-xl">
            <div className="col-span-2 md:col-span-1 flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <div className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                  TN
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">TraceNest</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                High-cardinality telemetry and distributed tracing for cloud-native engineering teams.
              </p>
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-low border border-outline-variant/50 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <span className="font-label-caps text-label-caps text-on-surface">All systems operational</span>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Product</span>
              <a href="#product" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Distributed Tracing</a>
              <a href="#product" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Log Streaming</a>
              <a href="#features" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Metrics Engine</a>
              <a href="#sdk" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">OpenTelemetry SDK</a>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Resources</span>
              <a href="#sdk" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Documentation</a>
              <a href="#architecture" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Reference Architecture</a>
              <a href="#features" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Guides &amp; Tutorials</a>
              <span className="font-body-sm text-body-sm text-on-surface-variant">v2.4.0 Notes</span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Developers</span>
              <a href="#sdk" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">API Reference</a>
              <a href="#sdk" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">CLI Tooling</a>
              <a href="https://github.com/KunalMahura/tracenest" target="_blank" rel="noopener noreferrer" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">GitHub Repository</a>
              <Link to="/login" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Developer Portal</Link>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">Company</span>
              <a href="#product" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">About TraceNest</a>
              <a href="#features" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Changelog</a>
              <a href="#deploy" className="font-body-sm text-body-sm text-on-surface hover:text-secondary transition-colors">Self-Hosted Core</a>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Apache 2.0 License</span>
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <p className="font-body-sm text-body-sm text-on-surface-variant">© 2026 TraceNest. All rights reserved.</p>
            <div className="flex items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant">
              <span>Privacy First</span>
              <span>•</span>
              <span>100% Self-Hosted</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">System Status: Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
