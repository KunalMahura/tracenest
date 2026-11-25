import { useRef } from 'react';

/**
 * CSS-3D tilt: the child leans toward the pointer and catches a light sheen.
 * No WebGL — cheap enough to use on cards anywhere.
 */
export default function Tilt({ children, className = '', max = 7, style }) {
  const ref = useRef(null);
  const reduce = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e) => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--sy', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div style={{ perspective: '1100px', ...style }} className={className}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{ transform: 'rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))' }}
      >
        {children}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[12px] opacity-60 mix-blend-soft-light"
          style={{ background: 'radial-gradient(420px circle at var(--sx,50%) var(--sy,30%), rgba(255,255,255,.35), transparent 60%)' }}
        />
      </div>
    </div>
  );
}
