import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Home, Map, PlusCircle } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Tableau de bord', icon: Home },
    { to: '/carte', label: 'Carte', icon: Map },
    { to: '/nouveau', label: 'Nouvel audit', icon: PlusCircle },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-[#1c1c1e] flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">Valerie</span>
            <span className="text-[10px] font-medium text-primary-400 bg-primary-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Audit</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-2 mb-2">Navigation</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`
                flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${isActive(to)
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/70">Valerie Audit</p>
              <p className="text-[10px] text-white/30">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
