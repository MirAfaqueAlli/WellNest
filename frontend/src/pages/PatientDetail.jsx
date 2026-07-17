import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, SkipForward, Calendar, RefreshCw,
  Edit2, X, Baby,
} from 'lucide-react';
import api from '../api/axios';

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

/* ─── Main Component ────────────────────────────────── */
export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient]     = useState(null);
  const [stages, setStages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [marking, setMarking]     = useState(null);
  const [showEdd, setShowEdd]     = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [stageTab, setStageTab]   = useState('pregnancy');
  const [showCompleteStage, setShowCompleteStage] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/stages`),
      ]);
      setPatient(pRes.data);
      setStages(sRes.data);
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

  async function markSkipped(stageId) {
    setMarking(stageId);
    try {
      await api.put(`/patients/${id}/stages/${stageId}/skip`, { reason: 'staff_decision' });
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
              {/* Tab bar */}
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
                  🤰 Pregnancy
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

                {hasImmunization && (
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
                    👶 Child Immunization
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
                )}
              </div>

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
                      const isActionable = ['pending', 'notified'].includes(stage.status);
                      return (
                        <div key={stage.id} className="timeline-item">
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
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                  {stage.template?.stage_name}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                                  Scheduled: {fmt(stage.scheduled_date)}
                                  {stage.actual_visit_date && ` · Visited: ${fmt(stage.actual_visit_date)}`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
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
                                      style={{ color: 'var(--color-success)' }}
                                    >
                                      {marking === stage.id
                                        ? <div className="spinner" style={{ width: 13, height: 13 }} />
                                        : <CheckCircle size={14} />}
                                    </button>
                                    <button
                                      className="btn-ghost"
                                      title="Skip Stage"
                                      onClick={() => markSkipped(stage.id)}
                                      disabled={marking === stage.id}
                                    >
                                      <SkipForward size={14} />
                                    </button>
                                  </>
                                )}
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
    </div>
  );
}
