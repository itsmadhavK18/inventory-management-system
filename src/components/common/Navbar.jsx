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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate(userData?.role === 'owner' ? '/owner/dashboard' : '/employee')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-text hidden sm:block">FurnTrack</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent/15 text-accent-light'
                      : 'text-text-muted hover:text-text hover:bg-surface-light/50'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xs font-bold text-accent-light">
                  {userData?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <span className="text-xs text-text-muted">{userData?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-dim hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:bg-surface-light/50 transition-all cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
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
