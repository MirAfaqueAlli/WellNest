import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';

export default function RegisterPatientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', whatsapp_number: '', age: '', address: '',
    patient_type: 'pregnant',
    edd_source: 'lmp_calculated',
    lmp_date: '',
    edd: '',
    us_scan_date: '', us_ga_weeks: '', us_ga_days: '',
    child_dob: '', child_name: '', child_gender: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // Strip non-digits, take last 10, prepend +91
  function normalizePhone(val) {
    const digits = val.replace(/\D/g, '').slice(-10);
    return digits.length === 10 ? `+91${digits}` : val.trim();
  }

  // Live-calculate EDD for ultrasound mode
  function calcUltrasoundEdd(scan_date, ga_weeks, ga_days) {
    if (!scan_date || ga_weeks === '') return '';
    const gaDays = (parseInt(ga_weeks) || 0) * 7 + (parseInt(ga_days) || 0);
    const remaining = 280 - gaDays;
    if (remaining < 0) return '';
    const edd = new Date(scan_date);
    edd.setDate(edd.getDate() + remaining);
    return edd.toISOString().split('T')[0];
  }

  const usEdd = calcUltrasoundEdd(form.us_scan_date, form.us_ga_weeks, form.us_ga_days);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name.trim(),
      whatsapp_number: normalizePhone(form.whatsapp_number),
      patient_type: form.patient_type,
    };
    if (form.age) payload.age = parseInt(form.age);
    if (form.address) payload.address = form.address;
    if (form.notes) payload.notes = form.notes;

    if (form.patient_type === 'pregnant') {
      payload.edd_source = form.edd_source;

      if (form.edd_source === 'lmp_calculated') {
        if (!form.lmp_date) { setError('LMP date is required'); return; }
        payload.lmp_date = form.lmp_date;

      } else if (form.edd_source === 'direct_entry') {
        if (!form.edd) { setError('EDD date is required'); return; }
        payload.edd = form.edd;

      } else if (form.edd_source === 'ultrasound') {
        if (!form.us_scan_date) { setError('Ultrasound scan date is required'); return; }
        if (form.us_ga_weeks === '') { setError('Gestational age is required'); return; }
        if (!usEdd) { setError('Could not calculate EDD — check gestational age'); return; }
        payload.ultrasound_scan_date = form.us_scan_date;
        payload.edd = usEdd;
      }
    } else {
      if (!form.child_dob) { setError('Child DOB is required'); return; }
      payload.child_dob = form.child_dob;
      if (form.child_name) payload.child_name = form.child_name;
      if (form.child_gender) payload.child_gender = form.child_gender;
    }

    setLoading(true);
    try {
      await api.post('/patients', payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">Register New Patient</h3>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{
                padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)',
                border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem', color: 'var(--color-error)',
              }}>{error}</div>
            )}

            {/* Type selector */}
            <div>
              <label className="input-label">Patient Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['pregnant', 'immunization'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('patient_type', t)}
                    style={{
                      padding: '0.375rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem', fontWeight: 500,
                      border: `1px solid ${form.patient_type === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: form.patient_type === t ? 'var(--color-primary-bg)' : 'transparent',
                      color: form.patient_type === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    {t === 'pregnant' ? '🤰 Pregnant' : '👶 Immunization'}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic info */}
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Full Name *</label>
                <input className="input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="input-label">WhatsApp Number *</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '0 0.625rem', height: 36,
                    display: 'flex', alignItems: 'center',
                    background: 'var(--color-surface-alt, rgba(255,255,255,0.05))',
                    border: '1px solid var(--color-border)', borderRight: 'none',
                    borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                    fontSize: '0.8125rem', color: 'var(--color-text-muted)',
                    flexShrink: 0, userSelect: 'none',
                  }}>+91</span>
                  <input
                    className="input"
                    style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                    placeholder="9876543210"
                    value={form.whatsapp_number}
                    onChange={e => set('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Age</label>
                <input className="input" type="number" placeholder="28" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Address</label>
                <input className="input" placeholder="City / Area" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
            </div>

            {/* Conditional fields */}
            {form.patient_type === 'pregnant' ? (
              <>
                <div className="divider" />

                {/* EDD method selector */}
                <div>
                  <label className="input-label">EDD Method</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                      { value: 'lmp_calculated', label: 'LMP Date' },
                      { value: 'direct_entry',   label: 'Direct EDD' },
                      { value: 'ultrasound',     label: 'Ultrasound' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('edd_source', opt.value)}
                        style={{
                          padding: '0.375rem 0.875rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem', fontWeight: 500,
                          border: `1px solid ${form.edd_source === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: form.edd_source === opt.value ? 'var(--color-primary-bg)' : 'transparent',
                          color: form.edd_source === opt.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          cursor: 'pointer', transition: 'all 150ms',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LMP Calculated */}
                {form.edd_source === 'lmp_calculated' && (
                  <div className="form-group">
                    <label className="input-label">LMP Date *</label>
                    <input className="input" type="date" value={form.lmp_date} onChange={e => set('lmp_date', e.target.value)} />
                    {form.lmp_date && (() => {
                      const d = new Date(form.lmp_date);
                      d.setDate(d.getDate() + 280);
                      return <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>EDD: {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
                    })()}
                  </div>
                )}

                {/* Direct EDD */}
                {form.edd_source === 'direct_entry' && (
                  <div className="form-group">
                    <label className="input-label">Expected Delivery Date (EDD) *</label>
                    <input className="input" type="date" value={form.edd} onChange={e => set('edd', e.target.value)} />
                  </div>
                )}

                {/* Ultrasound */}
                {form.edd_source === 'ultrasound' && (
                  <>
                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="input-label">Scan Date *</label>
                        <input className="input" type="date" value={form.us_scan_date} onChange={e => set('us_scan_date', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Gestational Age at Scan *</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            className="input" type="number" min="0" max="42" placeholder="12"
                            value={form.us_ga_weeks} onChange={e => set('us_ga_weeks', e.target.value)}
                            style={{ width: '5rem' }}
                          />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>wks</span>
                          <input
                            className="input" type="number" min="0" max="6" placeholder="3"
                            value={form.us_ga_days} onChange={e => set('us_ga_days', e.target.value)}
                            style={{ width: '4.5rem' }}
                          />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>days</span>
                        </div>
                      </div>
                    </div>
                    {usEdd && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>EDD: {new Date(usEdd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="divider" />
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="input-label">Child DOB *</label>
                    <input className="input" type="date" value={form.child_dob} onChange={e => set('child_dob', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Child Name</label>
                    <input className="input" placeholder="Baby's name" value={form.child_name} onChange={e => set('child_name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Gender</label>
                    <select className="input" value={form.child_gender} onChange={e => set('child_gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
