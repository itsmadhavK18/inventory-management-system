import { useState } from 'react';
import { Plus } from 'lucide-react';
import EmployeeForm from '../../components/owner/EmployeeForm';
import EmployeeList from '../../components/owner/EmployeeList';
import Modal from '../../components/common/Modal';

export default function Employees() {
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  return (
    <div className="min-h-screen pb-safe pt-6 md:px-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Employee management</p>
            <h1 className="text-3xl font-bold text-text">Create and manage employee accounts</h1>
          </div>
          <button
            onClick={() => setShowEmployeeModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add employee
          </button>
        </div>

        <div className="glass rounded-3xl p-5">
          <EmployeeList />
        </div>
      </div>

      <Modal
        title="Create employee"
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        maxWidth="max-w-lg"
      >
        <EmployeeForm onClose={() => setShowEmployeeModal(false)} />
      </Modal>
    </div>
  );
}
