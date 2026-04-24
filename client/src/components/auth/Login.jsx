import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div className="auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-logo">
          <span className="gradient-text">Hire</span>AI
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {/* Quick Demo Logins */}
        <div style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--brand-cyan)' }}>Demo Accounts:</strong><br />
          Admin: admin@hireai.com / admin123 &nbsp;|&nbsp; Recruiter: recruiter@hireai.com / pass123<br />
          Candidate: candidate@hireai.com / pass123
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password" className="input" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <motion.button
            type="submit" className="btn btn-primary w-full"
            style={{ padding: '13px', marginTop: '8px' }}
            disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            {loading ? <span className="spinner spinner-sm" /> : 'Sign In →'}
          </motion.button>
        </form>

        <div className="divider-text" style={{ margin: '24px 0' }}>or</div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--brand-purple)', fontWeight: 600 }}>Create one free</Link>
        </p>
      </motion.div>
    </div>
  )
}
