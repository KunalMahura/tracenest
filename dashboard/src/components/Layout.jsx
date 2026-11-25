import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  LayoutDashboard, Search, Bell, LogOut, ChevronsUpDown, Check, Plus,
  Radio, FolderKanban, BookOpen, Menu, X,
} from 'lucide-react';
import Logo from './Logo';

const NAV = [
  { to: '/overview',  icon: LayoutDashboard, label: 'Overview'     },
  { to: '/logs',      icon: Search,          label: 'Log Explorer' },
  { to: '/live',      icon: Radio,           label: 'Live Feed', live: true },
  { to: '/alerts',    icon: Bell,            label: 'Alerts'       },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'     },
  { to: '/docs',      icon: BookOpen,        label: 'Setup Guide'  },
];

function ProjectSwitcher({ project, projects, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        id="project-selector"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left rounded-lg border border-ink bg-cream-50 px-3 py-2.5 shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard transition-[transform,box-shadow] cursor-pointer"
      >
        <span className="eyebrow !text-[10px] block">Project</span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className="truncate text-[14px] font-semibold text-ink">{project?.name || 'No project yet'}</span>
          <ChevronsUpDown size={14} className="text-ink-500 shrink-0" />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-2 z-30 rounded-lg border border-ink bg-cream-50 shadow-hard overflow-hidden animate-rise-in [animation-duration:.18s]">
          <ul className="max-h-64 overflow-auto py-1">
            {projects.map((p) => (
              <li key={p._id}>
                <button
                  type="button"
                  onClick={() => { onSelect(p); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left hover:bg-cream-200 cursor-pointer"
                >
                  <span className="truncate">{p.name}</span>
                  {project?._id === p._id && <Check size={14} className="text-vermilion-500 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/projects"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 border-t border-ink/15 text-[13px] font-medium text-ink hover:bg-teal-100"
          >
            <Plus size={14} /> {projects.length ? 'Manage projects' : 'Create your first project'}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * App shell. Used as a route layout (renders <Outlet>) or as a wrapper with
 * children (the /docs page when signed in).
 */
export default function Layout({ children }) {
  const { user, logout }        = useAuth();
  const navigate                = useNavigate();
  const location                = useLocation();
  const [projects, setProjects] = useState([]);
  const [project, setProject]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('tn_project')); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const reloadProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      const list = data.projects || data;
      setProjects(list);
      // Keep the selection valid (it may have been deleted or be from another account)
      setProject((current) => {
        const next = list.find((p) => p._id === current?._id) || list[0] || null;
        if (next) localStorage.setItem('tn_project', JSON.stringify(next));
        else localStorage.removeItem('tn_project');
        return next;
      });
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => { reloadProjects(); }, [reloadProjects]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const selectProject = useCallback((p) => {
    setProject(p);
    localStorage.setItem('tn_project', JSON.stringify(p));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-ink/15">
        <Link to="/overview" aria-label="Overview"><Logo size={26} /></Link>
        <button type="button" className="md:hidden p-1.5 rounded-md hover:bg-cream-200" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="px-4 pt-5 pb-4">
        <ProjectSwitcher project={project} projects={projects} onSelect={selectProject} />
      </div>

      <nav className="flex-1 px-3 space-y-0.5" aria-label="Main">
        {NAV.map(({ to, icon: Icon, label, live }, i) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/overview'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                isActive
                  ? 'bg-ink text-cream-100'
                  : 'text-ink-700 hover:bg-cream-200 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`font-mono text-[10px] w-4 ${isActive ? 'text-cream-100/50' : 'text-ink-400'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {live && <span className="w-1.5 h-1.5 rounded-full bg-vermilion-500 animate-blink" aria-hidden="true" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 p-3 rounded-lg border border-ink/15 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-teal-300 border border-ink text-ink grid place-items-center font-serif text-[18px] shrink-0">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate">{user?.name}</p>
          <p className="text-[11px] text-ink-500 truncate">{user?.email}</p>
        </div>
        <button
          id="logout-btn"
          type="button"
          onClick={handleLogout}
          className="p-1.5 rounded-md text-ink-500 hover:text-vermilion-600 hover:bg-vermilion-50 transition-colors cursor-pointer"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-cream-200 text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0 bg-cream-100 border-r border-ink">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-cream-100 border-r border-ink animate-rise-in [animation-duration:.2s]">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden h-14 px-4 flex items-center justify-between border-b border-ink bg-cream-100">
          <button type="button" onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md hover:bg-cream-200" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Logo size={24} />
          <span className="w-8" />
        </div>
        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="animate-rise-in [animation-duration:.35s]">
            {children || <Outlet context={{ project, projects, selectProject, reloadProjects }} />}
          </div>
        </main>
      </div>
    </div>
  );
}
