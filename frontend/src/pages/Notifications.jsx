import { useEffect, useState, useCallback } from 'react';
import { Bell, RefreshCw, Send, CheckCircle, XCircle, Wifi, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const LIMIT = 10;

const STATUS_BADGE = {
  pending:   'badge-pending',
  sent:      'badge-visited',
  failed:    'badge-missed',
  delivered: 'badge-active',
  read:      'badge-completed',
};
const TYPE_LABEL = {
  reminder_7d:       '7-Day Reminder',
  reminder_1d:       '1-Day Reminder',
  reminder_today:    '📅 Today Reminder',
  missed:            'Missed Alert',
  manual:            'Manual',
  stage_complete:    'Stage Complete',
  edd_updated:       'EDD Updated',
  delivery_recorded: 'Delivery',
};

function fmt(d) {
  return d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

/* ─── WhatsApp Test Modal ───────────────────────────────────────── */
function TestModal({ onClose }) {
  const [number, setNumber]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  async function test() {
    if (!number) return;
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/notifications/test-whatsapp', { test_number: number });
      setResult({ success: true, message: res.data.message });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || err.response?.data?.error || 'Test failed' });
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">
            <Wifi size={14} style={{ color: 'var(--color-primary)' }} />
            Test WhatsApp Connection
          </h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Send a test message to verify the WhatsApp API integration is working correctly.
          </p>

          <div className="form-group">
            <label className="input-label">WhatsApp Number</label>
            <input
              className="input"
              placeholder="+919876543210"
              value={number}
              onChange={e => setNumber(e.target.value)}
            />
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
              Include country code (e.g. +91 for India)
            </span>
          </div>

          {result && (
            <div style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              background:   result.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border:       `1px solid ${result.success ? '#bbf7d0' : '#fecdd3'}`,
              fontSize:     '0.8125rem',
              color:        result.success ? 'var(--color-success)' : 'var(--color-error)',
              display:      'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {result.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {result.message}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={test} disabled={loading || !number}>
            {loading
              ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Sending...</>
              : <><Send size={13} /> Send Test</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function Notifications() {
  const [notifs,   setNotifs]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [showTest, setShowTest] = useState(false);
  const [cronMsg,  setCronMsg]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?page=${page}&limit=${LIMIT}`);
      setNotifs(res.data.notifications);
      setTotal(res.data.total);
      setPages(Math.ceil(res.data.total / LIMIT) || 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function triggerCron() {
    setCronMsg('Running...');
    try {
      const res = await api.post('/notifications/cron/trigger');
      setCronMsg(`✅ Done — Today: ${res.data.result.reminder_today || 0}, 1d: ${res.data.result.reminder_1d}, 7d: ${res.data.result.reminder_7d}, missed: ${res.data.result.missed}`);
      setPage(1);
      load();
    } catch {
      setCronMsg('❌ Cron failed');
    }
    setTimeout(() => setCronMsg(''), 6000);
  }

  const startRow = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endRow   = Math.min(page * LIMIT, total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">{total} total messages logged</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {cronMsg && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>{cronMsg}</span>
          )}
          <button className="btn-secondary" onClick={() => setShowTest(true)} style={{ gap: '0.375rem' }}>
            <Wifi size={13} /> Test WhatsApp
          </button>
          <button className="btn-secondary" onClick={triggerCron} style={{ gap: '0.375rem' }}>
            <Send size={13} /> Run Cron
          </button>
          <button className="btn-ghost" onClick={load} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={32} /></div>
            <div className="empty-state-text">No notifications sent yet</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', margin: '0.25rem 0 0' }}>
              Notifications appear here once patients are registered and cron runs
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>WhatsApp No.</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {notifs.map((n) => (
                  <tr key={n.id}>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
                      {n.Patient?.name || `#${n.patient_id}`}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {TYPE_LABEL[n.type] || n.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{n.whatsapp_number}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[n.status] || 'badge-pending'}`}>
                        {n.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{fmt(n.sent_at)}</td>
                  </tr>
                ))}
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
            <span>Showing {startRow}–{endRow} of {total} notifications</span>
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

      {showTest && <TestModal onClose={() => setShowTest(false)} />}
    </div>
  );
}
