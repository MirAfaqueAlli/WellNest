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

export default function AppLayout() {
  const { token, refreshUser } = useAuthStore();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync fresh user data on every app load (fixes stale localStorage)
  useEffect(() => {
    refreshUser();
  }, []);

  // Close sidebar on route change (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!token) return <Navigate to="/login" replace />;

  const title = PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ||
    'WellNest';

  return (
    <div className="app-layout">
      {/* Mobile overlay — tap to close sidebar */}
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
