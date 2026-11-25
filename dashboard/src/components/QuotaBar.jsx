/**
 * Daily log quota meter: "2,341 / 10,000 logs used today".
 * `usage` is the { limit, used, remaining, resetsAt } object from
 * GET /api/projects/:id/usage (null while loading).
 */
export default function QuotaBar({ usage, compact = false }) {
  if (!usage) {
    return <div className={`rounded-full bg-cream-300 ${compact ? 'h-1.5' : 'h-2'} animate-pulse`} />;
  }

  const pct = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 100;
  const tone =
    pct >= 100 ? { bar: 'bg-vermilion-500', text: 'text-vermilion-700' }
    : pct >= 80 ? { bar: 'bg-vermilion-300', text: 'text-vermilion-600' }
    : { bar: 'bg-teal-400', text: 'text-teal-700' };

  const resets = new Date(usage.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-ink`}>
          <span className={`font-mono ${tone.text}`}>{usage.used.toLocaleString()}</span>
          <span className="text-ink-500"> / {usage.limit.toLocaleString()} logs used today</span>
        </p>
        <p className="text-[10px] text-ink-500 font-medium whitespace-nowrap">
          {pct >= 100 ? 'Quota reached · ' : ''}resets {resets}
        </p>
      </div>
      <div
        className={`w-full rounded-full bg-cream-300 border border-ink/15 overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        aria-label="Daily log quota used"
      >
        <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
