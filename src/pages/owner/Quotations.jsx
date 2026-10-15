import { useState } from 'react';
import { Plus } from 'lucide-react';
import QuotationForm from '../../components/owner/QuotationForm';
import QuotationList from '../../components/owner/QuotationList';
import Modal from '../../components/common/Modal';

export default function Quotations() {
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  return (
    <div className="min-h-screen pb-safe pt-6 md:px-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Quotation management</p>
            <h1 className="text-3xl font-bold text-text">Prepare customer quotations</h1>
          </div>
          <button
            onClick={() => setShowQuotationModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> New quotation
          </button>
        </div>

        <div className="glass rounded-3xl p-5">
          <QuotationList />
        </div>
      </div>

      <Modal
        title="New quotation"
        isOpen={showQuotationModal}
        onClose={() => setShowQuotationModal(false)}
        maxWidth="max-w-3xl"
      >
        <QuotationForm onClose={() => setShowQuotationModal(false)} />
      </Modal>
    </div>
  );
}
