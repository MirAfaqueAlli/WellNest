import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './index.css';
import AppLayout     from './components/AppLayout';
import Login         from './pages/Login';
import Setup         from './pages/Setup';
import Dashboard     from './pages/Dashboard';
import Patients      from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Notifications from './pages/Notifications';
import Hospital      from './pages/Hospital';
import Staff         from './pages/Staff';
import { useAuthStore } from './store/authStore';

// ── Admin-only route guard ────────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

// ── Setup Guard ───────────────────────────────────────────────────────────────
function AppRouter() {
  const [setupRequired, setSetupRequired] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/setup/status`)
      .then(r => r.json())
      .then(d => setSetupRequired(d.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
      }}>
        <span style={{ fontSize: 40 }}>🌿</span>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(16,185,129,0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          setupRequired
            ? <Setup onSetupComplete={() => setSetupRequired(false)} />
            : <Navigate to="/dashboard" replace />
        }
      />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={setupRequired ? <Navigate to="/setup" replace /> : <AppLayout />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="patients"       element={<Patients />} />
        <Route path="patients/:id"   element={<PatientDetail />} />
        <Route path="notifications"  element={<Notifications />} />
        <Route path="hospitals"      element={<AdminRoute><Hospital /></AdminRoute>} />
        <Route path="staff"          element={<AdminRoute><Staff /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={setupRequired ? '/setup' : '/dashboard'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
