import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, size = 32 }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-primary/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={size} className="animate-spin text-accent" />
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={size} className="animate-spin text-accent" />
    </div>
  );
}
