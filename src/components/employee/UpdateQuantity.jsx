import { useState, useEffect } from 'react';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { COLLECTIONS } from '../../utils/constants';

export default function UpdateQuantity({ item, isOpen, onClose }) {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity('');
    }
  }, [item]);

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
      console.error(err);
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!item}
      onClose={onClose}
      title={item ? `Update ${item.name}` : 'Update quantity'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Available stock</label>
          <p className="text-lg font-semibold text-text">{item?.quantity ?? 0} {item?.unit}</p>
        </div>
        <div>
          <label className="input-label" htmlFor="quantity-used">Quantity used</label>
          <input
            id="quantity-used"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field"
            min="1"
            max={item?.quantity || 0}
            disabled={loading}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit update'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
