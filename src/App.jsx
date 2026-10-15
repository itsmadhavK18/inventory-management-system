import { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/owner/Dashboard';
import Inventory from './pages/owner/Inventory';
import Employees from './pages/owner/Employees';
import Quotations from './pages/owner/Quotations';
import EmployeePanel from './pages/employee/EmployeePanel';
import Navbar from './components/common/Navbar';
import BottomNav from './components/common/BottomNav';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const location = useLocation();
  const showShell = useMemo(
    () => location.pathname.startsWith('/owner') || location.pathname.startsWith('/employee'),
    [location.pathname],
  );
  const showBottomNav = useMemo(() => location.pathname.startsWith('/owner'), [location.pathname]);

  return (
    <div className="min-h-screen bg-primary text-text">
      <Toaster position="top-right" />
      {showShell && <Navbar />}

      <main className="min-h-[calc(100vh-64px)]">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute role="owner">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/inventory"
            element={
              <ProtectedRoute role="owner">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/employees"
            element={
              <ProtectedRoute role="owner">
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/quotations"
            element={
              <ProtectedRoute role="owner">
                <Quotations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee"
            element={
              <ProtectedRoute role="employee">
                <EmployeePanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default App;
