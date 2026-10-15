import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadQuotationPDF } from '../../utils/pdfGenerator';
import { FileText, Download } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function QuotationList() {
  const [quotations, setQuotations] = useState([]);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.QUOTATIONS), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setQuotations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (quotations.length === 0) {
    return <EmptyState title="No quotations yet" message="Create your first customer quotation." />;
  }

  return (
    <div className="space-y-4">
      {quotations.map((quote) => (
        <div key={quote.id} className="glass rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <FileText size={16} />
              <span>#{quote.id.slice(0, 6)}</span>
            </div>
            <p className="text-lg font-semibold text-text">{quote.customer_email}</p>
            <p className="text-sm text-text-dim">{formatDateTime(quote.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge badge-raw">₹{quote.total_amount?.toFixed(2)}</span>
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              onClick={() => downloadQuotationPDF(quote, quote.items || [])}
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
