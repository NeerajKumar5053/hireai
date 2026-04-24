import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function CandidateProfile() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ name: '', headline: '', bio: '', location: '', skills: [], experience: 'entry', expectedSalary: '', linkedIn: '', github: '', portfolio: '' })
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) setForm({ name: user.name || '', headline: user.headline || '', bio: user.bio || '', location: user.location || '', skills: user.skills || [], experience: user.experience || 'entry', expectedSalary: user.expectedSalary || '', linkedIn: user.linkedIn || '', github: user.github || '', portfolio: user.portfolio || '' })
  }, [user])

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) { setForm(f => ({ ...f, skills: [...f.skills, s] })); setSkillInput('') }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/auth/profile', form)
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') } finally { setLoading(false) }
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">👤 My <span className="gradient-text">Profile</span></h1>
        <p className="page-subtitle">Keep your profile updated to get better job matches</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>Basic Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="input" placeholder="e.g., Mumbai, India" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Professional Headline</label>
              <input className="input" placeholder="e.g., Full Stack Developer with 3 years experience" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Bio</label>
              <textarea className="textarea" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell recruiters about yourself..." />
            </div>
            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select className="select" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}>
                <option value="fresher">Fresher</option><option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option><option value="senior">Senior</option><option value="lead">Lead</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expected Salary (₹/year)</label>
              <input className="input" type="number" placeholder="600000" value={form.expectedSalary} onChange={e => setForm(f => ({ ...f, expectedSalary: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>Skills</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input className="input" placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
            <button type="button" onClick={addSkill} className="btn btn-secondary">Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {form.skills.map(s => (
              <span key={s} className="skill-tag" style={{ cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))}>
                {s} ✕
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>Social Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input className="input" placeholder="https://linkedin.com/in/yourname" value={form.linkedIn} onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub URL</label>
              <input className="input" placeholder="https://github.com/yourname" value={form.github} onChange={e => setForm(f => ({ ...f, github: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Portfolio URL</label>
              <input className="input" placeholder="https://yourportfolio.com" value={form.portfolio} onChange={e => setForm(f => ({ ...f, portfolio: e.target.value }))} />
            </div>
          </div>
        </div>

        <motion.button type="submit" className="btn btn-primary btn-lg" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {loading ? <span className="spinner spinner-sm" /> : '💾 Save Profile'}
        </motion.button>
      </form>
    </div>
  )
}
