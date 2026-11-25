import CopyButton from './CopyButton';

export default function CodeBlock({ code, title }) {
  return (
    <div className="rounded-xl overflow-hidden border border-ink-700 bg-ink shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-ink-700 bg-ink-800">
        <span className="text-[11px] font-mono text-teal-300">{title || ''}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] leading-relaxed font-mono text-cream-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
