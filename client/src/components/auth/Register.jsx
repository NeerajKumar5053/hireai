import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

const roles = [
  { value: 'recruiter', icon: '🏢', label: 'Recruiter', desc: 'Post jobs & hire talent' },
  { value: 'candidate', icon: '👤', label: 'Candidate', desc: 'Find your dream job' },
]

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', company: '' })
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (role) => {
    setForm({ ...form, role })
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.role) return toast.error('Please select a role')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.user, data.token)
      toast.success(`Welcome to HireAI, ${data.user.name}!`)
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div className="auth-card" style={{ maxWidth: 480 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-logo">
          <span className="gradient-text">Hire</span>AI
        </div>

        {step === 1 ? (
          <>
            <h1 className="auth-title">Join HireAI</h1>
            <p className="auth-subtitle">I am a...</p>
            <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 0 }}>
              {roles.map(r => (
                <motion.div
                  key={r.value}
                  className={`role-option ${form.role === r.value ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(r.value)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '24px 16px', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{r.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>{r.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.desc}</div>
                </motion.div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '24px' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--brand-purple)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm">← Back</button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Registering as <strong style={{ color: 'var(--brand-purple)' }}>{form.role}</strong>
              </span>
            </div>

            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Fill in your details to get started</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="input" placeholder="John Smith"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              {form.role === 'recruiter' && (
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="input" placeholder="Acme Corp"
                    value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} required />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="input" placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>

              <motion.button
                type="submit" className="btn btn-primary w-full"
                style={{ padding: '13px', marginTop: '8px' }}
                disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {loading ? <span className="spinner spinner-sm" /> : 'Create Account →'}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
