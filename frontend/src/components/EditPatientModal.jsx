import { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function EditPatientModal({ patient, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: patient.name || '',
    whatsapp_number: (patient.whatsapp_number || '').replace(/^\+91/, '').replace(/\D/g, '').slice(-10),
    age: patient.age !== null && patient.age !== undefined ? String(patient.age) : '',
    address: patient.address || '',
    status: patient.status || 'active',
    notes: patient.notes || '',
    patient_type: patient.patient_type || 'pregnant',
    // Pregnancy fields
    edd_source: patient.edd_source || 'direct_entry',
    lmp_date: patient.lmp_date ? patient.lmp_date.split('T')[0] : '',
    edd: patient.edd ? patient.edd.split('T')[0] : '',
    us_scan_date: patient.ultrasound_scan_date ? patient.ultrasound_scan_date.split('T')[0] : '',
    us_ga_weeks: '',
    us_ga_days: '',
    // Delivery / Immunization fields
    delivery_date: patient.delivery_date ? patient.delivery_date.split('T')[0] : '',
    child_dob: patient.child_dob ? patient.child_dob.split('T')[0] : '',
    child_name: patient.child_name || '',
    child_gender: patient.child_gender || '',
  });

  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(false);
  const [error, setError]             = useState('');

  // Fetch full patient data on mount to ensure all fields are populated
  useEffect(() => {
    let isMounted = true;
    async function fetchFullPatient() {
      try {
        setFetching(true);
        const res = await api.get(`/patients/${patient.id}`);
        const p = res.data;
        if (!isMounted || !p) return;
        setForm(f => ({
          ...f,
          name: p.name || f.name,
          whatsapp_number: (p.whatsapp_number || '').replace(/^\+91/, '').replace(/\D/g, '').slice(-10) || f.whatsapp_number,
          age: p.age !== null && p.age !== undefined ? String(p.age) : f.age,
          address: p.address || f.address,
          status: p.status || f.status,
          notes: p.notes || f.notes,
          patient_type: p.patient_type || f.patient_type,
          edd_source: p.edd_source || f.edd_source,
          lmp_date: p.lmp_date ? p.lmp_date.split('T')[0] : f.lmp_date,
          edd: p.edd ? p.edd.split('T')[0] : f.edd,
          us_scan_date: p.ultrasound_scan_date ? p.ultrasound_scan_date.split('T')[0] : f.us_scan_date,
          delivery_date: p.delivery_date ? p.delivery_date.split('T')[0] : f.delivery_date,
          child_dob: p.child_dob ? p.child_dob.split('T')[0] : f.child_dob,
          child_name: p.child_name || f.child_name,
          child_gender: p.child_gender || f.child_gender,
        }));
      } catch {
        // Fall back to initial patient prop
      } finally {
        if (isMounted) setFetching(false);
      }
    }

    fetchFullPatient();
    return () => { isMounted = false; };
  }, [patient.id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function normalizePhone(val) {
    const digits = val.replace(/\D/g, '').slice(-10);
    return digits.length === 10 ? `+91${digits}` : val.trim();
  }

  // Live-calculate EDD for ultrasound mode
  function calcUltrasoundEdd(scan_date, ga_weeks, ga_days) {
    if (!scan_date || ga_weeks === '') return '';
    const gaDays = (parseInt(ga_weeks, 10) || 0) * 7 + (parseInt(ga_days, 10) || 0);
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

    if (!form.name.trim()) {
      setError('Patient name is required');
      return;
    }
    const cleanPhone = form.whatsapp_number.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit WhatsApp number');
      return;
    }

    const payload = {
      name: form.name.trim(),
      whatsapp_number: normalizePhone(form.whatsapp_number),
      status: form.status,
      age: form.age !== '' ? parseInt(form.age, 10) : null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (form.patient_type === 'pregnant') {
      payload.edd_source = form.edd_source;

      if (form.edd_source === 'lmp_calculated') {
        if (!form.lmp_date) { setError('LMP date is required'); return; }
        payload.lmp_date = form.lmp_date;
        const d = new Date(form.lmp_date);
        d.setDate(d.getDate() + 280);
        payload.edd = d.toISOString().split('T')[0];
      } else if (form.edd_source === 'direct_entry') {
        if (!form.edd) { setError('EDD date is required'); return; }
        payload.edd = form.edd;
      } else if (form.edd_source === 'ultrasound') {
        if (usEdd) {
          payload.edd = usEdd;
        } else if (form.edd) {
          payload.edd = form.edd;
        } else {
          setError('Ultrasound scan date and gestational age are required to calculate EDD');
          return;
        }
        if (form.us_scan_date) payload.ultrasound_scan_date = form.us_scan_date;
      }

      // If delivery has already occurred for this pregnant patient
      if (form.delivery_date) payload.delivery_date = form.delivery_date;
      if (form.child_dob) payload.child_dob = form.child_dob;
      if (form.child_name) payload.child_name = form.child_name.trim();
      if (form.child_gender) payload.child_gender = form.child_gender;
    } else {
      // Immunization patient
      if (!form.child_dob) { setError('Child date of birth is required'); return; }
      payload.child_dob = form.child_dob;
      payload.child_name = form.child_name.trim() || null;
      payload.child_gender = form.child_gender || null;
    }

    setLoading(true);
    try {
      await api.put(`/patients/${patient.id}`, payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update patient details');
    } finally {
      setLoading(false);
    }
  }

  const isPregnant = form.patient_type === 'pregnant';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-primary-bg)', border: '1px solid #fecdd3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)', flexShrink: 0
            }}>
              <UserCheck size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="modal-title" style={{ fontSize: '0.9375rem' }}>Edit Patient Details</h3>
                <span className={`badge ${isPregnant ? 'badge-pregnant' : 'badge-immunization'}`} style={{ fontSize: '0.6875rem' }}>
                  {isPregnant ? 'Pregnant' : 'Immunization'}
                </span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
                Patient ID: #{patient.id} • {patient.name}
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} title="Close"><X size={16} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{
                padding: '0.625rem 0.875rem', background: 'var(--color-danger-bg)',
                border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem', color: 'var(--color-error)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {fetching && (
              <div style={{
                fontSize: '0.75rem', color: 'var(--color-text-faint)',
                display: 'flex', alignItems: 'center', gap: '0.375rem'
              }}>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                Loading latest details...
              </div>
            )}

            {/* Basic Info */}
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="input-label">Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
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

            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="input-label">Age (Years)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 28"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  min="1"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Address / City</label>
                <input
                  className="input"
                  placeholder="e.g. Bandra, Mumbai"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </div>
            </div>

            {/* Pregnancy Care Details */}
            {isPregnant ? (
              <>
                <div className="divider" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="input-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                      Pregnancy & EDD Details
                    </label>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
                      Changing EDD updates all scheduled stages
                    </span>
                  </div>

                  {/* EDD method buttons */}
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

                  {/* LMP Option */}
                  {form.edd_source === 'lmp_calculated' && (
                    <div className="form-group">
                      <label className="input-label">LMP Date *</label>
                      <input
                        className="input"
                        type="date"
                        value={form.lmp_date}
                        onChange={e => set('lmp_date', e.target.value)}
                      />
                      {form.lmp_date && (() => {
                        const d = new Date(form.lmp_date);
                        d.setDate(d.getDate() + 280);
                        return (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 500, marginTop: '2px' }}>
                            Calculated EDD: {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Direct EDD Option */}
                  {form.edd_source === 'direct_entry' && (
                    <div className="form-group">
                      <label className="input-label">Expected Delivery Date (EDD) *</label>
                      <input
                        className="input"
                        type="date"
                        value={form.edd}
                        onChange={e => set('edd', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Ultrasound Option */}
                  {form.edd_source === 'ultrasound' && (
                    <>
                      <div className="form-row form-row-2">
                        <div className="form-group">
                          <label className="input-label">Scan Date</label>
                          <input
                            className="input"
                            type="date"
                            value={form.us_scan_date}
                            onChange={e => set('us_scan_date', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="input-label">Gestational Age at Scan</label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              max="42"
                              placeholder="wks"
                              value={form.us_ga_weeks}
                              onChange={e => set('us_ga_weeks', e.target.value)}
                              style={{ width: '5rem' }}
                            />
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>wks</span>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              max="6"
                              placeholder="days"
                              value={form.us_ga_days}
                              onChange={e => set('us_ga_days', e.target.value)}
                              style={{ width: '4.5rem' }}
                            />
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>days</span>
                          </div>
                        </div>
                      </div>

                      {usEdd ? (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                          Calculated EDD from Scan: {new Date(usEdd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      ) : form.edd ? (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                          Current EDD: {new Date(form.edd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <span style={{ color: 'var(--color-text-faint)', marginLeft: '0.375rem' }}>(Enter scan date & gestational age to recalculate)</span>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Delivery info if already delivered */}
                  {(form.delivery_date || form.child_dob) && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        Delivery & Child Details
                      </div>
                      <div className="form-row form-row-3">
                        <div className="form-group">
                          <label className="input-label">Delivery Date</label>
                          <input
                            className="input"
                            type="date"
                            value={form.delivery_date}
                            onChange={e => set('delivery_date', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="input-label">Child Name</label>
                          <input
                            className="input"
                            placeholder="Baby's name"
                            value={form.child_name}
                            onChange={e => set('child_name', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="input-label">Child Gender</label>
                          <select
                            className="input"
                            value={form.child_gender}
                            onChange={e => set('child_gender', e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Immunization Care Details */
              <>
                <div className="divider" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="input-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                      Child & Immunization Details
                    </label>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>
                      Changing DOB updates immunization vaccine schedules
                    </span>
                  </div>

                  <div className="form-row form-row-3">
                    <div className="form-group">
                      <label className="input-label">Child DOB *</label>
                      <input
                        className="input"
                        type="date"
                        value={form.child_dob}
                        onChange={e => set('child_dob', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label">Child Name</label>
                      <input
                        className="input"
                        placeholder="Baby's name"
                        value={form.child_name}
                        onChange={e => set('child_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label">Child Gender</label>
                      <select
                        className="input"
                        value={form.child_gender}
                        onChange={e => set('child_gender', e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="divider" />
            <div className="form-group">
              <label className="input-label">Medical / Administrative Notes</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Special medical instructions, allergies, high risk notes..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
