import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, SkipForward, Calendar, RefreshCw,
  Edit2, X, Baby, FileText, Eye, AlertCircle,
} from 'lucide-react';
import api from '../api/axios';
import EditPatientModal from '../components/EditPatientModal';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  badge: 'badge-pending',  dot: '#d97706' },
  notified: { label: 'Notified', badge: 'badge-notified', dot: '#3b82f6' },
  visited:  { label: 'Visited',  badge: 'badge-visited',  dot: '#16a34a' },
  skipped:  { label: 'Skipped',  badge: 'badge-skipped',  dot: '#94a3b8' },
  missed:   { label: 'Missed',   badge: 'badge-missed',   dot: '#e11d48' },
};

function fmt(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/* ─── EDD Update Modal ──────────────────────────────── */
function EddModal({ patient, onClose, onSuccess }) {
  const [edd, setEdd]         = useState(patient.edd ? patient.edd.split('T')[0] : '');
  const [source, setSource]   = useState(patient.edd_source || 'direct_entry');
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.put(`/patients/${patient.id}/edd`, { edd, edd_source: source, reason });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Update EDD</h3>
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
              <label className="input-label">New EDD *</label>
              <input className="input" type="date" value={edd} onChange={e => setEdd(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="input-label">Source</label>
              <select className="input" value={source} onChange={e => setSource(e.target.value)}>
                <option value="ultrasound">Ultrasound</option>
                <option value="direct_entry">Direct Entry</option>
                <option value="lmp_calculated">LMP Calculated</option>
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Reason</label>
              <input className="input" placeholder="e.g. First trimester ultrasound" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Update EDD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delivery Modal ────────────────────────────────── */
function DeliveryModal({ patient, onClose, onSuccess }) {
  const [form, setForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_mode: 'vaginal',
    birth_weight:  '',
    apgar_1min:    '',
    apgar_5min:    '',
    child_name:    '',
    child_gender:  'female',
    notes:         '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    setLoading(true);
    try {
      const payload = { ...form, child_dob: form.delivery_date }; // DOB = delivery date
      if (payload.birth_weight) payload.birth_weight = parseFloat(payload.birth_weight);
      if (payload.apgar_1min)   payload.apgar_1min   = parseInt(payload.apgar_1min);
      if (payload.apgar_5min)   payload.apgar_5min   = parseInt(payload.apgar_5min);
      await api.post(`/patients/${patient.id}/delivery`, payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record delivery');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Record Delivery</h3>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {error && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)', border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Delivery Date *</label>
                <input className="input" type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="input-label">Delivery Mode</label>
                <select className="input" value={form.delivery_mode} onChange={e => set('delivery_mode', e.target.value)}>
                  <option value="vaginal">Normal Vaginal</option>
                  <option value="assisted">Assisted Vaginal</option>
                  <option value="c_section">Caesarean (C-Section)</option>
                </select>
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="input-label">Birth Weight (kg)</label>
                <input className="input" type="number" step="0.01" placeholder="3.20" value={form.birth_weight} onChange={e => set('birth_weight', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">APGAR @ 1 min</label>
                <input className="input" type="number" min={0} max={10} placeholder="8" value={form.apgar_1min} onChange={e => set('apgar_1min', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">APGAR @ 5 min</label>
                <input className="input" type="number" min={0} max={10} placeholder="9" value={form.apgar_5min} onChange={e => set('apgar_5min', e.target.value)} />
              </div>
            </div>

            <div className="divider" />
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Baby Info</div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Baby Name</label>
                <input className="input" placeholder="e.g. Arjun" value={form.child_name} onChange={e => set('child_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Gender</label>
                <select className="input" value={form.child_gender} onChange={e => set('child_gender', e.target.value)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <><Baby size={13} /> Record Delivery</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Complete Stage Modal ──────────────────────────── */
function CompleteStageModal({ stage, onClose, onSuccess }) {
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]         = useState('');
  const [nextNotes, setNextNotes] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.put(`/patients/${stage.patient_id}/stages/${stage.id}/visit`, {
        actual_visit_date: visitDate,
        notes,
        next_stage_notes: nextNotes,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete stage');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Complete Stage: {stage.template?.stage_name}</h3>
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
              <label className="input-label">Visit Date *</label>
              <input className="input" type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="input-label">Visit Notes (Optional)</label>
              <textarea className="input" rows={2} placeholder="Add clinical notes for this visit..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="input-label">Notes for Next Stage (Optional)</label>
              <textarea className="input" rows={2} placeholder="e.g. Schedule special scan, check blood pressure next time..." value={nextNotes} onChange={e => setNextNotes(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Complete Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Reschedule Stage Modal ────────────────────────── */
function RescheduleModal({ stage, onClose, onSuccess }) {
  const [newDate, setNewDate]   = useState(stage.scheduled_date ? stage.scheduled_date.split('T')[0] : '');
  const [reason, setReason]     = useState('');
  const [cascade, setCascade]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is mandatory for rescheduling.');
      return;
    }
    setLoading(true); setError('');
    try {
      await api.put(`/patients/${stage.patient_id}/stages/${stage.id}/date`, {
        new_date: newDate,
        override_reason: reason.trim(),
        cascade,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reschedule stage');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
            Reschedule Stage
          </h3>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {error && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)', border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {stage.template?.stage_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                Current date: {fmt(stage.scheduled_date)}
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">New Scheduled Date *</label>
              <input
                className="input"
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="input-label">Reason for Rescheduling * (Mandatory)</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. Patient traveling, requested later date, doctor unavailable..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-alt, rgba(255,255,255,0.04))',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
                <input
                  type="checkbox"
                  checked={cascade}
                  onChange={e => setCascade(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                />
                Reschedule subsequent stages accordingly
              </label>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginLeft: '1.5rem' }}>
                Automatically shifts all future visits in this stream by the same number of days.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !reason.trim() || !newDate}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Skip Stage Modal ──────────────────────────────── */
function SkipModal({ stage, onClose, onSuccess }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is mandatory for skipping a stage.');
      return;
    }
    setLoading(true); setError('');
    try {
      await api.put(`/patients/${stage.patient_id}/stages/${stage.id}/skip`, {
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to skip stage');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-error)' }}>
            <SkipForward size={15} />
            Skip Stage
          </h3>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-warning-bg)',
              border: '1px solid #fde68a',
              fontSize: '0.75rem',
              color: '#92400e',
            }}>
              ⚠️ Skipping this stage will cross it out in the patient record. A mandatory clinical or administrative reason is required.
            </div>

            {error && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)', border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {stage.template?.stage_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                Scheduled for: {fmt(stage.scheduled_date)}
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Reason for Skipping * (Mandatory)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Vaccine administered at external hospital, contraindicated, patient relocated..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              disabled={loading || !reason.trim()}
            >
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Skip Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Stage Details Popup Modal ─────────────────────── */
function StageDetailsModal({ stage, onClose, onOpenReschedule, onOpenSkip, onOpenVisit }) {
  if (!stage) return null;
  const cfg = STATUS_CONFIG[stage.status] || STATUS_CONFIG.pending;
  const isSkipped = stage.status === 'skipped';
  const isVisited = stage.status === 'visited';
  const isActionable = ['pending', 'notified'].includes(stage.status);

  // Parse template description for tests/tasks
  const descriptionLines = (stage.template?.description || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="modal-title" style={{
                textDecoration: isSkipped ? 'line-through' : 'none',
                opacity: isSkipped ? 0.7 : 1
              }}>
                {stage.template?.stage_name}
              </h3>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Code: {stage.template?.stage_code}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>{stage.template?.type}</span>
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Status & Schedule Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            background: 'var(--color-surface-alt, rgba(255,255,255,0.03))',
            padding: '0.75rem', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>Status</div>
              <div style={{ marginTop: '0.25rem' }}>
                <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>Scheduled Date</div>
              <div style={{
                fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.25rem',
                textDecoration: isSkipped ? 'line-through' : 'none'
              }}>
                {fmt(stage.scheduled_date)}
              </div>
            </div>
            {stage.actual_visit_date && (
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>Actual Visit Date</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                  {fmt(stage.actual_visit_date)}
                </div>
              </div>
            )}
            {stage.date_overridden && (
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>Schedule Note</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', marginTop: '0.25rem' }}>
                  📅 Date Rescheduled
                </div>
              </div>
            )}
          </div>

          {/* Rescheduled Info Callout */}
          {stage.date_overridden && stage.override_reason && (
            <div style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid #bfdbfe',
              fontSize: '0.75rem',
              color: 'var(--color-text)'
            }}>
              <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: '2px' }}>
                📅 Reschedule Reason:
              </div>
              {stage.override_reason}
            </div>
          )}

          {/* Skipped Info Callout */}
          {isSkipped && (
            <div style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid #fecdd3',
              fontSize: '0.75rem',
              color: 'var(--color-text)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '2px' }}>
                ⏭️ Medically Skipped Reason:
              </div>
              {stage.skip_reason || 'Staff Decision'}
            </div>
          )}

          {/* Visited Notes Callout */}
          {isVisited && stage.notes && (
            <div style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(22,163,74,0.08)',
              border: '1px solid #bbf7d0',
              fontSize: '0.75rem',
              color: 'var(--color-text)'
            }}>
              <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: '2px' }}>
                📝 Visit Clinical Notes:
              </div>
              {stage.notes}
            </div>
          )}

          {/* Clinical Protocol / Required Tests */}
          <div>
            <div style={{
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)',
              marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}>
              <FileText size={13} style={{ color: 'var(--color-primary)' }} />
              Required Tests & Checkup Checklist:
            </div>
            {descriptionLines.length > 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.375rem',
                padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-alt, rgba(255,255,255,0.02))',
                border: '1px solid var(--color-border)',
                fontSize: '0.75rem'
              }}>
                {descriptionLines.map((line, idx) => {
                  const isHeader = line.toUpperCase() === line && line.endsWith(':');
                  if (isHeader) {
                    return (
                      <div key={idx} style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: idx > 0 ? '0.375rem' : 0 }}>
                        {line}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                      <span style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}>•</span>
                      <span>{line.replace(/^[•\-*]\s*/, '')}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                No protocol guidelines provided for this stage.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {isActionable && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { onClose(); onOpenReschedule(stage); }}
                  style={{ gap: '0.375rem', fontSize: '0.75rem' }}
                >
                  <Calendar size={13} /> Reschedule
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { onClose(); onOpenSkip(stage); }}
                  style={{ gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-error)' }}
                >
                  <SkipForward size={13} /> Skip
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {isActionable && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => { onClose(); onOpenVisit(stage); }}
                style={{ gap: '0.375rem', fontSize: '0.75rem' }}
              >
                <CheckCircle size={13} />
                {stage.template?.stage_code === 'DELIVERY' ? 'Record Delivery' : 'Mark Visited'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────── */
export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient]     = useState(null);
  const [stages, setStages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [marking, setMarking]     = useState(null);
  const [showEdit, setShowEdit]   = useState(false);
  const [showEdd, setShowEdd]     = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [stageTab, setStageTab]   = useState('pregnancy'); // will be corrected after patient loads
  const [showCompleteStage, setShowCompleteStage] = useState(null);
  const [showReschedule,    setShowReschedule]    = useState(null);
  const [showSkip,          setShowSkip]          = useState(null);
  const [selectedStage,     setSelectedStage]     = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/stages`),
      ]);
      setPatient(pRes.data);
      setStages(sRes.data);
      // Set tab to match patient type
      setStageTab(pRes.data.patient_type === 'immunization' ? 'immunization' : 'pregnancy');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function markVisited(stageId) {
    setMarking(stageId);
    try {
      await api.put(`/patients/${id}/stages/${stageId}/visit`, {
        actual_visit_date: new Date().toISOString().split('T')[0],
      });
      await load();
    } catch { /* ignore */ }
    finally { setMarking(null); }
  }



  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );

  if (!patient) return (
    <div className="empty-state">
      <div className="empty-state-text">Patient not found</div>
      <Link to="/patients" className="btn-secondary">Back to Patients</Link>
    </div>
  );

  const isPregnant = patient.patient_type === 'pregnant';
  const visitedCount = stages.filter(s => s.status === 'visited').length;
  const totalCount   = stages.length;

  const activeStage = stages.find(s => ['pending', 'notified'].includes(s.status));
  const activeStageNotes = activeStage?.notes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/patients" className="btn-ghost"><ArrowLeft size={16} /></Link>
          <div>
            <div className="page-title">{patient.name}</div>
            <div className="page-subtitle">{patient.whatsapp_number}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowEdit(true)} style={{ gap: '0.375rem' }}>
            <Edit2 size={12} /> Edit Details
          </button>
          {isPregnant && patient.status !== 'completed' && (
            <>
              <button className="btn-secondary" onClick={() => setShowEdd(true)} style={{ gap: '0.375rem' }}>
                <Edit2 size={12} /> Update EDD
              </button>
              <button className="btn-primary" onClick={() => setShowDelivery(true)} style={{ gap: '0.375rem' }}>
                <Baby size={12} /> Record Delivery
              </button>
            </>
          )}
          <span className={`badge badge-${patient.status}`}>{patient.status}</span>
        </div>
      </div>

      {/* Info + Progress */}
      <div className="detail-info-grid">
        {/* Patient Info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Patient Info</div>
            <span className={`badge ${isPregnant ? 'badge-pregnant' : 'badge-immunization'}`}>
              {patient.patient_type}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              ['Age',         patient.age ? `${patient.age} yrs` : '—'],
              ['Address',     patient.address || '—'],
              isPregnant
                ? ['EDD',         fmt(patient.edd)]
                : ['Child DOB',   fmt(patient.child_dob)],
              isPregnant
                ? ['LMP Date',    fmt(patient.lmp_date)]
                : ['Child Name',  patient.child_name || '—'],
              isPregnant
                ? ['EDD Source',  patient.edd_source?.replace(/_/g, ' ') || '—']
                : ['Gender',      patient.child_gender || '—'],
              ['Notes', patient.notes || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', gap: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-faint)', flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 500, color: 'var(--color-text)', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}

            {activeStageNotes && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid #bfdbfe',
                fontSize: '0.75rem',
                color: 'var(--color-text)',
              }}>
                <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: '2px' }}>
                  📌 Notes for this Stage:
                </div>
                {activeStageNotes}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Progress</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
              {visitedCount}/{totalCount} completed
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Progress bar */}
            <div>
              <div style={{ height: 4, background: 'var(--color-lightColor)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalCount > 0 ? (visitedCount / totalCount) * 100 : 0}%`,
                  background: 'var(--color-primary)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '0.25rem', textAlign: 'right' }}>
                {totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0}% done
              </div>
            </div>

            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = stages.filter(s => s.status === status).length;
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stages Timeline */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
            Care Stages
          </div>
          <button className="btn-ghost" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Tabs — only show immunization tab if immunization stages exist */}
        {(() => {
          const pregnancyStages     = stages.filter(s => s.template?.type === 'pregnancy');
          const immunizationStages  = stages.filter(s => s.template?.type === 'immunization');
          const hasImmunization     = immunizationStages.length > 0;
          const activeStages        = stageTab === 'pregnancy' ? pregnancyStages : immunizationStages;

          return (
            <>
              {/* Tab bar — only render if patient has both types (post-delivery pregnant) */}
              {(pregnancyStages.length > 0 && immunizationStages.length > 0) && (
                <div style={{
                  display: 'flex',
                  gap: '0.25rem',
                  padding: '0.625rem 1rem 0.625rem',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: '1rem',
                }}>
                  <button
                    onClick={() => setStageTab('pregnancy')}
                    style={{
                      padding: '0.3rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: stageTab === 'pregnancy' ? 600 : 400,
                      background: stageTab === 'pregnancy' ? 'var(--color-primary-bg)' : 'transparent',
                      color: stageTab === 'pregnancy' ? 'var(--color-primary)' : 'var(--color-text-faint)',
                      border: stageTab === 'pregnancy' ? '1px solid #fecdd3' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Pregnancy
                    <span style={{
                      marginLeft: '0.375rem',
                      padding: '0.05rem 0.375rem',
                      borderRadius: 99,
                      background: stageTab === 'pregnancy' ? 'var(--color-primary)' : 'var(--color-lightColor)',
                      color: stageTab === 'pregnancy' ? '#fff' : 'var(--color-text-faint)',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                    }}>{pregnancyStages.length}</span>
                  </button>

                  <button
                    onClick={() => setStageTab('immunization')}
                    style={{
                      padding: '0.3rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: stageTab === 'immunization' ? 600 : 400,
                      background: stageTab === 'immunization' ? 'rgba(59,130,246,0.08)' : 'transparent',
                      color: stageTab === 'immunization' ? '#3b82f6' : 'var(--color-text-faint)',
                      border: stageTab === 'immunization' ? '1px solid #bfdbfe' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Child Immunization
                    <span style={{
                      marginLeft: '0.375rem',
                      padding: '0.05rem 0.375rem',
                      borderRadius: 99,
                      background: stageTab === 'immunization' ? '#3b82f6' : 'var(--color-lightColor)',
                      color: stageTab === 'immunization' ? '#fff' : 'var(--color-text-faint)',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                    }}>{immunizationStages.length}</span>
                  </button>
                </div>
              )}

              {/* Stage list */}
              <div style={{ padding: '1rem' }}>
                {activeStages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-faint)', fontSize: '0.8125rem' }}>
                    No stages yet
                  </div>
                ) : (
                  <div className="timeline">
                    {activeStages.map((stage, i) => {
                      const cfg = STATUS_CONFIG[stage.status] || STATUS_CONFIG.pending;
                      const isPast       = ['visited', 'skipped'].includes(stage.status);
                      const isSkipped    = stage.status === 'skipped';
                      const isActionable = ['pending', 'notified'].includes(stage.status);
                      return (
                        <div
                          key={stage.id}
                          className="timeline-item"
                          style={{
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.5rem 0.625rem',
                            margin: '0 -0.625rem',
                            transition: 'background 0.15s ease',
                          }}
                          onClick={() => setSelectedStage(stage)}
                        >
                          <div
                            className="timeline-dot"
                            style={{
                              background:  isPast ? cfg.dot : 'transparent',
                              color:       isPast ? '#fff' : cfg.dot,
                              border:      `2px solid ${cfg.dot}`,
                              fontSize:    '0.5625rem',
                            }}
                          >
                            {isPast ? <CheckCircle size={12} /> : (i + 1)}
                          </div>

                          <div style={{ flex: 1, paddingTop: '0.125rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div>
                                <div style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: isSkipped ? 'var(--color-text-faint)' : 'var(--color-text)',
                                  textDecoration: isSkipped ? 'line-through' : 'none',
                                }}>
                                  {stage.template?.stage_name}
                                </div>
                                <div style={{
                                  fontSize: '0.6875rem',
                                  color: 'var(--color-text-faint)',
                                  marginTop: '2px',
                                  textDecoration: isSkipped ? 'line-through' : 'none',
                                }}>
                                  Scheduled: {fmt(stage.scheduled_date)}
                                  {stage.actual_visit_date && ` · Visited: ${fmt(stage.actual_visit_date)}`}
                                </div>
                                {isSkipped && stage.skip_reason && (
                                  <div style={{
                                    fontSize: '0.6875rem',
                                    color: 'var(--color-error)',
                                    marginTop: '3px',
                                    fontWeight: 500,
                                  }}>
                                    ⏭️ Skipped: {stage.skip_reason}
                                  </div>
                                )}
                                {stage.date_overridden && stage.override_reason && !isSkipped && (
                                  <div style={{
                                    fontSize: '0.6875rem',
                                    color: '#2563eb',
                                    marginTop: '3px',
                                    fontWeight: 500,
                                  }}>
                                    📅 Rescheduled: {stage.override_reason}
                                  </div>
                                )}
                              </div>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
                                onClick={e => e.stopPropagation()}
                              >
                                <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                                {isActionable && (
                                  <>
                                    <button
                                      className="btn-ghost"
                                      title={stage.template?.stage_code === 'DELIVERY' ? "Record Delivery" : "Mark Visited"}
                                      onClick={() => {
                                        if (stage.template?.stage_code === 'DELIVERY') {
                                          setShowDelivery(true);
                                        } else {
                                          setShowCompleteStage(stage);
                                        }
                                      }}
                                      disabled={marking === stage.id}
                                      style={{ color: 'var(--color-success)', padding: '0.25rem' }}
                                    >
                                      {marking === stage.id
                                        ? <div className="spinner" style={{ width: 13, height: 13 }} />
                                        : <CheckCircle size={14} />}
                                    </button>
                                    <button
                                      className="btn-ghost"
                                      title="Reschedule Stage"
                                      onClick={() => setShowReschedule(stage)}
                                      style={{ color: '#2563eb', padding: '0.25rem' }}
                                    >
                                      <Calendar size={14} />
                                    </button>
                                    <button
                                      className="btn-ghost"
                                      title="Skip Stage"
                                      onClick={() => setShowSkip(stage)}
                                      style={{ color: 'var(--color-error)', padding: '0.25rem' }}
                                    >
                                      <SkipForward size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  className="btn-ghost"
                                  title="View Stage Details"
                                  onClick={() => setSelectedStage(stage)}
                                  style={{ padding: '0.25rem' }}
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Modals */}
      {showEdd      && <EddModal      patient={patient} onClose={() => setShowEdd(false)}      onSuccess={() => { setShowEdd(false);      load(); }} />}
      {showDelivery && <DeliveryModal patient={patient} onClose={() => setShowDelivery(false)} onSuccess={() => { setShowDelivery(false); setStageTab('immunization'); load(); }} />}
      {showCompleteStage && (
        <CompleteStageModal
          stage={showCompleteStage}
          onClose={() => setShowCompleteStage(null)}
          onSuccess={() => { setShowCompleteStage(null); load(); }}
        />
      )}
      {showReschedule && (
        <RescheduleModal
          stage={showReschedule}
          onClose={() => setShowReschedule(null)}
          onSuccess={() => { setShowReschedule(null); load(); }}
        />
      )}
      {showSkip && (
        <SkipModal
          stage={showSkip}
          onClose={() => setShowSkip(null)}
          onSuccess={() => { setShowSkip(null); load(); }}
        />
      )}
      {selectedStage && (
        <StageDetailsModal
          stage={selectedStage}
          onClose={() => setSelectedStage(null)}
          onOpenReschedule={(s) => setShowReschedule(s)}
          onOpenSkip={(s) => setShowSkip(s)}
          onOpenVisit={(s) => {
            if (s.template?.stage_code === 'DELIVERY') {
              setShowDelivery(true);
            } else {
              setShowCompleteStage(s);
            }
          }}
        />
      )}
      {showEdit && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
