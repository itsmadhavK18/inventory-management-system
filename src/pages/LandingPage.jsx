import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Package } from 'lucide-react';
import { useEffect } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    if (currentUser && userData) {
      navigate(userData.role === 'owner' ? '/owner/dashboard' : '/employee', { replace: true });
    }
  }, [currentUser, userData, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Login icon top-right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => navigate('/login')}
          className="p-2.5 rounded-xl glass hover:bg-accent/15 transition-all group cursor-pointer"
          title="Login"
          id="landing-login-btn"
        >
          <User size={20} className="text-text-muted group-hover:text-accent-light transition-colors" />
        </button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
          <Package size={36} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-text mb-2 tracking-tight">FurnTrack</h1>
        <p className="text-text-muted text-sm text-center max-w-xs">
          Smart inventory management for your furniture business
        </p>

        {/* Subtle decorative elements */}
        <div className="mt-12 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-accent/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
          <div className="w-2 h-2 rounded-full bg-accent/80 animate-pulse-glow" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
          <div className="w-1 h-1 rounded-full bg-accent/40" />
        </div>
      </div>

      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
    </div>
  );
}
