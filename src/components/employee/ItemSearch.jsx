import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';
import SearchBar from '../common/SearchBar';
import EmptyState from '../common/EmptyState';
import {
  Package,
  AlertTriangle,
  MinusCircle,
  RefreshCw,
  SearchX,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function ItemSearch({ onSelect }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.ITEMS), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching inventory items:', err);
        setError('Failed to load inventory. Please check your connection.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [reloadToken]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadToken((prev) => prev + 1);
  };

  const counts = useMemo(() => {
    return {
      all: items.length,
      raw: items.filter((i) => i.type === ITEM_TYPES.RAW).length,
      finished: items.filter((i) => i.type === ITEM_TYPES.FINISHED).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name?.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.type === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, selectedCategory]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Search and Category Filter Toolbar */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-border/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search input takes full width on mobile/tablet, flexible on desktop */}
          <div className="w-full lg:max-w-md xl:max-w-lg">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search materials, finished goods, parts..."
            />
          </div>

          {/* Filter tabs and item counter */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start lg:justify-end gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-text-dim flex items-center gap-1.5 mr-1 hidden sm:inline-flex">
                <Layers size={13} />
                Filter:
              </span>
              {[
                { id: 'all', label: 'All Items', count: counts.all },
                { id: ITEM_TYPES.RAW, label: 'Raw Materials', count: counts.raw },
                { id: ITEM_TYPES.FINISHED, label: 'Finished Goods', count: counts.finished },
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent/20 text-accent-light border border-accent/40 shadow-sm shadow-accent/10'
                        : 'bg-primary/50 text-text-muted hover:text-text hover:bg-surface-light/50 border border-border/40'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive ? 'bg-accent/30 text-accent-light' : 'bg-surface-light text-text-dim'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Item count badge */}
            <div className="text-xs text-text-muted px-2.5 py-1.5 rounded-xl bg-primary/40 border border-border/40 shrink-0">
              <span>
                {loading ? 'Updating...' : `${filtered.length} of ${items.length} items`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-sm text-danger-light">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="glass rounded-2xl p-5 border border-border/40 space-y-4 animate-pulse flex flex-col justify-between h-[210px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-light/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-light/60 rounded-md w-3/4" />
                  <div className="h-3 bg-surface-light/40 rounded-md w-1/3" />
                </div>
                <div className="w-14 h-5 bg-surface-light/40 rounded-full shrink-0" />
              </div>
              <div className="pt-3 border-t border-border/20 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="h-3 bg-surface-light/30 rounded w-16" />
                  <div className="h-6 bg-surface-light/50 rounded w-24" />
                </div>
                <div className="h-5 bg-surface-light/40 rounded-full w-16" />
              </div>
              <div className="h-10 bg-surface-light/40 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State: Database has no items */}
      {!loading && !error && items.length === 0 && (
        <div className="glass rounded-2xl p-8 border border-border/50">
          <EmptyState
            title="No inventory items found"
            message="Your company inventory has no recorded stock yet. Ask an owner or manager to add items."
          />
        </div>
      )}

      {/* Empty State: Search or category filter yielded 0 items */}
      {!loading && !error && items.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 border border-border/50 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-light/50 flex items-center justify-center text-text-dim">
            <SearchX size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text">No matching items</h3>
            <p className="text-xs text-text-dim mt-1 max-w-sm">
              No inventory items match "{search}" in {selectedCategory === 'all' ? 'any category' : selectedCategory}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-secondary text-xs py-2 px-3.5 mt-2"
          >
            Reset search and filters
          </button>
        </div>
      )}

      {/* Inventory Item Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {filtered.map((item) => {
            const isOutOfStock = Number(item.quantity) <= 0;
            const isLowStock =
              !isOutOfStock &&
              item.threshold != null &&
              Number(item.quantity) <= Number(item.threshold);

            return (
              <div
                key={item.id}
                className={`glass rounded-2xl p-5 sm:p-6 border flex flex-col justify-between transition-all duration-200 group h-full ${
                  isOutOfStock
                    ? 'border-border/40 opacity-75'
                    : isLowStock
                    ? 'border-warning/30 hover:border-warning/60 hover:bg-card-hover'
                    : 'border-border/60 hover:border-accent/40 hover:bg-card-hover'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top: Icon + Name on Left, Category Badge on Right */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isOutOfStock
                            ? 'bg-surface-light text-text-dim'
                            : isLowStock
                            ? 'bg-warning/10 text-warning-light border border-warning/20'
                            : item.type === ITEM_TYPES.FINISHED
                            ? 'bg-success/10 text-success-light border border-success/20'
                            : 'bg-accent/10 text-accent-light border border-accent/20'
                        }`}
                      >
                        <Package size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-text leading-snug line-clamp-2" title={item.name}>
                          {item.name}
                        </h2>
                      </div>
                    </div>

                    <span
                      className={`badge shrink-0 text-[10px] font-semibold ${
                        item.type === ITEM_TYPES.RAW ? 'badge-raw' : 'badge-finished'
                      }`}
                    >
                      {item.type || 'Standard'}
                    </span>
                  </div>

                  {/* Stock Metrics */}
                  <div className="pt-3 border-t border-border/30 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                        Available Stock
                      </p>
                      <p
                        className={`text-2xl font-bold tracking-tight mt-0.5 ${
                          isOutOfStock
                            ? 'text-danger-light'
                            : isLowStock
                            ? 'text-warning-light'
                            : 'text-text'
                        }`}
                      >
                        {formatNumber(item.quantity)}{' '}
                        <span className="text-xs font-normal text-text-dim">
                          {item.unit || 'units'}
                        </span>
                      </p>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="text-right shrink-0">
                      {isOutOfStock ? (
                        <span className="badge badge-low text-[10px]">
                          Out of stock
                        </span>
                      ) : isLowStock ? (
                        <span className="badge badge-low text-[10px] flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Low ({formatNumber(item.threshold)} min)
                        </span>
                      ) : (
                        <span className="badge badge-finished text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 mt-3 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    disabled={isOutOfStock}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isOutOfStock
                        ? 'bg-surface-light/40 text-text-dim border border-border/40 cursor-not-allowed opacity-60'
                        : 'btn-primary'
                    }`}
                  >
                    <MinusCircle size={15} />
                    <span>{isOutOfStock ? 'No Stock to Pick' : 'Deduct Stock'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
