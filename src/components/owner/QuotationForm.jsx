import { useState } from 'react';
import { collection, addDoc, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { downloadQuotationPDF } from '../../utils/pdfGenerator';
import { Loader2, Plus, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/useAuth';

const emptyRow = { item_name: '', description: '', quantity: '', price: '' };

export default function QuotationForm({ onClose }) {
  const { userData } = useAuth();
  const [customerEmail, setCustomerEmail] = useState('');
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [loading, setLoading] = useState(false);

  const handleChange = (idx, field, value) => {
    setRows((prev) => prev.map((row, index) => (index === idx ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (idx) => setRows((prev) => prev.filter((_, index) => index !== idx));

  const calculateTotal = () => {
    return rows.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0;
      const price = Number(row.price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const validate = () => {
    if (!customerEmail.trim()) return 'Customer email is required';
    if (!rows.length) return 'Add at least one item';
    for (const [idx, row] of rows.entries()) {
      if (!row.item_name.trim()) return `Item name is required for row ${idx + 1}`;
      if (!row.quantity || Number(row.quantity) <= 0) return `Quantity is required for row ${idx + 1}`;
      if (!row.price || Number(row.price) < 0) return `Price is required for row ${idx + 1}`;
    }
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
      const totalAmount = calculateTotal();
      const itemDocs = rows.map((row) => ({
        item_name: row.item_name.trim(),
        description: row.description.trim(),
        quantity: Number(row.quantity),
        price: Number(row.price),
        line_total: Number(row.quantity) * Number(row.price),
      }));

      const quotationData = {
        customer_email: customerEmail.trim(),
        total_amount: totalAmount,
        created_at: serverTimestamp(),
        created_by: userData?.id || null,
        user_name: userData?.name || 'Owner',
        items: itemDocs,
      };

      const quotationRef = await addDoc(collection(db, COLLECTIONS.QUOTATIONS), quotationData);
      const batch = writeBatch(db);

      itemDocs.forEach((item) => {
        const itemRef = doc(collection(db, COLLECTIONS.QUOTATION_ITEMS));
        batch.set(itemRef, { ...item, quotation_id: quotationRef.id });
      });

      await batch.commit();
      const quotationForPdf = {
        ...quotationData,
        created_at: new Date(),
      };
      downloadQuotationPDF(quotationForPdf, itemDocs);
      toast.success('Quotation created');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="input-label">Customer email</label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          className="input-field"
          placeholder="client@example.com"
          disabled={loading}
        />
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={idx} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">Item {idx + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="flex items-center gap-2 text-danger hover:text-white"
                >
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="input-label">Name</label>
                <input
                  type="text"
                  value={row.item_name}
                  onChange={(e) => handleChange(idx, 'item_name', e.target.value)}
                  className="input-field"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="input-label">Qty</label>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => handleChange(idx, 'quantity', e.target.value)}
                  className="input-field"
                  disabled={loading}
                  min="0"
                />
              </div>
              <div>
                <label className="input-label">Price</label>
                <input
                  type="number"
                  value={row.price}
                  onChange={(e) => handleChange(idx, 'price', e.target.value)}
                  className="input-field"
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="input-label">Description</label>
              <textarea
                value={row.description}
                onChange={(e) => handleChange(idx, 'description', e.target.value)}
                className="input-field min-h-[84px]"
                disabled={loading}
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="btn-secondary flex items-center gap-2">
        <Plus size={16} /> Add another row
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 rounded-2xl bg-primary/50 border border-border/60">
        <div>
          <p className="text-sm text-text-muted">Grand total</p>
          <p className="text-2xl font-bold text-text">₹{calculateTotal().toFixed(2)}</p>
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Save & download PDF
        </button>
      </div>
    </form>
  );
}
