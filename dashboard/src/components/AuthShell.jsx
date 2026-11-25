import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const NestScene = lazy(() => import('./NestScene'));

/** Split layout for sign-in / sign-up: form on paper, the nest on ink. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(420px,1fr)_1.1fr] bg-cream-200">
      <div className="flex flex-col px-6 sm:px-12 py-8">
        <Link to="/" className="w-fit" aria-label="TraceNest home"><Logo /></Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[380px] mx-auto py-12 animate-rise-in">
            <h1 className="font-serif text-[44px] leading-[1] tracking-tight">{title}</h1>
            {subtitle && <p className="text-ink-600 mt-3 text-[15px]">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 pt-6 border-t border-ink/15 text-[14px] text-ink-600">{footer}</div>}
          </div>
        </div>

        <p className="text-[12px] text-ink-400">© TraceNest · open source</p>
      </div>

      <div className="hidden lg:block relative m-3 rounded-[18px] border border-ink bg-ink overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15] dotgrid invert" aria-hidden="true" />
        <Suspense fallback={null}>
          <NestScene className="absolute inset-0" packets={22} />
        </Suspense>
        <div className="absolute left-8 right-8 bottom-8 flex items-end justify-between gap-6">
          <p className="font-serif text-[34px] leading-[1.05] text-cream-100 max-w-md">
            Two lines of code, and every request your app serves <span className="italic text-vermilion-400">lands here.</span>
          </p>
          <span className="font-mono text-[11px] text-cream-100/50 whitespace-nowrap">POST /api/ingest → 202</span>
        </div>
      </div>
    </div>
  );
}

export function Field({ id, label, icon: Icon, hint, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium text-ink-800 mb-1.5">
        {label}
        {hint && <span className="text-[11px] text-ink-400 font-normal">{hint}</span>}
      </label>
      <div className="relative">
        <input id={id} className={`input !py-2.5 ${Icon ? 'pl-9' : ''}`} {...props} />
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />}
      </div>
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="mb-5 px-3.5 py-2.5 rounded-lg border border-vermilion-500 bg-vermilion-50 text-vermilion-700 text-[13px]">
      {children}
    </div>
  );
}
