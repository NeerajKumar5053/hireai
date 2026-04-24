import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const statusColors = {
  applied: 'badge-purple', reviewing: 'badge-cyan', shortlisted: 'badge-green',
  interview_scheduled: 'badge-orange', offered: 'badge-green', rejected: 'badge-red', withdrawn: 'badge-gray',
}

export default function CandidateDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/candidate/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>

  const { stats, recentApplications, upcomingInterviews, applicationsByStatus } = data || {}

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">Welcome, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋</h1>
        <p className="page-subtitle">Track your applications and prepare for your interviews.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Total Applications', value: stats?.totalApplications ?? 0, icon: '📋', color: 'purple' },
          { label: 'Practice Sessions', value: stats?.practiceCount ?? 0, icon: '🎯', color: 'green' },
          { label: 'Interviews Scheduled', value: upcomingInterviews?.length ?? 0, icon: '📅', color: 'pink' },
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
        {/* Upcoming Interviews */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>📅 Upcoming Interviews</h3>
          {upcomingInterviews?.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '13px' }}>No interviews scheduled yet.</p>
          )}
          {upcomingInterviews?.map(iv => (
            <div key={iv._id} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginBottom: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{iv.job?.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>with {iv.recruiter?.name}</div>
                </div>
                <span className={`badge ${iv.type === 'ai' ? 'badge-purple' : 'badge-cyan'}`}>
                  {iv.type === 'ai' ? '🤖 AI' : '📹 Video'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brand-cyan)', margin: '8px 0' }}>
                📅 {new Date(iv.scheduledAt).toLocaleString()}
              </div>
              <button
                onClick={() => navigate(iv.type === 'ai' ? `/interview/ai/${iv._id}` : `/interview/video/${iv.roomId}`)}
                className="btn btn-primary btn-sm w-full"
              >
                → Join Interview
              </button>
            </div>
          ))}
        </div>

        {/* Recent Applications */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem' }}>📋 Recent Applications</h3>
            <Link to="/candidate/applications" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {recentApplications?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>No applications yet.</p>
              <Link to="/candidate/jobs" className="btn btn-primary btn-sm">Browse Jobs →</Link>
            </div>
          )}
          {recentApplications?.map(app => (
            <div key={app._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                {app.job?.company?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{app.job?.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{app.job?.company}</div>
              </div>
              <span className={`badge ${statusColors[app.status] || 'badge-gray'}`}>{app.status?.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link to="/candidate/jobs" className="btn btn-primary">🔍 Browse Jobs</Link>
        <Link to="/candidate/practice" className="btn btn-secondary">🎯 Practice Interview</Link>
        <Link to="/candidate/profile" className="btn btn-secondary">👤 Update Profile</Link>
      </div>
    </div>
  )
}
