import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';

export default function RegisterPatientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', whatsapp_number: '', age: '', address: '',
    patient_type: 'pregnant',
    lmp_date: '', edd: '', edd_source: 'lmp_calculated',
    child_dob: '', child_name: '', child_gender: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      patient_type: form.patient_type,
    };
    if (form.age) payload.age = parseInt(form.age);
    if (form.address) payload.address = form.address;
    if (form.notes) payload.notes = form.notes;

    if (form.patient_type === 'pregnant') {
      if (!form.lmp_date && !form.edd) { setError('LMP date or EDD is required'); return; }
      if (form.lmp_date) payload.lmp_date = form.lmp_date;
      if (form.edd) { payload.edd = form.edd; payload.edd_source = form.edd_source; }
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
                <input className="input" placeholder="+91 9876543210" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} required />
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
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="input-label">LMP Date</label>
                    <input className="input" type="date" value={form.lmp_date} onChange={e => set('lmp_date', e.target.value)} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>EDD auto-calculated (+280 days)</span>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Or direct EDD</label>
                    <input className="input" type="date" value={form.edd} onChange={e => set('edd', e.target.value)} />
                    <select className="input" style={{ marginTop: '0.25rem' }} value={form.edd_source} onChange={e => set('edd_source', e.target.value)}>
                      <option value="lmp_calculated">LMP Calculated</option>
                      <option value="ultrasound">Ultrasound</option>
                      <option value="direct_entry">Direct Entry</option>
                    </select>
                  </div>
                </div>
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
