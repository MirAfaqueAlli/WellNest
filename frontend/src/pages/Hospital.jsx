import { useEffect, useRef, useState } from 'react';
import { Building2, Save, Wifi, WifiOff, Eye, EyeOff, Send, CheckCircle } from 'lucide-react';
import api from '../api/axios';

export default function Hospital() {
  const [hospitalId, setHospitalId] = useState(null);
  const [form, setForm] = useState({
    name: '', address: '', phone: '',
    whatsapp_api_url: '', whatsapp_api_key: '', whatsapp_api_provider: '',
  });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');
  const [showKey, setShowKey]     = useState(false);

  // Test-send state
  const [testNumber, setTestNumber]   = useState('');
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState(null); // {ok, message}

  useEffect(() => {
    api.get('/auth/me')
      .then(meRes => {
        const id = meRes.data.user?.hospital_id;
        setHospitalId(id);
        return api.get(`/hospitals/${id}`);
      })
      .then(r => setForm({
        name:                  r.data.name                  || '',
        address:               r.data.address               || '',
        phone:                 r.data.phone                 || '',
        whatsapp_api_url:      r.data.whatsapp_api_url      || '',
        whatsapp_api_key:      r.data.whatsapp_api_key      || '',
        whatsapp_api_provider: r.data.whatsapp_api_provider || '',
      }))
      .catch(() => setError('Failed to load hospital info'))
      .finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function normalizePhone(val) {
    const digits = val.replace(/\D/g, '').slice(-10);
    return digits.length === 10 ? `+91${digits}` : val.trim();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put(`/hospitals/${hospitalId}`, { ...form, phone: form.phone ? normalizePhone(form.phone) : '' });
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  }

  async function handleTest() {
    if (!testNumber.trim()) return;
    setTesting(true); setTestResult(null);
    try {
      await api.post(`/hospitals/${hospitalId}/test-whatsapp`, { test_number: normalizePhone(testNumber) });
      setTestResult({ ok: true, message: 'Test message sent! Check your WhatsApp.' });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.error || 'Test failed' });
    } finally { setTesting(false); }
  }

  const hasApiConfig = form.whatsapp_api_url && form.whatsapp_api_key;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Hospital Settings</div>
          <div className="page-subtitle">Manage hospital info and WhatsApp API credentials</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Hospital Info ── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
                Hospital Info
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-danger-bg)', border: '1px solid #fecdd3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-success-bg)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <CheckCircle size={13} /> {success}
                </div>
              )}

              <div className="form-group">
                <label className="input-label">Hospital Name *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="input-label">Address</label>
                <textarea className="input" rows={2} value={form.address} onChange={e => set('address', e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label className="input-label">Phone</label>
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
                    value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── WhatsApp API Config ── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {hasApiConfig
                  ? <Wifi size={14} style={{ color: 'var(--color-success)' }} />
                  : <WifiOff size={14} style={{ color: 'var(--color-text-faint)' }} />
                }
                WhatsApp API Settings
              </div>
              <span style={{
                fontSize: '0.6875rem',
                padding: '0.125rem 0.5rem',
                borderRadius: 99,
                background: hasApiConfig ? 'var(--color-success-bg)' : 'var(--color-lightColor)',
                color: hasApiConfig ? 'var(--color-success)' : 'var(--color-text-faint)',
                fontWeight: 600,
              }}>
                {hasApiConfig ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', padding: '0.5rem 0.75rem', background: 'var(--color-lightColor)', borderRadius: 'var(--radius-sm)' }}>
                💡 Enter your WhatsApp API credentials here. All notifications for your hospital's patients will use these settings. If left empty, the system will fall back to the server's default credentials.
              </div>

              <div className="form-group">
                <label className="input-label">API Provider Name</label>
                <input className="input" placeholder="e.g. Twilio, Gupshup, GatewayProvider" value={form.whatsapp_api_provider} onChange={e => set('whatsapp_api_provider', e.target.value)} />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '2px', display: 'block' }}>Label only — for your reference</span>
              </div>

              <div className="form-group">
                <label className="input-label">API Endpoint URL</label>
                <input className="input" placeholder="https://api.yourprovider.com/v1/send" value={form.whatsapp_api_url} onChange={e => set('whatsapp_api_url', e.target.value)} />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '2px', display: 'block' }}>The full URL your API provider gave you for sending messages</span>
              </div>

              <div className="form-group">
                <label className="input-label">API Key / Token</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Your secret API key"
                    value={form.whatsapp_api_key}
                    onChange={e => set('whatsapp_api_key', e.target.value)}
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: '0.25rem' }}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '2px', display: 'block' }}>Sent as <code style={{ fontFamily: 'monospace' }}>x-api-key</code> header</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <><Save size={13} /> Save All Settings</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Test Connection Card ── */}
      {!loading && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Send size={14} style={{ color: 'var(--color-primary)' }} />
              Test WhatsApp Connection
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
              Send a test message to verify your API credentials are working correctly.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
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
                  value={testNumber}
                  onChange={e => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTest}
                disabled={testing || !testNumber.trim()}
                style={{ flexShrink: 0, gap: '0.375rem' }}
              >
                {testing
                  ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                  : <><Send size={13} /> Send Test</>
                }
              </button>
            </div>
            {testResult && (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                background: testResult.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecdd3'}`,
                color: testResult.ok ? 'var(--color-success)' : 'var(--color-error)',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}>
                {testResult.ok ? <CheckCircle size={13} /> : <WifiOff size={13} />}
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
