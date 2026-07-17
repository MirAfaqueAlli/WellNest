import { useAuthStore } from '../store/authStore';
import { Bell, Menu } from 'lucide-react';

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuthStore();

  return (
    <header className="topbar">
      {/* Hamburger — only visible on mobile via CSS */}
      <button className="hamburger-btn" onClick={onMenuClick} title="Menu" aria-label="Open menu">
        <Menu size={18} />
      </button>

      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
          {title}
        </span>
      </div>

      <button className="btn-ghost" title="Notifications">
        <Bell size={16} />
      </button>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--color-primary-bg)', border: '1px solid #fecdd3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)',
        flexShrink: 0,
      }}>
        {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'MT'}
      </div>
    </header>
  );
}
