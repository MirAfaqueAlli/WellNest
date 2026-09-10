import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, X, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const LIMIT = 10;

const ROLE_BADGE = {
  superadmin:          { bg: 'var(--color-primary-bg)',       color: 'var(--color-primary)', label: 'Superadmin'            },
  admin:               { bg: 'var(--color-info-bg)',          color: 'var(--color-info)',    label: 'Admin'                 },
  staff:               { bg: 'var(--color-success-bg)',       color: 'var(--color-success)', label: 'Staff'                 },
  doctor_pregnancy:    { bg: 'rgba(236,72,153,0.1)',          color: '#db2777',              label: 'Doctor – Pregnancy'    },
  doctor_immunization: { bg: 'rgba(59,130,246,0.1)',          color: '#2563eb',              label: 'Doctor – Immunization' },
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
                  <option value="doctor_pregnancy">Doctor – Pregnancy</option>
                  <option value="doctor_immunization">Doctor – Immunization</option>
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
  const [staff,      setStaff]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role',   roleFilter);
      const res = await api.get(`/auth/staff?${params}`);
      const data = res.data;
      if (Array.isArray(data)) {
        setStaff(data);
        setTotal(data.length);
        setPages(1);
      } else {
        setStaff(data.staff || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e) { setSearch(e.target.value); setPage(1); }
  function handleRole(e)   { setRoleFilter(e.target.value); setPage(1); }

  const startRow = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endRow   = Math.min(page * LIMIT, total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">{total} members in your hospital</div>
        </div>
        {(user?.role === 'superadmin' || user?.role === 'admin') && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={13} /> Add Staff
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={13} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          <input
            placeholder="Search name or email..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <select className="input" style={{ width: 'auto' }} value={roleFilter} onChange={handleRole}>
          <option value="">All Roles</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="doctor_pregnancy">Doctor – Pregnancy</option>
          <option value="doctor_immunization">Doctor – Immunization</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : staff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={32} /></div>
            <div className="empty-state-text">No staff members found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                  const initials = s.name ? s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'ST';
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
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '0.75rem', color: 'var(--color-text-faint)',
          }}>
            <span>Showing {startRow}–{endRow} of {total} members</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                className="btn-ghost"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === '…' ? (
                    <span key={`e${i}`} style={{ padding: '0 0.25rem' }}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={n === page ? 'btn-primary' : 'btn-ghost'}
                      onClick={() => setPage(n)}
                      style={{ padding: '0.25rem 0.5rem', minWidth: 28, fontSize: '0.75rem' }}
                    >
                      {n}
                    </button>
                  )
                )
              }

              <button
                className="btn-ghost"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddStaffModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
