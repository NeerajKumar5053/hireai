import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const statusColors = { applied: 'badge-purple', reviewing: 'badge-cyan', shortlisted: 'badge-green', interview_scheduled: 'badge-orange', offered: 'badge-green', rejected: 'badge-red', withdrawn: 'badge-gray' }

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/candidate/applications').then(r => setApplications(r.data.applications || [])).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const handleWithdraw = async (id) => {
    if (!confirm('Withdraw this application?')) return
    await api.delete(`/candidate/applications/${id}`)
    setApplications(prev => prev.map(a => a._id === id ? { ...a, status: 'withdrawn' } : a))
    toast.success('Application withdrawn')
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">📋 My <span className="gradient-text">Applications</span></h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'applied', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div> :
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📋</div>
            <h3>No applications found</h3>
            <Link to="/candidate/jobs" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Browse Jobs →</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Job</th><th>Company</th><th>Applied</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => (
                  <motion.tr key={app._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.job?.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{app.job?.locationType} • {app.job?.experienceLevel}</div>
                    </td>
                    <td>{app.job?.company}</td>
                    <td style={{ fontSize: '13px' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td><span className={`badge ${statusColors[app.status] || 'badge-gray'}`}>{app.status?.replace('_', ' ')}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/candidate/jobs/${app.job?._id}`} className="btn btn-ghost btn-sm">View Job</Link>
                        {['applied', 'reviewing'].includes(app.status) && (
                          <button onClick={() => handleWithdraw(app._id)} className="btn btn-sm" style={{ color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>Withdraw</button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
