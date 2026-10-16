import { useState, useMemo } from 'react';
import { timeAgo, formatTime, isToday } from '../../utils/formatters';
import {
  Download,
  Clock,
  CheckCheck,
  Package,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeeActivityFeed({
  logs = [],
  loading = false,
  currentUserId = null,
  onSelectMaterial,
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'

  // Filter logs by user
  const { myLogs, allLogs } = useMemo(() => {
    const my = logs.filter((l) => {
      if (!currentUserId) return true;
      return l.user_id === currentUserId;
    });
    return {
      myLogs: my,
      allLogs: logs,
    };
  }, [logs, currentUserId]);

  const displayedLogs = activeTab === 'my' ? myLogs : allLogs;

  const handleExport = () => {
    if (displayedLogs.length === 0) {
      toast.error('No logs available to export');
      return;
    }

    const headers = ['Timestamp', 'Material Item', 'Deducted Qty', 'Unit', 'Old Qty', 'New Qty', 'Work Order', 'Reason', 'Craftsman'];
    const rows = displayedLogs.map((l) => [
      l.timestamp?.toDate ? l.timestamp.toDate().toISOString() : new Date().toISOString(),
      `"${l.item_name || ''}"`,
      l.quantity_used || 0,
      l.unit || 'units',
      l.old_quantity ?? '',
      l.new_quantity ?? '',
      `"${l.work_order || '#FF-882'}"`,
      `"${l.reason || 'Standard Fabrication'}"`,
      `"${l.user_name || 'Craftsman'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FurnTrack_Shift_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Shift ledger exported successfully');
  };

  return (
    <section aria-label="Recent Shift Activity Logs" className="w-full flex flex-col gap-4" id="shift-ledger">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg sm:text-xl font-bold text-[#f8fafc]">
              My Recent Shift Activity Logs
            </h2>
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" title="Live Stream" />
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Real-time ledger of materials recorded and physical stocks deducted from Station 04
          </p>
        </div>

        {/* Tab switcher + Export button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center bg-[#060e20] p-1 rounded-xl border border-[#334155]/60">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#222a3d] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              All Workshop ({allLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              My Usage ({myLogs.length})
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] text-xs font-semibold flex items-center gap-1.5 border border-[#334155] transition-colors shadow-sm cursor-pointer"
          >
            <Download size={14} className="text-[#818cf8]" />
            <span>Export Shift Ledger</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Ledger Table */}
      <div className="w-full overflow-x-auto rounded-xl shadow-md bg-[#131b2e] border border-[#334155]">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-[#171f33] text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider h-10 border-b border-[#334155]/70">
              <th className="px-4 py-2 font-semibold">Time Recorded</th>
              <th className="px-4 py-2 font-semibold">Material Item</th>
              <th className="px-4 py-2 font-semibold">Deduction Qty</th>
              <th className="px-4 py-2 font-semibold">Stock Delta</th>
              <th className="px-4 py-2 font-semibold">Work Order</th>
              <th className="px-4 py-2 font-semibold">Usage Purpose</th>
              <th className="px-4 py-2 font-semibold text-right">Ledger Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#334155]/40 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#94a3b8]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-ping" />
                    <span>Streaming shift ledger from Cloud Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#94a3b8]">
                  <Clock size={28} className="mx-auto mb-2 opacity-50 text-[#94a3b8]" />
                  <p className="font-semibold text-sm text-[#f8fafc]">No shift deductions logged yet</p>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    Select an item in the catalog above to commit a stock deduction to Firestore.
                  </p>
                </td>
              </tr>
            ) : (
              displayedLogs.map((log) => {
                const itemName = log.item_name || 'Material Item';
                const qtyUsed = log.quantity_used != null ? log.quantity_used : '—';
                const unit = log.unit || 'units';
                const hasOld = log.old_quantity != null;
                const hasNew = log.new_quantity != null;
                const workOrderTag = log.work_order || '#FF-882';
                const purpose = log.reason || 'Standard Fabrication';
                const userName = log.user_name || 'Craftsman';
                const isCurrentUser = currentUserId && log.user_id === currentUserId;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[#1e293b]/60 transition-colors group"
                  >
                    {/* Time Recorded */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#cbd5e1] font-mono text-[11px]">
                      <span>{formatTime(log.timestamp)}</span>{' '}
                      <span className="text-[#94a3b8] text-[10px]">
                        {isToday(log.timestamp) ? '(Today)' : timeAgo(log.timestamp)}
                      </span>
                    </td>

                    {/* Material Item */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span
                            onClick={() => onSelectMaterial && onSelectMaterial(itemName)}
                            className="font-semibold text-[#f8fafc] hover:text-[#818cf8] transition-colors cursor-pointer truncate max-w-[200px]"
                            title={itemName}
                          >
                            {itemName}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-[#4f46e5]/20 text-[#c3c0ff] font-mono text-[9px] font-bold uppercase tracking-wider border border-[#4f46e5]/30">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#94a3b8] pl-4">by {userName}</span>
                      </div>
                    </td>

                    {/* Deduction Qty */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 font-bold font-mono text-xs">
                        −{qtyUsed} {unit}
                      </span>
                    </td>

                    {/* Stock Delta */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#94a3b8] font-mono text-xs">
                      {hasOld && hasNew ? (
                        <div className="flex items-center gap-1.5">
                          <span>{log.old_quantity}</span>
                          <ArrowRight size={11} className="text-[#94a3b8]" />
                          <span className="text-[#f8fafc] font-bold">{log.new_quantity} {unit}</span>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Work Order */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#222a3d] text-[#818cf8] border border-[#334155]/60 font-mono text-[11px] font-semibold">
                        {workOrderTag}
                      </span>
                    </td>

                    {/* Usage Purpose */}
                    <td className="px-4 py-3 text-[#cbd5e1] max-w-[180px] truncate" title={purpose}>
                      {purpose}
                    </td>

                    {/* Ledger Status */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[#10b981] text-[11px] font-bold uppercase tracking-wider">
                        <CheckCheck size={14} className="text-[#10b981]" />
                        <span>Committed • Synced</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
