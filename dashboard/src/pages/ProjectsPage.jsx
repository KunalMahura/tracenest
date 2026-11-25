import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { FolderPlus, KeyRound, Trash2, RefreshCw, AlertTriangle, BookOpen, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { rememberApiKey, forgetApiKey } from '../lib/apiKeys';
import CopyButton from '../components/CopyButton';
import QuotaBar from '../components/QuotaBar';

function NewKeyBanner({ projectName, apiKey, onDismiss }) {
  return (
    <div className="card !border-ink bg-teal-50 shadow-hard">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink">API key for “{projectName}”</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Copy it now: it is stored hashed and <strong>cannot be shown again</strong>. Lost it? Regenerate a new one.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="px-3 py-2 rounded-lg bg-cream-50 border border-ink/20 text-xs font-mono text-ink break-all">
              {apiKey}
            </code>
            <CopyButton text={apiKey} label="Copy key" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link to="/docs" className="btn-primary text-xs inline-flex items-center gap-1.5">
              <BookOpen size={14} /> Open setup guide
            </Link>
            <button type="button" onClick={onDismiss} className="btn-ghost text-xs cursor-pointer">
              I&apos;ve saved it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ p, isSelected, onSelect, onRegenerate, onDelete }) {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api.projects.usage(p._id).then((d) => setUsage(d.usage)).catch(() => {});
  }, [p._id]);

  return (
    <div className={`card flex flex-col md:flex-row md:items-center gap-4 card-hover ${isSelected ? '!border-ink shadow-hard-sm' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-ink truncate">{p.name}</h3>
          {isSelected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-300/70 text-teal-700 font-bold uppercase">Active</span>
          )}
        </div>
        {p.description && <p className="text-xs text-ink-500 mt-0.5 truncate">{p.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <KeyRound size={12} /> <code className="font-mono">{p.apiKeyPrefix}…</code>
          </span>
          <span className="inline-flex items-center gap-1">
            Project ID <code className="font-mono">{p._id}</code> <CopyButton text={p._id} label="ID" className="!px-1.5 !py-0.5" />
          </span>
        </div>
        <div className="mt-3 max-w-md">
          <QuotaBar usage={usage} compact />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isSelected && (
          <button type="button" onClick={() => onSelect(p)} className="btn-ghost text-xs border border-ink/20 cursor-pointer">
            Select
          </button>
        )}
        <button
          type="button"
          onClick={() => onRegenerate(p)}
          className="btn-ghost text-xs border border-ink/20 inline-flex items-center gap-1.5 cursor-pointer"
          title="Generate a new API key (the old one stops working immediately)"
        >
          <RefreshCw size={13} /> New key
        </button>
        <button
          type="button"
          onClick={() => onDelete(p)}
          className="p-2 rounded-lg text-ink-500 hover:text-vermilion-700 hover:bg-vermilion-50 transition-colors cursor-pointer"
          title="Delete project"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { project, projects, selectProject, reloadProjects } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [name, setName]   = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState(null); // { projectName, apiKey }
  const isOnboarding = searchParams.get('new') === '1' && projects.length === 0;

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.projects.create({ name, description });
      rememberApiKey(data.project._id, data.apiKey);
      setNewKey({ projectName: data.project.name, apiKey: data.apiKey });
      setName('');
      setDescription('');
      await reloadProjects();
      selectProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (p) => {
    if (!window.confirm(`Generate a new API key for "${p.name}"?\n\nThe current key stops working immediately. Any app using it will stop sending logs until you update it.`)) return;
    try {
      const data = await api.projects.regenerateKey(p._id);
      rememberApiKey(p._id, data.apiKey);
      setNewKey({ projectName: p.name, apiKey: data.apiKey });
      await reloadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete project "${p.name}"?\n\nIts API key stops working immediately. This cannot be undone.`)) return;
    try {
      await api.projects.del(p._id);
      forgetApiKey(p._id);
      await reloadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-serif text-[44px] leading-none tracking-tight text-ink">Projects</h1>
        <p className="text-xs text-ink-500 mt-1 font-medium">
          Each project has its own API key, daily log quota and dashboards.
        </p>
      </div>

      {isOnboarding && !newKey && (
        <div className="card bg-cream-50 border-teal-500/30 text-xs text-ink-600">
          <strong className="text-ink">Welcome to TraceNest!</strong> Create your first project to get an API key.
          Then follow the <Link to="/docs" className="font-semibold underline decoration-vermilion-500 decoration-2 underline-offset-4">setup guide</Link> to send your first logs.
        </div>
      )}

      {newKey && <NewKeyBanner {...newKey} onDismiss={() => setNewKey(null)} />}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-vermilion-50 border border-vermilion-200 text-vermilion-700 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Create */}
      <form onSubmit={create} className="card space-y-3">
        <div className="flex items-center gap-2">
          <FolderPlus size={16} className="text-ink" />
          <h2 className="text-sm font-bold text-ink">New project</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3">
          <input
            id="project-name"
            className="input"
            placeholder="Project name (e.g. checkout-api)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          <input
            className="input"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary text-xs disabled:opacity-60 cursor-pointer">
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-3">
        {projects.length === 0 && (
          <p className="text-xs text-ink-500 text-center py-8">No projects yet.</p>
        )}
        {projects.map((p) => (
          <ProjectRow
            key={`${p._id}:${p.apiKeyPrefix}`}
            p={p}
            isSelected={project?._id === p._id}
            onSelect={selectProject}
            onRegenerate={regenerate}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  );
}
