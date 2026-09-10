import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Calendar, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import RegisterPatientModal from '../components/RegisterPatientModal';

const LIMIT = 10;

function statusBadge(status) {
  const map = { active: 'badge-active', completed: 'badge-completed', inactive: 'badge-inactive' };
  return <span className={`badge ${map[status] || 'badge-inactive'}`}>{status}</span>;
}
function typeBadge(type) {
  return <span className={`badge ${type === 'pregnant' ? 'badge-pregnant' : 'badge-immunization'}`}>{type}</span>;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cleanStageName(name) {
  if (!name) return '';
  if (name.includes('—')) {
    const parts = name.split('—');
    const mainPart = parts[0].trim();
    if (mainPart.toLowerCase() === 'at birth') {
      return 'Birth Checkup';
    }
    return `${mainPart} Checkup`;
  }
  return name;
}

const SORT_OPTIONS = [
  { value: 'next_stage',  label: 'Next Stage (Soonest)' },
  { value: 'name',        label: 'Name (A–Z)' },
  { value: 'registered',  label: 'Recently Registered' },
  { value: 'status',      label: 'Status' },
];

export default function Patients() {
  const [patients,   setPatients]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort,         setSort]         = useState('next_stage');
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, sort });
      if (search)       params.set('search', search);
      if (typeFilter)   params.set('type',   typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/patients?${params}`);
      setPatients(res.data.patients);
      setTotal(res.data.total);
      setPages(res.data.pages || 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, typeFilter, statusFilter, sort]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  function handleSearch(e) { setSearch(e.target.value); setPage(1); }
  function handleType(e)   { setTypeFilter(e.target.value); setPage(1); }
  function handleStatus(e) { setStatusFilter(e.target.value); setPage(1); }
  function handleSort(e)   { setSort(e.target.value); setPage(1); }

  const startRow = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endRow   = Math.min(page * LIMIT, total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Patients</div>
          <div className="page-subtitle">{total} total registered</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Patient
        </button>
      </div>

      {/* Filters + Sort */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div className="search-box" style={{ flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={13} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          <input
            placeholder="Search name or number..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {/* Type filter */}
        <select className="input" style={{ width: 'auto' }} value={typeFilter} onChange={handleType}>
          <option value="">All Types</option>
          <option value="pregnant">Pregnant</option>
          <option value="immunization">Immunization</option>
        </select>

        {/* Status filter */}
        <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={handleStatus}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--color-text-faint)' }} />
          <select className="input" style={{ width: 'auto' }} value={sort} onChange={handleSort}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={32} /></div>
            <div className="empty-state-text">No patients found</div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={13} /> Register First Patient
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>WhatsApp</th>
                  <th>Type</th>
                  <th>EDD / DOB</th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={11} /> Current Stage
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={11} /> Next Stage
                    </span>
                  </th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    {/* Name + initials */}
                    <td>
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
                          <div style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: '0.8125rem' }}>{p.name}</div>
                          {p.age && <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-faint)' }}>{p.age} yrs</div>}
                        </div>
                      </div>
                    </td>

                    {/* WhatsApp */}
                    <td style={{ fontSize: '0.8125rem' }}>{p.whatsapp_number}</td>

                    {/* Type */}
                    <td>{typeBadge(p.patient_type)}</td>

                    {/* EDD / DOB */}
                    <td style={{ fontSize: '0.8125rem' }}>
                      {p.patient_type === 'pregnant'
                        ? fmtDate(p.edd)
                        : fmtDate(p.child_dob)
                      }
                    </td>

                    {/* Current visited stage */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: 160 }}>
                      {p.current_stage_name
                        ? <span style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            fontWeight: 500,
                            fontSize: '0.6875rem',
                          }}>{cleanStageName(p.current_stage_name)}</span>
                        : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      }
                    </td>

                    {/* Next upcoming stage */}
                    <td style={{ fontSize: '0.75rem', maxWidth: 170 }}>
                      {p.next_stage_name ? (
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: '0.75rem' }}>
                            {cleanStageName(p.next_stage_name)}
                          </div>
                          <div style={{ color: 'var(--color-text-faint)', fontSize: '0.6875rem', marginTop: '1px' }}>
                            {fmtDate(p.next_stage_date)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>{statusBadge(p.status)}</td>

                    {/* View */}
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/patients/${p.id}`} className="btn-ghost" title="View">
                        <Eye size={14} />
                      </Link>
                    </td>
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
            <span>
              Showing {startRow}–{endRow} of {total} patients
            </span>
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
        <RegisterPatientModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchPatients(); }}
        />
      )}
    </div>
  );
}
