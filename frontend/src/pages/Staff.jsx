import { useEffect, useState } from 'react';
import { Users, Plus, X, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const ROLE_BADGE = {
  superadmin: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)', label: 'Superadmin' },
  admin:      { bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    label: 'Admin'      },
  staff:      { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'Staff'      },
};

function AddStaffModal({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ name: '', email: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    setLoading(true);
    try {
      await api.post('/auth/register-staff', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Add Staff Member</h3>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {error && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)', border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="input-label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Password *</label>
                <input className="input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="input-label">Role</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Staff() {
  const { user } = useAuthStore();
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/auth/staff');
      setStaff(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">{staff.length} members in your hospital</div>
        </div>
        {(user?.role === 'superadmin' || user?.role === 'admin') && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={13} /> Add Staff
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : staff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={32} /></div>
            <div className="empty-state-text">No staff members yet</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const role = ROLE_BADGE[s.role] || ROLE_BADGE.staff;
                const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: role.bg, border: `1px solid ${role.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', fontWeight: 700, color: role.color, flexShrink: 0,
                        }}>{initials}</div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{s.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '0.125rem 0.5rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 600,
                        background: role.bg, color: role.color, textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}>{role.label}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
                      {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddStaffModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
