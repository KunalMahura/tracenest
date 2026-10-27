import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Activity, LayoutDashboard, Search, Bell, LogOut, ChevronDown,
  Zap, Wifi, Globe,
} from 'lucide-react';

const NAV = [
  { to: '/overview',  icon: LayoutDashboard, label: 'Overview'     },
  { to: '/logs',      icon: Search,          label: 'Log Explorer' },
  { to: '/live',      icon: Wifi,            label: 'Live Feed'    },
  { to: '/alerts',    icon: Bell,            label: 'Alerts'       },
  { to: '/landing',   icon: Globe,           label: 'Landing Page' },
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
    <div className="flex h-screen overflow-hidden bg-[#F8F4EF] text-[#1D2621]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#F4EFEA] border-r border-[#E2DAD0] shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#E2DAD0]">
          <div className="flex items-center justify-center w-8 h-8 bg-[#508167]/15 rounded-lg border border-[#508167]/30 text-[#508167]">
            <Activity size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#1D2621] text-base tracking-tight font-display-hero">TraceNest</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#CADFD5]/70 text-[#2C493A]">
              APM
            </span>
          </div>
        </div>

        {/* Project selector */}
        <div className="px-3 py-3 border-b border-[#E2DAD0]" ref={dropRef}>
          <p className="text-[11px] text-[#67786E] mb-1.5 px-2 font-semibold uppercase tracking-wider">Project</p>
          <button
            id="project-selector"
            onClick={() => setProjOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#DDD5C7] hover:border-[#CADFD5] text-xs font-medium text-[#1D2621] shadow-xs transition-colors"
          >
            <span className="truncate">{project?.name || 'Select project'}</span>
            <ChevronDown size={14} className="text-[#67786E] shrink-0 ml-1" />
          </button>
          {projOpen && (
            <div className="mt-1 rounded-lg bg-white border border-[#DDD5C7] overflow-hidden shadow-lg z-20">
              {projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => selectProject(p)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    project?._id === p._id
                      ? 'bg-[#CADFD5]/40 text-[#508167] font-semibold'
                      : 'text-[#2E3A33] hover:bg-[#F4EFEA]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/overview'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#CADFD5]/60 text-[#1D2621] font-semibold border-l-4 border-[#508167] shadow-xs'
                    : 'text-[#53645A] hover:text-[#1D2621] hover:bg-[#EAE4DC]'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-[#E2DAD0] flex items-center gap-3 bg-[#EFE9E2]/60">
          <div className="w-8 h-8 rounded-full bg-[#508167] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#1D2621] font-semibold truncate">{user?.name}</p>
            <p className="text-[11px] text-[#67786E] truncate">{user?.email}</p>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="text-[#67786E] hover:text-red-700 transition-colors p-1"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-auto bg-[#F8F4EF]">
        <Outlet context={{ project }} />
      </main>
    </div>
  );
}
