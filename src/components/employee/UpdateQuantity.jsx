import { useState, useEffect } from 'react';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/useAuth';
import { Loader2, Package, AlertCircle, ArrowDownCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';

export default function UpdateQuantity({ item, isOpen, onClose }) {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity('');
    }
  }, [item, isOpen]);

  const numQty = Number(quantity);
  const isValidNum = !isNaN(numQty) && numQty > 0;
  const exceedsStock = isValidNum && item ? numQty > item.quantity : false;
  const remainingStock = isValidNum && item ? item.quantity - numQty : null;

  const handlePreset = (amount) => {
    if (!item) return;
    const clamped = Math.min(amount, item.quantity);
    setQuantity(clamped.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;

    const useQty = Number(quantity);
    if (!useQty || useQty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (useQty > item.quantity) {
      toast.error('Quantity exceeds available stock');
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, COLLECTIONS.ITEMS, item.id);
        const snapshot = await transaction.get(itemRef);
        if (!snapshot.exists()) throw new Error('Item not found');
        const currentQuantity = snapshot.data().quantity || 0;
        if (useQty > currentQuantity) throw new Error('Insufficient stock available');

        transaction.update(itemRef, {
          quantity: currentQuantity - useQty,
        });

        const usageRef = doc(collection(db, COLLECTIONS.USAGE_LOGS));
        transaction.set(usageRef, {
          item_id: item.id,
          item_name: item.name,
          quantity_used: useQty,
          old_quantity: currentQuantity,
          new_quantity: currentQuantity - useQty,
          user_id: userData?.id || null,
          user_name: userData?.name || 'Employee',
          timestamp: serverTimestamp(),
        });
      });

      toast.success('Stock updated successfully');
      onClose();
    } catch (err) {
      console.error('Stock deduction transaction failed:', err);
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!item}
      onClose={onClose}
      title={item ? `Deduct ${item.name}` : 'Record Stock Usage'}
    >
      {item && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Context Card */}
          <div className="p-3.5 rounded-xl bg-primary/70 border border-border/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent-light flex-shrink-0">
                <Package size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`badge text-[9px] py-0 px-1.5 ${
                      item.type === ITEM_TYPES.RAW ? 'badge-raw' : 'badge-finished'
                    }`}
                  >
                    {item.type || 'Standard'}
                  </span>
                  {item.threshold != null && (
                    <span className="text-[10px] text-text-dim">
                      Min: {formatNumber(item.threshold)} {item.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] uppercase font-semibold text-text-dim block">
                Available
              </span>
              <span className="text-base font-bold text-accent-light">
                {formatNumber(item.quantity)}{' '}
                <span className="text-xs font-normal text-text-dim">{item.unit}</span>
              </span>
            </div>
          </div>

          {/* Quantity Input Field */}
          <div className="space-y-1.5">
            <label className="input-label" htmlFor="quantity-used">
              Quantity to Deduct ({item.unit})
            </label>
            <div className="relative">
              <input
                id="quantity-used"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`input-field pr-16 ${
                  exceedsStock
                    ? 'border-danger focus:border-danger focus:ring-danger/20'
                    : ''
                }`}
                placeholder="0"
                min="0.01"
                max={item.quantity}
                step="any"
                autoFocus
                disabled={loading}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-text-dim pointer-events-none">
                {item.unit}
              </span>
            </div>

            {/* Quick Fill Preset Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-text-dim uppercase font-semibold mr-1">
                Quick fill:
              </span>
              {[1, 5, 10]
                .filter((preset) => item.quantity >= preset)
                .map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    disabled={loading}
                    className="px-2 py-0.5 text-xs rounded-md bg-surface-light/60 hover:bg-surface-light border border-border/50 text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => handlePreset(item.quantity)}
                disabled={loading}
                className="px-2 py-0.5 text-xs rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent-light transition-colors cursor-pointer"
              >
                All ({formatNumber(item.quantity)})
              </button>
            </div>
          </div>

          {/* Dynamic Status / Calculation */}
          {isValidNum && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                exceedsStock
                  ? 'bg-danger/10 border-danger/20 text-danger-light'
                  : 'bg-primary/50 border-border/40 text-text-muted'
              }`}
            >
              {exceedsStock ? (
                <>
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>
                    Cannot deduct {numQty} {item.unit}. Only {formatNumber(item.quantity)} {item.unit} available.
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownCircle size={15} className="flex-shrink-0 text-accent-light" />
                  <span>
                    Remaining stock after deduction:{' '}
                    <strong className="text-text font-semibold">
                      {formatNumber(remainingStock)} {item.unit}
                    </strong>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !isValidNum || exceedsStock}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                'Confirm Usage'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

