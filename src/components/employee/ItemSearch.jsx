import { useState, useMemo } from 'react';
import { ITEM_TYPES } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';
import {
  Package,
  AlertTriangle,
  Barcode,
  Search,
  Keyboard,
  MapPin,
  CheckCircle2,
  PackageX,
  SlidersHorizontal,
  PlusCircle,
  Check,
  Layers,
} from 'lucide-react';

export default function ItemSearch({
  items = [],
  loading = false,
  error = null,
  selectedItem = null,
  onSelect,
  onRetry,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Category counts
  const counts = useMemo(() => {
    let raw = 0;
    let finished = 0;
    let hardware = 0;
    let fabric = 0;
    let finishes = 0;
    let lowOrOut = 0;

    items.forEach((item) => {
      const type = item.type;
      const name = (item.name || '').toLowerCase();
      const qty = Number(item.quantity) || 0;
      const threshold = Number(item.threshold) || 0;

      if (qty <= threshold) lowOrOut += 1;

      if (type === ITEM_TYPES.RAW) {
        raw += 1;
        if (name.includes('screw') || name.includes('hinge') || name.includes('handle') || name.includes('hardware') || name.includes('pull')) {
          hardware += 1;
        }
        if (name.includes('fabric') || name.includes('foam') || name.includes('bouclé') || name.includes('leather')) {
          fabric += 1;
        }
        if (name.includes('oil') || name.includes('finish') || name.includes('varnish') || name.includes('paint') || name.includes('lacquer')) {
          finishes += 1;
        }
      } else {
        finished += 1;
      }
    });

    return {
      all: items.length,
      raw,
      finished,
      hardware,
      fabric,
      finishes,
      lowOrOut,
    };
  }, [items]);

  // Filtered and Sorted Item List
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => {
        // 1. Text Search
        const matchesSearch =
          !query ||
          item.name?.toLowerCase().includes(query) ||
          item.unit?.toLowerCase().includes(query) ||
          item.type?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query);

        // 2. Category Filter
        let matchesCategory = true;
        const name = (item.name || '').toLowerCase();
        if (selectedCategory === 'raw') {
          matchesCategory = item.type === ITEM_TYPES.RAW;
        } else if (selectedCategory === 'finished') {
          matchesCategory = item.type === ITEM_TYPES.FINISHED;
        } else if (selectedCategory === 'hardware') {
          matchesCategory =
            name.includes('screw') ||
            name.includes('hinge') ||
            name.includes('handle') ||
            name.includes('hardware') ||
            name.includes('pull') ||
            name.includes('drawer');
        } else if (selectedCategory === 'fabrics') {
          matchesCategory =
            name.includes('fabric') ||
            name.includes('foam') ||
            name.includes('bouclé') ||
            name.includes('leather') ||
            name.includes('upholstery');
        } else if (selectedCategory === 'finishes') {
          matchesCategory =
            name.includes('oil') ||
            name.includes('finish') ||
            name.includes('varnish') ||
            name.includes('paint') ||
            name.includes('hardwax');
        }

        // 3. Low stock toggle
        const qty = Number(item.quantity) || 0;
        const threshold = Number(item.threshold) || 0;
        const matchesLowStock = !onlyLowStock || qty <= threshold;

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        // Critical stockouts and low stock items first for craftsman priority
        const aQty = Number(a.quantity) || 0;
        const bQty = Number(b.quantity) || 0;
        const aThresh = Number(a.threshold) || 1;
        const bThresh = Number(b.threshold) || 1;
        const aRatio = aQty / aThresh;
        const bRatio = bQty / bThresh;
        return aRatio - bRatio;
      });
  }, [items, search, selectedCategory, onlyLowStock]);

  const getTag = (item) => {
    const name = (item.name || '').toUpperCase();
    if (name.includes('TEAK')) return 'TEAK';
    if (name.includes('WALNUT')) return 'WALNUT';
    if (name.includes('OAK')) return 'OAK';
    if (name.includes('PULAK') || name.includes('PLY')) return 'PLY';
    if (name.includes('BLUM') || name.includes('HINGE') || name.includes('DRAWER')) return 'BLUM';
    if (name.includes('FABRIC') || name.includes('BOUCL')) return 'FAB';
    if (name.includes('FOAM')) return 'FOAM';
    if (name.includes('BRASS') || name.includes('STEEL')) return 'BRASS';
    return item.type === ITEM_TYPES.RAW ? 'RAW' : 'ITEM';
  };

  const getLocation = (index) => {
    const locations = [
      'Rack A-12 (Vault C)',
      'Bin H-04',
      'Roll Rack F-02',
      'Bay 03 Mezzanine',
      'Bin M-08',
      'Vault C (Bays 01-04)',
      'Station 04 Shelf B',
      'Aisle 2 - Bay 4',
    ];
    return locations[index % locations.length];
  };

  return (
    <div className="flex flex-col gap-5" id="workshop-inventory">
      {/* Search, Barcode Trigger & Category Filters */}
      <div className="bg-[#171f33] p-4 sm:p-5 rounded-xl shadow-md border border-[#334155] flex flex-col gap-4">
        {/* Search Bar + Barcode Scanner Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search material by SKU, name, or timber grain (e.g. Teak, Blum, Bouclé)..."
              className="w-full bg-[#060e20] text-[#f8fafc] placeholder:text-[#94a3b8] text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#334155] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] flex items-center gap-1">
              <Keyboard size={15} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Quick optical scan prompt simulation
              const term = prompt('Enter or scan barcode / SKU (e.g. SKU-WD-TEAK-084):');
              if (term) setSearch(term);
            }}
            className="px-4 py-2.5 bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#334155] transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Barcode size={17} className="text-[#818cf8]" />
            <span>Optical Scan</span>
          </button>
        </div>

        {/* Category Pills & Only Low Stock Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-[#334155]/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-[#222a3d] text-[#cbd5e1] hover:text-white hover:bg-[#2d3449] border border-[#334155]/50'
              }`}
            >
              All Materials ({counts.all})
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('raw')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'raw'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-[#222a3d] text-[#cbd5e1] hover:text-white hover:bg-[#2d3449] border border-[#334155]/50'
              }`}
            >
              Raw Timber (Lumber)
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('hardware')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'hardware'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-[#222a3d] text-[#cbd5e1] hover:text-white hover:bg-[#2d3449] border border-[#334155]/50'
              }`}
            >
              Hardware &amp; Mechanisms
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('fabrics')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'fabrics'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-[#222a3d] text-[#cbd5e1] hover:text-white hover:bg-[#2d3449] border border-[#334155]/50'
              }`}
            >
              Fabrics &amp; Foams
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('finishes')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'finishes'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-[#222a3d] text-[#cbd5e1] hover:text-white hover:bg-[#2d3449] border border-[#334155]/50'
              }`}
            >
              Finishes &amp; Oils
            </button>
          </div>

          {/* Only Low Stock Switch */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-[#060e20] px-3 py-1.5 rounded-full border border-[#334155]/60 shadow-inner">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center ${
                onlyLowStock ? 'bg-[#4f46e5]' : 'bg-[#2d3449]'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  onlyLowStock ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider">
              Only Low Stock (&lt; Threshold)
            </span>
          </label>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-[#171f33] border border-[#334155] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-6 rounded-xl bg-[#93000a]/20 border border-[#ef4444]/40 text-center space-y-3">
          <AlertTriangle className="text-[#ef4444] mx-auto" size={28} />
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold rounded-xl"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="py-12 text-center p-8 rounded-xl bg-[#131b2e] border border-[#334155]">
          <Package className="text-[#94a3b8] mx-auto mb-3 opacity-60" size={36} />
          <h3 className="text-base font-bold text-[#f8fafc]">No matching materials found</h3>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
            Try adjusting your search query, clear filters, or check the workshop inventory catalog.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setOnlyLowStock(false);
            }}
            className="mt-4 px-4 py-2 bg-[#222a3d] hover:bg-[#2d3449] text-xs font-semibold text-white rounded-xl border border-[#334155]"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Material Stock Listing (Horizontal Interactive Cards) */}
      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item, idx) => {
            const qty = Number(item.quantity) || 0;
            const threshold = Number(item.threshold) || 0;
            const isSelected = selectedItem?.id === item.id;
            const isDepleted = qty <= 0;
            const isLow = !isDepleted && qty <= threshold;
            const isBufferSafe = !isDepleted && !isLow && threshold > 0 && qty < threshold * 2;
            const isHealthy = !isDepleted && !isLow && !isBufferSafe;

            // Ratio calculation capped at 100%
            const maxRef = threshold > 0 ? Math.max(threshold * 1.5, qty) : Math.max(100, qty);
            const percentage = Math.min(100, Math.round((qty / maxRef) * 100));

            const sku = item.sku || `SKU-${item.type === ITEM_TYPES.RAW ? 'WD' : 'FN'}-${item.name?.slice(0, 4).toUpperCase()}-${idx + 101}`;
            const location = item.location || getLocation(idx);
            const tag = getTag(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-4 sm:p-5 rounded-xl border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group ${
                  isSelected
                    ? 'bg-[#1e293b] border-[#4f46e5] shadow-lg ring-1 ring-[#4f46e5]/50'
                    : 'bg-[#171f33] hover:bg-[#1e293b] border-[#334155] shadow-sm'
                }`}
              >
                {/* Selected left accent indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4f46e5]" />
                )}

                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4 min-w-0 flex-1 pl-1">
                  {/* Thumbnail / Tag box */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#060e20] border border-[#334155]/60 flex-shrink-0 relative shadow-sm flex items-center justify-center">
                    <Package size={24} className="text-[#818cf8]" />
                    <span className="absolute bottom-0 right-0 bg-[#060e20]/90 px-1 font-mono text-[9px] font-bold text-[#f8fafc] border-tl rounded-tl">
                      {tag}
                    </span>
                  </div>

                  {/* Material Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#f8fafc] truncate">
                        {item.name}
                      </h3>

                      {/* Status Badges */}
                      {isDepleted && (
                        <span className="px-2 py-0.5 rounded-md bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-ping" />
                          Critical Runout
                        </span>
                      )}
                      {isLow && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Low Stock ({percentage}%)
                        </span>
                      )}
                      {isBufferSafe && (
                        <span className="px-2 py-0.5 rounded-md bg-[#38bdf8]/15 text-[#7bd0ff] border border-[#38bdf8]/30 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                          Buffer Safe ({percentage}%)
                        </span>
                      )}
                      {isHealthy && (
                        <span className="px-2 py-0.5 rounded-md bg-[#10b981]/15 text-[#4edea3] border border-[#10b981]/30 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          Adequate / Healthy
                        </span>
                      )}

                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-md bg-[#4f46e5]/20 text-[#c3c0ff] border border-[#4f46e5]/40 text-[10px] font-bold uppercase tracking-wider">
                          SELECTED
                        </span>
                      )}
                    </div>

                    {/* Metadata Subtitle */}
                    <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-[#94a3b8] text-xs">
                      <span className="font-mono text-[#cbd5e1] font-semibold">{sku}</span>
                      <span>•</span>
                      <span>{item.type === ITEM_TYPES.RAW ? 'Raw Timber (Lumber)' : 'Finished Good'}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[#f8fafc]">
                        <MapPin size={13} className="text-[#818cf8]" />
                        {location}
                      </span>
                    </div>

                    {/* Stock Visual Threshold Meter */}
                    <div className="mt-2.5 flex items-center gap-3 max-w-md">
                      <div className="flex-1 bg-[#060e20] h-2 rounded-full overflow-hidden shadow-inner flex border border-[#1e293b]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDepleted
                              ? 'bg-[#ef4444]'
                              : isLow
                              ? 'bg-amber-400'
                              : isBufferSafe
                              ? 'bg-[#38bdf8]'
                              : 'bg-[#10b981]'
                          }`}
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#94a3b8] whitespace-nowrap">
                        <strong className="text-[#f8fafc] font-bold font-mono">
                          {formatNumber(qty)}
                        </strong>{' '}
                        / {threshold > 0 ? `${formatNumber(threshold)} ` : ''}{item.unit || 'units'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quantity Metrics & Action Button */}
                <div className="flex flex-col gap-2.5 w-full md:w-auto md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-[#334155]/50 shrink-0">
                  <div className="flex items-baseline justify-between md:justify-end gap-3 w-full">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-[#f8fafc] tabular-nums">
                      {formatNumber(qty)}{' '}
                      <span className="text-xs font-normal text-[#94a3b8]">
                        {item.unit || 'units'}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      {threshold > 0 ? `Min: ${formatNumber(threshold)} ${item.unit || 'units'}` : 'Buffer Monitored'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#4f46e5] text-white hover:brightness-110'
                        : 'bg-[#222a3d] hover:bg-[#4f46e5] hover:text-white text-[#cbd5e1] border border-[#334155]'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} />
                        <span>Active in Console</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>Select for Deduction</span>
                      </>
                    )}
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
