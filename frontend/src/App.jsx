import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AppLayout     from './components/AppLayout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Patients      from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Notifications from './pages/Notifications';
import Hospital      from './pages/Hospital';
import Staff         from './pages/Staff';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<Dashboard />} />
          <Route path="patients"       element={<Patients />} />
          <Route path="patients/:id"   element={<PatientDetail />} />
          <Route path="notifications"  element={<Notifications />} />
          <Route path="hospitals"      element={<Hospital />} />
          <Route path="staff"          element={<Staff />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

