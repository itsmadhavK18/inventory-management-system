import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import SearchBar from '../common/SearchBar';
import EmptyState from '../common/EmptyState';
import { Package } from 'lucide-react';

export default function ItemSearch({ onSelect }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.ITEMS), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  if (filtered.length === 0) {
    return (
      <div className="space-y-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search inventory" />
        <EmptyState title="No matching items" message="Try another search term or ask an owner to add stock." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search inventory" />
      <div className="grid gap-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="glass rounded-3xl p-4 text-left hover:bg-card-hover transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">{item.name}</p>
                <p className="text-xs text-text-dim mt-1">{item.quantity} {item.unit} available</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent-light">
                <Package size={18} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
