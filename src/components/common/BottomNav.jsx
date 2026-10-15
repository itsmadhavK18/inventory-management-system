import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileText } from 'lucide-react';

const links = [
  { path: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/owner/inventory', label: 'Inventory', icon: Package },
  { path: '/owner/employees', label: 'Team', icon: Users },
  { path: '/owner/quotations', label: 'Quotes', icon: FileText },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
      <div className="flex items-center justify-around h-16 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[60px] ${
                isActive
                  ? 'text-accent-light'
                  : 'text-text-dim hover:text-text-muted'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-accent/15' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {link.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area spacer */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
