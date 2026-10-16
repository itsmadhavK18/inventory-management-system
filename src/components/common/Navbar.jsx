import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { LayoutDashboard, Package, Users, FileText, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const ownerLinks = [
  { path: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/owner/inventory', label: 'Inventory', icon: Package },
  { path: '/owner/employees', label: 'Employees', icon: Users },
  { path: '/owner/quotations', label: 'Quotations', icon: FileText },
];

export default function Navbar() {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const links = userData?.role === 'owner' ? ownerLinks : [];

  return (
    <nav className="glass sticky top-0 z-40 border-b border-border/50">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate(userData?.role === 'owner' ? '/owner/dashboard' : '/employee')}
            className="flex items-center gap-2.5 cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-accent border border-accent-light/30 flex items-center justify-center shadow-sm">
              <Package size={17} className="text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-headline text-base font-bold text-text tracking-tight leading-none">FurnTrack</span>
              <span className="text-[9px] uppercase tracking-widest text-text-dim font-semibold mt-0.5">Studio & Atelier OS</span>
            </div>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1.5 bg-surface-dark/60 p-1 rounded-xl border border-border/40">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-surface-light/60'
                  }`}
                >
                  <Icon size={15} />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Live indicator on desktop */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-dark/80 border border-border/50 text-[11px] text-text-dim">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-medium text-emerald-400">Live Sync</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-xs font-bold text-accent-light">
                  {userData?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-text leading-tight">{userData?.name || 'User'}</span>
                <span className="text-[10px] text-text-dim font-medium">
                  {userData?.role === 'owner' ? 'Atelier Principal' : 'Craftsman'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-dim hover:text-danger hover:bg-danger/10 transition-all cursor-pointer text-xs font-medium"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Sign out</span>
            </button>

            {/* Mobile menu toggle only if there are navigation links */}
            {links.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-text-muted hover:bg-surface-light/50 transition-all cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 animate-slide-down">
          <div className="px-4 py-2 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent/15 text-accent-light'
                      : 'text-text-muted hover:text-text hover:bg-surface-light/50'
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
