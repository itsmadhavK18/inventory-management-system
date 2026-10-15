import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { AlertTriangle, Package } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function LowStockAlert() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // We'll fetch all items and filter client-side since Firestore
    // doesn't support field-to-field comparisons in queries
    const unsub = onSnapshot(collection(db, COLLECTIONS.ITEMS), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => item.quantity < item.threshold);
      setItems(data);
    });

    return () => unsub();
  }, []);

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          Low Stock
        </h3>
        {items.length > 0 && (
          <span className="badge badge-low">{items.length} items</span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="All stocked up" message="No items below threshold" />
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto stagger-children">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10 hover:border-danger/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                  <Package size={14} className="text-danger-light" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{item.name}</p>
                  <span className={`badge ${item.type === 'raw' ? 'badge-raw' : 'badge-finished'}`}>
                    {item.type}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-danger-light">
                  {item.quantity} <span className="text-text-dim font-normal text-xs">{item.unit}</span>
                </p>
                <p className="text-[10px] text-text-dim">Min: {item.threshold}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
