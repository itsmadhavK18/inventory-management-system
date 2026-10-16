import { useState, useEffect } from 'react';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/useAuth';
import {
  Package,
  AlertTriangle,
  Minus,
  Plus,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Warehouse,
  Check,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';

const WORK_ORDERS = [
  { id: '#FF-882', label: '#FF-882 — Custom Teak Dining Table (6-Seater)', client: 'Vasant Vihar Villa Fitout • Due 24 Oct' },
  { id: '#FF-889', label: '#FF-889 — Vasant Vihar Master Headboard Joinery', client: 'Master Suite Joinery • Due 28 Oct' },
  { id: '#FF-879', label: '#FF-879 — Modular Oak & Cane Credenza (Bay 02)', client: 'Indiranagar Residence • Due 30 Oct' },
  { id: '#AT-991', label: '#AT-991 — Atelier Workshop Stock Replenishment', client: 'Floor Reserve Buffer • Internal' },
];

const REASONS = [
  'Standard Fabrication',
  'Grain Matching / Kerf',
  'Test Joinery / Sample',
  'Scrappage & Defects',
];

export default function UpdateQuantity({ item, onResetItem, onDeductSuccess }) {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [workOrder, setWorkOrder] = useState(WORK_ORDERS[0].label);
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [lastCommit, setLastCommit] = useState(null);

  // Sync default quantity when item changes
  useEffect(() => {
    if (item) {
      const avail = Number(item.quantity) || 0;
      setQuantity(avail > 0 ? (avail >= 1 ? '1' : avail.toString()) : '0');
    }
  }, [item]);

  const numQty = parseFloat(quantity);
  const isValidNum = !isNaN(numQty) && numQty > 0;
  const itemAvailable = Number(item?.quantity) || 0;
  const itemThreshold = Number(item?.threshold) || 0;
  const exceedsStock = isValidNum && numQty > itemAvailable;
  const remainingStock = isValidNum ? Math.max(0, itemAvailable - numQty) : itemAvailable;

  const handleStep = (delta) => {
    if (!item) return;
    const current = parseFloat(quantity) || 0;
    const next = Math.max(1, current + delta);
    const clamped = Math.min(next, itemAvailable);
    setQuantity(clamped.toString());
  };

  const handlePreset = (presetVal) => {
    if (!item) return;
    const clamped = Math.min(presetVal, itemAvailable);
    setQuantity(clamped.toString());
  };

  const handleReset = () => {
    setQuantity('1');
    setNotes('');
    setReason(REASONS[0]);
    if (onResetItem) onResetItem();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!item) {
      toast.error('Please select an item from the catalog first');
      return;
    }

    const useQty = parseFloat(quantity);

    if (isNaN(useQty) || useQty <= 0) {
      toast.error('Please specify a deduction quantity greater than zero');
      return;
    }

    if (useQty > itemAvailable) {
      toast.error(`Deduction cannot exceed available stock of ${formatNumber(itemAvailable)} ${item.unit || 'units'}`);
      return;
    }

    setLoading(true);

    try {
      // Atomic Firestore transaction ensuring zero overdrafts and exact ledger entry
      let generatedLogId = null;
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, COLLECTIONS.ITEMS, item.id);
        const snapshot = await transaction.get(itemRef);

        if (!snapshot.exists()) {
          throw new Error('Item not found in database or has been removed');
        }

        const freshQuantity = Number(snapshot.data().quantity) || 0;

        if (useQty > freshQuantity) {
          throw new Error(`Insufficient stock available. Current balance is ${freshQuantity} ${item.unit || 'units'}`);
        }

        const newStock = freshQuantity - useQty;

        // 1. Update item quantity atomically
        transaction.update(itemRef, {
          quantity: newStock,
          updated_at: serverTimestamp(),
        });

        // 2. Write structured usage audit log
        const usageRef = doc(collection(db, COLLECTIONS.USAGE_LOGS));
        generatedLogId = usageRef.id;
        transaction.set(usageRef, {
          item_id: item.id,
          item_name: item.name,
          quantity_used: useQty,
          old_quantity: freshQuantity,
          new_quantity: newStock,
          work_order: workOrder.split(' — ')[0],
          reason,
          notes: notes || null,
          user_id: userData?.id || null,
          user_name: userData?.name || 'Craftsman',
          unit: item.unit || 'units',
          timestamp: serverTimestamp(),
        });
      });

      const commitRecord = {
        id: (generatedLogId || 'LOG').slice(-6).toUpperCase(),
        qty: useQty,
        unit: item.unit || 'units',
        name: item.name,
        userName: userData?.name || 'Craftsman',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setLastCommit(commitRecord);

      toast.success(
        `Deduction committed: ${formatNumber(useQty)} ${item.unit || 'units'} of ${item.name}`,
        { duration: 4500 }
      );

      // Adjust input for next draft
      const newAvail = itemAvailable - useQty;
      setQuantity(newAvail > 0 ? '1' : '0');
      if (onDeductSuccess) onDeductSuccess();
    } catch (err) {
      console.error('Stock deduction transaction failed:', err);
      toast.error(err.message || 'Deduction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorkOrder = WORK_ORDERS.find((w) => w.label === workOrder) || WORK_ORDERS[0];

  return (
    <div className="flex flex-col gap-4 sticky top-20" id="deduction-console">
      {/* Main Terminal Card */}
      <div className="bg-[#131b2e] p-5 sm:p-6 rounded-xl shadow-lg border border-[#334155] flex flex-col gap-4 relative overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4f46e5] animate-pulse" />
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-bold text-[#f8fafc]">
              Record Material Deduction
            </h2>
          </div>
          <span className="text-[10px] text-[#10b981] uppercase tracking-wider bg-[#060e20] px-2.5 py-1 rounded-md border border-[#1e293b] font-bold shadow-inner">
            DEDUCTION DRAFT • READY
          </span>
        </div>

        {/* If no item selected */}
        {!item ? (
          <div className="py-8 text-center p-5 rounded-xl bg-[#060e20] border border-[#334155]/60 space-y-2">
            <Package className="text-[#94a3b8] mx-auto opacity-50" size={32} />
            <p className="text-sm font-semibold text-[#f8fafc]">No material selected</p>
            <p className="text-xs text-[#94a3b8]">
              Click &quot;Select for Deduction&quot; on any material from the catalog to load its balance here.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Active Material Focus Box */}
            <div className="bg-[#171f33] p-3.5 sm:p-4 rounded-xl shadow-sm border border-[#334155] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">
                  Target Material
                </span>
                <span className="px-2 py-0.5 rounded bg-[#222a3d] text-[#cbd5e1] font-mono text-[11px] font-semibold border border-[#334155]/60">
                  {item.sku || `SKU-WD-${item.name?.slice(0, 4).toUpperCase()}`}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <div className="w-10 h-10 rounded-lg bg-[#060e20] border border-[#334155] flex items-center justify-center shrink-0 text-[#818cf8]">
                  <Package size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-[#f8fafc] truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-[#94a3b8] flex items-center gap-1">
                    <Warehouse size={12} className="text-[#818cf8]" />
                    {item.location || 'Vault C • Rack A-12'}
                  </span>
                </div>
              </div>

              {/* Stock Availability & Safety Warning */}
              <div className="mt-1 pt-2 border-t border-[#334155]/50 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94a3b8]">Available Stock:</span>
                  <span className="font-mono font-bold text-[#f8fafc] text-sm tabular-nums">
                    {formatNumber(itemAvailable)} {item.unit || 'units'}
                  </span>
                </div>

                {itemAvailable <= itemThreshold && (
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span>
                      Threshold: {formatNumber(itemThreshold)} {item.unit} (At or below safety level)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Stack */}
            <div className="flex flex-col gap-4">
              {/* 1. Work Order Reference */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="workOrderSelect"
                  className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider"
                >
                  Work Order / Project Reference
                </label>
                <div className="relative">
                  <select
                    id="workOrderSelect"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                    className="w-full bg-[#060e20] text-[#f8fafc] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#334155] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] pr-9 cursor-pointer appearance-none shadow-inner"
                  >
                    {WORK_ORDERS.map((wo) => (
                      <option key={wo.id} value={wo.label} className="bg-[#131b2e] text-[#f8fafc]">
                        {wo.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
                  />
                </div>
                <span className="text-[10px] text-[#94a3b8] pl-1">
                  Client: {selectedWorkOrder.client}
                </span>
              </div>

              {/* 2. Quantity to Deduct with Stepper */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="deductInput"
                    className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider"
                  >
                    Quantity to Deduct
                  </label>
                  <span className="text-[10px] font-bold text-[#818cf8] uppercase tracking-wider">
                    {item.unit || 'Standard Units'}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-center bg-[#060e20] p-1.5 rounded-xl border border-[#334155] shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    disabled={loading || numQty <= 1}
                    className="col-span-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] disabled:opacity-40 disabled:cursor-not-allowed text-[#f8fafc] font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-[#334155]/60"
                  >
                    <Minus size={16} />
                  </button>

                  <div className="col-span-6 flex items-center justify-center gap-1.5">
                    <input
                      id="deductInput"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0.01"
                      max={itemAvailable}
                      step="any"
                      className="w-20 bg-transparent text-center text-xl font-bold font-mono text-[#f8fafc] focus:outline-none tabular-nums"
                    />
                    <span className="text-xs text-[#94a3b8] font-mono font-medium">
                      {item.unit || 'units'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    disabled={loading || numQty >= itemAvailable}
                    className="col-span-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] disabled:opacity-40 disabled:cursor-not-allowed text-[#f8fafc] font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-[#334155]/60"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-[#94a3b8] font-bold uppercase mr-1">Presets:</span>
                  {[1, 5, 10]
                    .filter((p) => p <= itemAvailable)
                    .map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePreset(p)}
                        className="px-2 py-0.5 rounded-md bg-[#222a3d] hover:bg-[#2d3449] text-[10px] font-mono text-[#cbd5e1] border border-[#334155]/60 cursor-pointer"
                      >
                        +{p}
                      </button>
                    ))}
                  {itemAvailable > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePreset(itemAvailable)}
                      className="px-2 py-0.5 rounded-md bg-[#222a3d] hover:bg-[#2d3449] text-[10px] font-mono text-[#cbd5e1] border border-[#334155]/60 cursor-pointer"
                    >
                      All ({itemAvailable})
                    </button>
                  )}
                </div>

                {/* Calculation & Safety Preview */}
                <div className="bg-[#171f33] p-2.5 rounded-lg border border-[#334155] flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-[#94a3b8]">Calculation Preview:</span>
                    <span
                      className={`font-mono font-bold ${
                        exceedsStock ? 'text-[#ef4444]' : 'text-[#10b981]'
                      }`}
                    >
                      {itemAvailable} − {isValidNum ? numQty : 0} = {formatNumber(remainingStock)}{' '}
                      {item.unit || 'units'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                    <ShieldCheck size={13} className="text-[#10b981] shrink-0" />
                    <span>
                      Max allowable: {formatNumber(itemAvailable)} {item.unit} (Prevents over-deduction)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Deduction Reason / Usage Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                  Deduction Reason / Usage Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map((r) => {
                    const isActive = reason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-[#4f46e5] text-white border-[#4f46e5] shadow-sm'
                            : 'bg-[#222a3d] hover:bg-[#2d3449] text-[#cbd5e1] hover:text-white border-[#334155]/60'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Craftsman Bench Notes */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="craftsmanNotes"
                  className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider"
                >
                  Craftsman Bench Notes (Station 04)
                </label>
                <textarea
                  id="craftsmanNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific grain matching notes or dimensioning adjustments..."
                  rows={2}
                  className="w-full bg-[#060e20] text-[#f8fafc] placeholder:text-[#94a3b8] text-xs p-3 rounded-xl border border-[#334155] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] shadow-inner resize-none"
                />
              </div>

              {/* 5. Submission Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !isValidNum || exceedsStock || itemAvailable <= 0}
                  className="w-full py-3 px-4 bg-[#4f46e5] hover:bg-[#6366f1] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#818cf8]/40"
                >
                  <CheckCircle2 size={17} />
                  <span>
                    {loading
                      ? 'Committing to Firestore...'
                      : `Confirm & Commit Deduction (${isValidNum ? numQty : 0} ${item.unit || 'units'})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-[#222a3d] hover:bg-[#2d3449] text-[#cbd5e1] hover:text-white text-xs font-semibold rounded-xl border border-[#334155] transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Clear Selection / Reset Form</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Live Confirmation / Toast Card below console */}
      {lastCommit && (
        <div className="bg-[#10b981]/15 border border-[#10b981]/30 p-4 rounded-xl shadow-md flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 size={20} className="text-[#10b981] shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-[#10b981] font-bold uppercase tracking-wider">
              Sync Confirmation #{lastCommit.id}
            </span>
            <p className="text-xs text-[#f8fafc] mt-0.5 leading-snug">
              Deduction committed to Firestore: <strong>{lastCommit.qty} {lastCommit.unit}</strong> of{' '}
              {lastCommit.name} logged by {lastCommit.userName} at {lastCommit.time}. Workshop stock synced.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
