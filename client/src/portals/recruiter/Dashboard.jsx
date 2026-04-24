import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const statusColors = {
  applied: 'badge-purple', reviewing: 'badge-cyan', shortlisted: 'badge-green',
  interview_scheduled: 'badge-orange', interviewed: 'badge-cyan', offered: 'badge-green',
  rejected: 'badge-red', withdrawn: 'badge-gray',
}

export default function RecruiterDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/recruiter/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>

  const { stats, recentApplications, upcomingInterviews } = data || {}

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋</h1>
        <p className="page-subtitle">Here's what's happening with your hiring today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Total Jobs', value: stats?.totalJobs ?? 0, icon: '💼', color: 'purple' },
          { label: 'Active Jobs', value: stats?.activeJobs ?? 0, icon: '🟢', color: 'green' },
          { label: 'Applications', value: stats?.totalApplications ?? 0, icon: '📋', color: 'pink' },
          { label: 'Upcoming Interviews', value: stats?.pendingInterviews ?? 0, icon: '📅', color: 'orange' },
        ].map((s, i) => (
          <motion.div key={s.label} className={`stat-card ${s.color}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="stat-value gradient-text">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-icon">{s.icon}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Applications */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem' }}>Recent Applications</h3>
            <Link to="/recruiter/applicants" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {recentApplications?.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No applications yet.</p>}
          {recentApplications?.map(app => (
            <div key={app._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                {app.candidate?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{app.candidate?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{app.job?.title}</div>
              </div>
              <span className={`badge ${statusColors[app.status] || 'badge-gray'}`}>{app.status}</span>
            </div>
          ))}
        </div>

        {/* Upcoming Interviews */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem' }}>Upcoming Interviews</h3>
            <Link to="/recruiter/schedule" className="btn btn-ghost btn-sm">Schedule New →</Link>
          </div>
          {upcomingInterviews?.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No upcoming interviews.</p>}
          {upcomingInterviews?.map(iv => (
            <div key={iv._id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginBottom: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{iv.candidate?.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{iv.job?.title}</div>
                </div>
                <span className={`badge ${iv.type === 'ai' ? 'badge-purple' : 'badge-cyan'}`}>
                  {iv.type === 'ai' ? '🤖 AI' : '📹 Video'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brand-cyan)', marginTop: '8px' }}>
                📅 {new Date(iv.scheduledAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link to="/recruiter/jobs/create" className="btn btn-primary">➕ Post New Job</Link>
        <Link to="/recruiter/applicants" className="btn btn-secondary">👥 View All Applicants</Link>
        <Link to="/recruiter/schedule" className="btn btn-secondary">📅 Schedule Interview</Link>
      </div>
    </div>
  )
}
