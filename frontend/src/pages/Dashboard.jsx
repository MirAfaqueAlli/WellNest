import { useEffect, useState } from 'react';
import { Users, HeartPulse, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import api from '../api/axios';

function StatCard({ label, value, icon: Icon, bg, iconColor, loading }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : value}
        </div>
      </div>
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [statsRes, patientsRes] = await Promise.all([
        api.get('/patients/dashboard-stats'),
        api.get('/patients?limit=5&page=1'),
      ]);
      setStats({ ...statsRes.data, recentPatients: patientsRes.data.patients });
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{today}</div>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading} style={{ gap: '0.375rem' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--color-danger-bg)',
          border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem', color: 'var(--color-error)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="dashboard-stats-grid">
        <StatCard
          label="Active Patients"
          value={stats?.active ?? '—'}
          icon={Users}
          bg="var(--color-primary-bg)"
          iconColor="var(--color-primary)"
          loading={loading}
        />
        <StatCard
          label="Upcoming (7 days)"
          value={stats?.upcoming ?? '—'}
          icon={Calendar}
          bg="var(--color-info-bg)"
          iconColor="var(--color-info)"
          loading={loading}
        />
        <StatCard
          label="Missed Stages"
          value={stats?.missed ?? '—'}
          icon={AlertCircle}
          bg="var(--color-warning-bg)"
          iconColor="var(--color-warning)"
          loading={loading}
        />
      </div>

      {/* Bottom row */}
      <div className="dashboard-bottom-grid">
        {/* Due Today */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
              Due Today
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
              {stats?.dueToday?.length ?? 0} appointments
            </span>
          </div>
          <div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : stats?.dueToday?.length ? (
              stats.dueToday.map((s) => (
                <div key={s.id} style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
                      {s.Patient?.name || '—'}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
                      {s.template?.stage_name}
                    </div>
                  </div>
                  <span className="badge badge-pending">Today</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Calendar size={28} /></div>
                <div className="empty-state-text">No appointments today</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={14} style={{ color: 'var(--color-primary)' }} />
              Recent Patients
            </div>
          </div>
          <div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : stats?.recentPatients?.length ? (
              stats.recentPatients.map((p) => (
                <div key={p.id} style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'var(--color-primary-bg)', border: '1px solid #fecdd3',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)',
                      flexShrink: 0,
                    }}>
                      {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>{p.whatsapp_number}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${p.patient_type}`}>{p.patient_type}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Users size={28} /></div>
                <div className="empty-state-text">No patients registered yet</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
