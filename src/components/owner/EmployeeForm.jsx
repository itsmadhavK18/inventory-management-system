import { useState } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getSecondaryAuth, db } from '../../firebase';
import { COLLECTIONS, ROLES } from '../../utils/constants';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeeForm({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password should be at least 6 characters');
      return;
    }

    setLoading(true);
    const secondaryAuth = getSecondaryAuth();

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), form.password);
      await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), {
        name: form.name.trim(),
        email: form.email.trim(),
        role: ROLES.EMPLOYEE,
        created_at: serverTimestamp(),
      });
      await signOut(secondaryAuth);
      toast.success('Employee account created');
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered');
      } else {
        toast.error(err.message || 'Failed to create employee');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="input-label" htmlFor="employee-name">Name</label>
        <input
          id="employee-name"
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="input-field"
          placeholder="Employee name"
          disabled={loading}
        />
      </div>
      <div>
        <label className="input-label" htmlFor="employee-email">Email</label>
        <input
          id="employee-email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className="input-field"
          placeholder="employee@example.com"
          disabled={loading}
        />
      </div>
      <div>
        <label className="input-label" htmlFor="employee-password">Password</label>
        <input
          id="employee-password"
          type="password"
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          className="input-field"
          placeholder="Minimum 6 characters"
          disabled={loading}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create employee'}
        </button>
      </div>
    </form>
  );
}
