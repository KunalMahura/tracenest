/** TraceNest mark: a woven nest catching a single (vermilion) event. */
export function NestMark({ size = 28, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="12.2" r="3.6" fill="#e73213" />
      <g fill="none" strokeLinecap="round" strokeWidth="2.1">
        <path d="M4.5 14.5c1.8 9.6 21.2 9.6 23 0" stroke="currentColor" />
        <path d="M5.2 13.4C9.5 22.6 21 23.4 27 15.6" stroke="#78a39a" />
        <path d="M5 16.2c5.4 6.8 16.6 6.6 22.3-2.4" stroke="#57857c" />
      </g>
    </svg>
  );
}

export default function Logo({ className = '', size = 28, label = true }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <NestMark size={size} />
      {label && (
        <span className="font-serif text-[22px] leading-none tracking-tight">
          Trace<span className="italic">Nest</span>
        </span>
      )}
    </span>
  );
}
