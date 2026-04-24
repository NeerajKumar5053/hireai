import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>

  const { stats, monthlyData } = data || {}

  const chartData = (monthlyData || []).map(d => ({
    name: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
    users: d.count,
  }))

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">🛡️ Admin <span className="gradient-text">Dashboard</span></h1>
        <p className="page-subtitle">Platform overview and management</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: 'purple' },
          { label: 'Recruiters', value: stats?.recruiters ?? 0, icon: '🏢', color: 'orange' },
          { label: 'Candidates', value: stats?.candidates ?? 0, icon: '👤', color: 'green' },
          { label: 'Total Jobs', value: stats?.totalJobs ?? 0, icon: '💼', color: 'pink' },
          { label: 'Applications', value: stats?.totalApplications ?? 0, icon: '📋', color: 'purple' },
          { label: 'AI Interviews', value: stats?.totalInterviews ?? 0, icon: '🤖', color: 'cyan' },
        ].map((s, i) => (
          <motion.div key={s.label} className={`stat-card ${s.color}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="stat-value gradient-text">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-icon">{s.icon}</div>
          </motion.div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>📈 Monthly User Signups</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="users" fill="var(--brand-purple)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Recent Users</h3>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {(data?.recentUsers || []).map((u, i) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontSize: '13px' }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'recruiter' ? 'badge-orange' : 'badge-green'}`}>{u.role}</span></td>
                  <td style={{ fontSize: '13px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
