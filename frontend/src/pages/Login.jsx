import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { setAuth }             = useAuthStore();
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('All fields are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '10px',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.875rem',
          }}>
            <HeartPulse size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            WellNest
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
            Maternal & Child Care Management
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              Sign in to your account
            </h2>

            {error && (
              <div style={{
                padding: '0.5rem 0.75rem',
                background: 'var(--color-danger-bg)',
                border: '1px solid #fecdd3',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--color-error)',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="input-label">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="admin@wellnest.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute', right: '0.625rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none', border: 'none',
                      color: 'var(--color-text-faint)', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--color-text-faint)', marginTop: '1.5rem' }}>
          WellNest v1.0 · Hospital Management
        </p>
      </div>
    </div>
  );
}
