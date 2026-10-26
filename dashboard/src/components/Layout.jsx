import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Activity, LayoutDashboard, Search, Bell, LogOut, ChevronDown,
  Zap, Wifi,
} from 'lucide-react';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Overview'     },
  { to: '/logs',      icon: Search,          label: 'Log Explorer' },
  { to: '/live',      icon: Wifi,            label: 'Live Feed'    },
  { to: '/alerts',    icon: Bell,            label: 'Alerts'       },
];

export default function Layout() {
  const { user, logout }           = useAuth();
  const navigate                   = useNavigate();
  const [projects, setProjects]    = useState([]);
  const [project, setProject]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('tn_project')); } catch { return null; }
  });
  const [projOpen, setProjOpen]    = useState(false);
  const dropRef                    = useRef(null);

  useEffect(() => {
    api.projects.list().then((data) => {
      const list = data.projects || data;
      setProjects(list);
      if (!project && list.length > 0) {
        setProject(list[0]);
        localStorage.setItem('tn_project', JSON.stringify(list[0]));
      }
    }).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setProjOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectProject = (p) => {
    setProject(p);
    localStorage.setItem('tn_project', JSON.stringify(p));
    setProjOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 bg-brand-600/20 rounded-lg border border-brand-500/30">
            <Activity size={16} className="text-brand-400" />
          </div>
          <span className="font-bold text-white text-sm">TraceNest</span>
        </div>

        {/* Project selector */}
        <div className="px-3 py-3 border-b border-slate-800" ref={dropRef}>
          <p className="text-xs text-slate-500 mb-1.5 px-2 font-medium uppercase tracking-wider">Project</p>
          <button
            id="project-selector"
            onClick={() => setProjOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-sm text-slate-200 transition-colors"
          >
            <span className="truncate">{project?.name || 'Select project'}</span>
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
          </button>
          {projOpen && (
            <div className="mt-1 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shadow-xl">
              {projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => selectProject(p)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                    project?._id === p._id ? 'text-brand-400' : 'text-slate-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-200 font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ project }} />
      </main>
    </div>
  );
}
