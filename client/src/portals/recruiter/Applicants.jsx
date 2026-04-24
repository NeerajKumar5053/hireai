import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const statusColors = { applied: 'badge-purple', reviewing: 'badge-cyan', shortlisted: 'badge-green', interview_scheduled: 'badge-orange', offered: 'badge-green', rejected: 'badge-red' }

export default function Applicants() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null) // selected application for detail view

  useEffect(() => {
    Promise.all([
      api.get('/recruiter/applications'),
      api.get('/recruiter/jobs'),
    ]).then(([appsRes, jobsRes]) => {
      setApplications(appsRes.data.applications || [])
      setJobs(jobsRes.data.jobs || [])
    }).finally(() => setLoading(false))
  }, [])

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/recruiter/applications/${appId}/status`, { status })
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a))
      if (selected?._id === appId) setSelected(prev => ({ ...prev, status }))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  const filtered = applications.filter(a =>
    (!selectedJob || a.job?._id === selectedJob) &&
    (!statusFilter || a.status === statusFilter)
  )

  return (
    <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">👥 <span className="gradient-text">Applicants</span></h1>
            <p className="page-subtitle">{filtered.length} applications</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select className="select" style={{ minWidth: 200 }} value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
            <option value="">All Jobs</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
          <select className="select" style={{ minWidth: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['applied', 'reviewing', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div> :
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Candidate</th><th>Job</th><th>Applied</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => (
                  <motion.tr key={app._id} style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(app)}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                          {app.candidate?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{app.candidate?.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{app.candidate?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{app.job?.title}</td>
                    <td style={{ fontSize: '13px' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td><span className={`badge ${statusColors[app.status] || 'badge-gray'}`}>{app.status?.replace('_', ' ')}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <select className="select" style={{ fontSize: '12px', padding: '4px 8px', width: 180 }}
                        value={app.status} onChange={e => updateStatus(app._id, e.target.value)}>
                        {['reviewing', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Detail View */}
      {selected && (
        <motion.div className="glass-card" style={{ padding: '24px', position: 'sticky', top: '80px', alignSelf: 'start', height: 'fit-content' }}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem' }}>Candidate Profile</h3>
            <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">✕</button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', margin: '0 auto 12px' }}>
              {selected.candidate?.name?.[0]}
            </div>
            <div style={{ fontWeight: 700 }}>{selected.candidate?.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.candidate?.email}</div>
            {selected.candidate?.headline && <div style={{ fontSize: '12px', color: 'var(--brand-cyan)', marginTop: '4px' }}>{selected.candidate?.headline}</div>}
          </div>

          {selected.candidate?.skills?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>SKILLS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selected.candidate.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
              </div>
            </div>
          )}

          {selected.coverLetter && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>COVER LETTER</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.coverLetter}</p>
            </div>
          )}

          {selected.candidate?.resume && (
            <a href={selected.candidate.resume} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm w-full" style={{ marginBottom: '12px' }}>
              📄 View Resume
            </a>
          )}

          <div className="divider" />

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => { updateStatus(selected._id, 'shortlisted') }} className="btn btn-success btn-sm">✅ Shortlist</button>
            <button onClick={() => navigate('/recruiter/schedule', { state: { applicationId: selected._id, candidateId: selected.candidate?._id, candidateName: selected.candidate?.name, jobId: selected.job?._id } })} className="btn btn-primary btn-sm">📅 Schedule</button>
            <button onClick={() => { updateStatus(selected._id, 'rejected') }} className="btn btn-sm" style={{ color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>❌ Reject</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
