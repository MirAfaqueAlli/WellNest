import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/patients':      'Patients',
  '/notifications': 'Notifications',
  '/hospitals':     'Hospital Settings',
  '/staff':         'Staff Management',
};

// Routes only accessible to admin / superadmin
const ADMIN_ONLY_ROUTES = ['/hospitals', '/staff'];

export default function AppLayout() {
  const { token, user, refreshUser } = useAuthStore();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { refreshUser(); }, []);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!token) return <Navigate to="/login" replace />;

  // Block staff from accessing admin-only pages via direct URL
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminRoute && !isAdmin) return <Navigate to="/dashboard" replace />;

  const title = PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ||
    'WellNest';

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-area">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="page-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
