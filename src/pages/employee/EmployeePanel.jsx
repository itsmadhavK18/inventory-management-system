import { useState } from 'react';
import ItemSearch from '../../components/employee/ItemSearch';
import UpdateQuantity from '../../components/employee/UpdateQuantity';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeePanel() {
  const { userData } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen pb-safe pt-6 md:px-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Employee panel</p>
          <h1 className="text-3xl font-bold text-text">Welcome back, {userData?.name || 'team member'}</h1>
          <p className="text-sm text-text-muted max-w-2xl">
            Search available furniture items and update quantities when you pick stock for a job.
          </p>
        </header>

        <div className="glass rounded-3xl p-5">
          <ItemSearch
            onSelect={(item) => {
              setSelectedItem(item);
              setShowModal(true);
            }}
          />
        </div>
      </div>

      <UpdateQuantity
        item={selectedItem}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
