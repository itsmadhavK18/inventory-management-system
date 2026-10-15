import { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS, ITEM_TYPES, UNITS } from '../../utils/constants';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ItemForm({ item, onClose }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: '',
    type: ITEM_TYPES.RAW,
    quantity: '',
    unit: UNITS[0],
    cost_per_unit: '',
    threshold: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        type: item.type || ITEM_TYPES.RAW,
        quantity: item.quantity?.toString() || '',
        unit: item.unit || UNITS[0],
        cost_per_unit: item.cost_per_unit?.toString() || '',
        threshold: item.threshold?.toString() || '',
      });
    }
  }, [item]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Item name is required';
    if (!form.quantity || Number(form.quantity) < 0) return 'Valid quantity is required';
    if (!form.cost_per_unit || Number(form.cost_per_unit) < 0) return 'Valid cost per unit is required';
    if (!form.threshold || Number(form.threshold) < 0) return 'Valid threshold is required';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        type: form.type,
        quantity: Number(form.quantity),
        unit: form.unit,
        cost_per_unit: Number(form.cost_per_unit),
        threshold: Number(form.threshold),
      };

      if (isEdit) {
        await updateDoc(doc(db, COLLECTIONS.ITEMS, item.id), data);
        toast.success('Item updated');
      } else {
        await addDoc(collection(db, COLLECTIONS.ITEMS), {
          ...data,
          created_at: serverTimestamp(),
        });
        toast.success('Item added');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="input-label">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="input-field"
          placeholder="e.g. Teak Wood"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Type</label>
          <select
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value={ITEM_TYPES.RAW}>Raw</option>
            <option value={ITEM_TYPES.FINISHED}>Finished</option>
          </select>
        </div>
        <div>
          <label className="input-label">Unit</label>
          <select
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="input-field"
            disabled={loading}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="input-label">Quantity</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            className="input-field"
            placeholder="0"
            min="0"
            step="any"
            disabled={loading}
          />
        </div>
        <div>
          <label className="input-label">Cost/Unit (₹)</label>
          <input
            type="number"
            value={form.cost_per_unit}
            onChange={(e) => handleChange('cost_per_unit', e.target.value)}
            className="input-field"
            placeholder="0"
            min="0"
            step="any"
            disabled={loading}
          />
        </div>
        <div>
          <label className="input-label">Threshold</label>
          <input
            type="number"
            value={form.threshold}
            onChange={(e) => handleChange('threshold', e.target.value)}
            className="input-field"
            placeholder="0"
            min="0"
            step="any"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Update' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}
