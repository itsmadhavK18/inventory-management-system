import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import ItemList from '../../components/owner/ItemList';
import ItemForm from '../../components/owner/ItemForm';
import BulkUpload from '../../components/owner/BulkUpload';
import Modal from '../../components/common/Modal';

export default function Inventory() {
  const [activeItem, setActiveItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <div className="min-h-screen pb-safe pt-6 md:px-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Inventory management</p>
            <h1 className="text-3xl font-bold text-text">Manage your furniture stock</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setActiveItem(null); setShowItemModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add item
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload size={16} /> Bulk upload
            </button>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <ItemList onEdit={(item) => { setActiveItem(item); setShowItemModal(true); }} />
        </div>
      </div>

      <Modal
        title={activeItem ? 'Edit item' : 'Add new item'}
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
      >
        <ItemForm
          item={activeItem}
          onClose={() => setShowItemModal(false)}
        />
      </Modal>

      <Modal
        title="Upload inventory CSV"
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
      >
        <BulkUpload onClose={() => setShowBulkModal(false)} />
      </Modal>
    </div>
  );
}
