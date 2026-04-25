import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function CandidateProfile() {
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', headline: '', bio: '', location: '', skills: [],
    experience: 'entry', expectedSalary: '', linkedIn: '', github: '', portfolio: '',
  })
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Resume upload states
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeParsing, setResumeParsing] = useState(false)
  const [parsedData, setParsedData] = useState(null)

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        headline: user.headline || '',
        bio: user.bio || '',
        location: user.location || '',
        skills: user.skills || [],
        experience: user.experience || 'entry',
        expectedSalary: user.expectedSalary || '',
        linkedIn: user.linkedIn || '',
        github: user.github || '',
        portfolio: user.portfolio || '',
      })
    }
  }, [user])

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) {
      setForm(f => ({ ...f, skills: [...f.skills, s] }))
      setSkillInput('')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/auth/profile', form)
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // ── Resume PDF upload & AI parse ─────────────────────────────────────────
  const handleResumeChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted for resume upload')
      return
    }
    setResumeFile(file)
    setResumeParsing(true)
    setParsedData(null)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      const { data } = await api.post('/candidate/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })

      const parsed = data.parsed
      setParsedData(parsed)
      updateUser(data.user)

      // Autofill the local form fields
      setForm(f => ({
        ...f,
        name: parsed.name?.trim() || f.name,
        headline: parsed.headline?.trim() || f.headline,
        location: parsed.location?.trim() || f.location,
        bio: parsed.bio || f.bio,
        experience: ['fresher','entry','mid','senior','lead'].includes(parsed.experience) ? parsed.experience : f.experience,
        linkedIn: parsed.linkedIn || f.linkedIn,
        github: parsed.github || f.github,
        skills: parsed.skills?.length > 0
          ? [...new Set([...f.skills, ...parsed.skills])]
          : f.skills,
      }))

      toast.success('✅ Profile auto-filled from resume!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse resume')
    } finally {
      setResumeParsing(false)
    }
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">👤 My <span className="gradient-text">Profile</span></h1>
        <p className="page-subtitle">Keep your profile updated to get better job matches</p>
      </div>

      {/* ── Resume Upload Card ── */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px', border: '1px solid rgba(108,71,255,0.25)', background: 'rgba(108,71,255,0.04)' }}>
        <h3 style={{ marginBottom: '6px', fontSize: '1rem', color: 'var(--brand-purple)' }}>🤖 AI Resume Parser</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Upload your PDF resume and our AI will automatically fill in your profile details — name, skills, experience, location, and more.
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed ' + (resumeFile ? 'var(--brand-green)' : 'rgba(108,71,255,0.4)'),
            borderRadius: 'var(--radius-lg)', padding: '24px', cursor: 'pointer',
            background: resumeFile ? 'rgba(0,212,170,0.04)' : 'transparent',
            textAlign: 'center', transition: 'all 0.3s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,71,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = resumeFile ? 'rgba(0,212,170,0.04)' : 'transparent' }}
        >
          {resumeParsing ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🤖 AI is reading your resume…</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Extracting skills, experience, and contact info</div>
              </div>
            </div>
          ) : resumeFile ? (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--brand-green)', marginBottom: '4px' }}>{resumeFile.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click to upload a different resume</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Upload Resume PDF</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Drag & drop or click • PDF only • Max 10 MB</div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleResumeChange}
        />

        {/* Parse result summary */}
        <AnimatePresence>
          {parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: '16px', padding: '14px', background: 'rgba(0,212,170,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,212,170,0.2)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-green)', marginBottom: '10px' }}>✅ Profile fields updated below — review and save</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {parsedData.skills?.slice(0, 10).map(s => (
                  <span key={s} className="skill-tag" style={{ fontSize: '11px', padding: '3px 10px' }}>{s}</span>
                ))}
                {parsedData.skills?.length > 10 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center' }}>+{parsedData.skills.length - 10} more</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                <option value="fresher">Fresher</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
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
