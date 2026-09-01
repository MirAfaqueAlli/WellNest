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

// ── Setup Guard ───────────────────────────────────────────────────────────────
function AppRouter() {
  const [setupRequired, setSetupRequired] = useState(null); // null = loading

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/setup/status`)
      .then(r => r.json())
      .then(d => setSetupRequired(d.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  // Loading screen while checking
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
      {/* First-run setup — only accessible if setup is required.
          onSetupComplete updates state so the rest of the app unlocks immediately. */}
      <Route
        path="/setup"
        element={
          setupRequired
            ? <Setup onSetupComplete={() => setSetupRequired(false)} />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Main app — redirect to /setup if not yet set up */}
      <Route
        path="/"
        element={setupRequired ? <Navigate to="/setup" replace /> : <AppLayout />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="patients"       element={<Patients />} />
        <Route path="patients/:id"   element={<PatientDetail />} />
        <Route path="notifications"  element={<Notifications />} />
        <Route path="hospitals"      element={<Hospital />} />
        <Route path="staff"          element={<Staff />} />
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
