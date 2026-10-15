import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title = 'No data', message = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-light/50 flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-dim" />
      </div>
      <h4 className="text-base font-semibold text-text-muted mb-1">{title}</h4>
      {message && <p className="text-sm text-text-dim max-w-xs">{message}</p>}
    </div>
  );
}
