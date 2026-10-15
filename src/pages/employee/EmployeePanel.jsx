import { useState } from 'react';
import ItemSearch from '../../components/employee/ItemSearch';
import UpdateQuantity from '../../components/employee/UpdateQuantity';
import { useAuth } from '../../contexts/useAuth';
import { Wrench } from 'lucide-react';

export default function EmployeePanel() {
  const { userData } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen pb-safe pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <header className="glass rounded-2xl p-6 sm:p-7 border border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-accent/15 text-accent-light border border-accent/25">
                  <Wrench size={12} />
                  Staff Portal
                </span>
                <span className="text-xs text-text-dim">
                  Signed in as <strong className="text-text-muted font-medium">{userData?.name || 'Staff Member'}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
                Employee Workspace
              </h1>
              <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
                Find materials and record stock usage for your jobs. Select any available item to log deductions.
              </p>
            </div>
          </div>
        </header>

        {/* Main Search & Inventory Section */}
        <main>
          <ItemSearch onSelect={handleSelectItem} />
        </main>
      </div>

      {/* Stock Usage Modal */}
      <UpdateQuantity
        item={selectedItem}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}

