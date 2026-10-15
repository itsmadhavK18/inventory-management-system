import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Edit3, Trash2, Package } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import SearchBar from '../common/SearchBar';
import toast from 'react-hot-toast';

export default function ItemList({ onEdit }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.ITEMS), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ITEMS, item.id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || item.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search items..."
      />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-primary rounded-lg p-0.5 w-fit">
        {['all', 'raw', 'finished'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer capitalize ${
              filter === f
                ? 'bg-accent/20 text-accent-light'
                : 'text-text-dim hover:text-text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <EmptyState title="No items found" message="Add items to get started" />
      ) : (
        <div className="space-y-2 stagger-children">
          {filtered.map((item) => {
            const isLow = item.quantity < item.threshold;
            return (
              <div
                key={item.id}
                className={`glass rounded-xl p-4 hover:bg-card-hover transition-all ${
                  isLow ? 'border-danger/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isLow ? 'bg-danger/10' : 'bg-accent/10'
                    }`}>
                      <Package size={18} className={isLow ? 'text-danger-light' : 'text-accent-light'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${item.type === 'raw' ? 'badge-raw' : 'badge-finished'}`}>
                          {item.type}
                        </span>
                        {isLow && <span className="badge badge-low">Low</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-lg text-text-dim hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/30">
                  <div>
                    <p className="text-[10px] text-text-dim uppercase">Stock</p>
                    <p className={`text-sm font-bold ${isLow ? 'text-danger-light' : 'text-text'}`}>
                      {formatNumber(item.quantity)} <span className="text-text-dim font-normal text-xs">{item.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-dim uppercase">Cost</p>
                    <p className="text-sm font-semibold text-text">{formatCurrency(item.cost_per_unit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-dim uppercase">Threshold</p>
                    <p className="text-sm font-semibold text-text-muted">{formatNumber(item.threshold)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
