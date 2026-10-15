import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, role }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  if (role && userData.role !== role) {
    const redirect = userData.role === 'owner' ? '/owner/dashboard' : '/employee';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
