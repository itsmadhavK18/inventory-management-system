import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { User, Mail } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.USERS), where('role', '==', 'employee'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (employees.length === 0) {
    return <EmptyState title="No employees yet" message="Add staff members to allow them to update stock." />;
  }

  return (
    <div className="space-y-3">
      {employees.map((employee) => (
        <div key={employee.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center text-accent-light font-semibold text-base">
              {employee.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text truncate">{employee.name}</p>
              <p className="text-sm text-text-dim truncate">{employee.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-dim text-sm">
            <Mail size={16} />
            <span>{employee.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
