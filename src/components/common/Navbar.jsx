import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  Hammer,
} from 'lucide-react';
import { useState } from 'react';

const ownerLinks = [
  { path: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/owner/inventory', label: 'Inventory', icon: Package },
  { path: '/owner/employees', label: 'Employees', icon: Users },
  { path: '/owner/quotations', label: 'Quotations', icon: FileText },
];

const employeeNavTabs = [
  { id: 'deduction', label: 'Material Deduction', anchor: '#deduction-console' },
  { id: 'inventory', label: 'Workshop Inventory', anchor: '#workshop-inventory' },
  { id: 'history', label: 'Deduction History', anchor: '#shift-ledger' },
  { id: 'shift', label: 'My Shift Logs', anchor: '#shift-ledger' },
];

export default function Navbar() {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeEmployeeTab, setActiveEmployeeTab] = useState('deduction');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isOwner = userData?.role === 'owner';
  const isEmployee = userData?.role === 'employee';

  const handleTabClick = (tab) => {
    setActiveEmployeeTab(tab.id);
    setMobileMenuOpen(false);
    if (tab.anchor) {
      const el = document.querySelector(tab.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <header className="sticky top-0 w-full z-50 bg-[#060e20]/95 backdrop-blur-xl border-b border-[#1e293b] shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
      <div className="h-16 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 lg:gap-6">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Logo / Atelier Identifier */}
          <button
            onClick={() => navigate(isOwner ? '/owner/dashboard' : '/employee')}
            className="flex items-center gap-3 cursor-pointer text-left focus:outline-none"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#222a3d] text-[#c3c0ff] border border-[#334155]/60 shadow-sm shrink-0">
              <Hammer size={18} className="text-[#818cf8]" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-base lg:text-lg font-bold tracking-tight text-[#f8fafc] leading-none">
                FurnTrack
              </span>
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mt-0.5">
                STUDIO &amp; ATELIER OS
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links for Owner */}
          {isOwner && (
            <nav className="hidden md:flex items-center gap-1.5 bg-[#0b111e]/80 p-1 rounded-xl border border-[#334155]/50">
              {ownerLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#4f46e5] text-white shadow-sm'
                        : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]'
                    }`}
                  >
                    <Icon size={14} />
                    {link.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Desktop Navigation Tabs for Employee Workspace */}
          {isEmployee && (
            <nav className="hidden xl:flex items-center gap-1">
              {employeeNavTabs.map((tab) => {
                const isActive = activeEmployeeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    className={`px-3.5 py-1.5 text-xs rounded-xl font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#4f46e5] text-white shadow-sm'
                        : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#222a3d]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Live Sync Badge + User Card + Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Live Sync Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#131b2e] border border-[#334155]/60 px-3 py-1.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
            </span>
            <span className="text-[10px] text-[#10b981] tracking-wider uppercase font-bold">
              FIRESTORE CONNECTED • SYNCING LIVE
            </span>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
            <div className="w-8 h-8 rounded-full bg-[#4f46e5]/20 border border-[#4f46e5]/40 flex items-center justify-center font-bold text-xs text-[#c3c0ff] shrink-0">
              {userData?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs text-[#f8fafc] font-semibold leading-tight">
                {userData?.name || 'Craftsman'}
              </span>
              <span className="text-[11px] text-[#94a3b8] leading-tight">
                {isOwner ? 'Atelier Principal' : 'Senior Joinery Craftsman · Station 04'}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="text-[11px] font-semibold text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Mobile Menu Button */}
          {(isOwner || isEmployee) && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#1e293b] bg-[#060e20] px-4 py-3 space-y-1 shadow-2xl animate-fadeIn">
          {isOwner &&
            ownerLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4f46e5] text-white shadow-sm'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}

          {isEmployee &&
            employeeNavTabs.map((tab) => {
              const isActive = activeEmployeeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4f46e5] text-white shadow-sm'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && <span className="text-[10px] uppercase font-bold text-[#c3c0ff]">Active</span>}
                </button>
              );
            })}
        </div>
      )}
    </header>
  );
}

