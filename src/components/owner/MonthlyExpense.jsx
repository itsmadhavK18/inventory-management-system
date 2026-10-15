import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { formatCurrency, getStartOfMonth } from '../../utils/formatters';
import { IndianRupee, TrendingUp } from 'lucide-react';

export default function MonthlyExpense() {
  const [totalExpense, setTotalExpense] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [items, setItems] = useState({});

  // Fetch items to get cost_per_unit
  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.ITEMS), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setItems(map);
    });
    return () => unsub();
  }, []);

  // Fetch monthly logs
  useEffect(() => {
    const startOfMonth = getStartOfMonth();
    const q = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItemCount(logs.length);

      // Calculate expense
      let total = 0;
      logs.forEach((log) => {
        const item = items[log.item_id];
        if (item?.cost_per_unit) {
          total += log.quantity_used * item.cost_per_unit;
        }
      });
      setTotalExpense(total);
    });

    return () => unsub();
  }, [items]);

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
        <IndianRupee size={16} className="text-accent-light" />
        Monthly Expense
      </h3>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-text tracking-tight">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-text-dim mt-1">
            {itemCount} usage entries this month
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp size={20} className="text-accent-light" />
        </div>
      </div>

      {/* Progress bar visual */}
      <div className="mt-4 h-1.5 bg-primary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-1000"
          style={{ width: totalExpense > 0 ? '100%' : '0%' }}
        />
      </div>
    </div>
  );
}
