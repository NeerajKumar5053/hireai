import { useState, useEffect } from 'react'
import api from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#6c47ff', '#00d4ff', '#00d4aa', '#ff47c7', '#ff8c47']

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>

  const roleData = [
    { name: 'Recruiters', value: data?.stats?.recruiters || 0 },
    { name: 'Candidates', value: data?.stats?.candidates || 0 },
  ]

  const chartData = (data?.monthlyData || []).map(d => ({
    month: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
    signups: d.count,
  }))

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">📈 Platform <span className="gradient-text">Analytics</span></h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>Monthly Signups</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="signups" stroke="#6c47ff" fill="url(#signupGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>User Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 11 }}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '28px', marginTop: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>Platform Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { label: 'Total Users', value: data?.stats?.totalUsers || 0, delta: '+12%' },
            { label: 'Active Jobs', value: data?.stats?.totalJobs || 0, delta: '+8%' },
            { label: 'Applications', value: data?.stats?.totalApplications || 0, delta: '+24%' },
            { label: 'AI Interviews', value: data?.stats?.totalInterviews || 0, delta: '+35%' },
            { label: 'Hire Rate', value: '68%', delta: '+3%' },
            { label: 'Avg. Score', value: '74/100', delta: '+2pts' },
          ].map((stat, i) => (
            <div key={i} style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }} className="gradient-text">{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--brand-green)', marginTop: '4px' }}>{stat.delta} this month</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
