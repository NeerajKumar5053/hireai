import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

const JOB_CATEGORIES = [
  'Software Engineering', 'Data Science', 'Design', 'Product Management',
  'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Other',
]
const SKILLS_SUGGESTIONS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java',
  'SQL', 'AWS', 'Docker', 'Machine Learning', 'UI/UX', 'MongoDB', 'Git',
]

// ⚠️ IMPORTANT: Section must be defined OUTSIDE the component.
// If defined inside, React creates a new component reference on every re-render,
// causing the Section tree to unmount/remount and inputs to lose focus.
function Section({ title, children }) {
  return (
    <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
      <h3 style={{
        marginBottom: '20px', fontSize: '1rem', color: 'var(--brand-cyan)',
        borderBottom: '1px solid var(--border)', paddingBottom: '12px',
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

const INITIAL_FORM = {
  title: '', description: '', requirements: '', responsibilities: '',
  location: '', locationType: 'remote', jobType: 'full-time',
  experienceLevel: 'entry', salaryMin: '', salaryMax: '', salaryCurrency: 'INR',
  skills: [], category: '', deadline: '',
  defaultInterviewType: 'none', aiInterviewMode: 'full', customQuestions: [],
  interviewDuration: 30, status: 'active',
}

export default function JobCreate({ editMode = false }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [questionInput, setQuestionInput] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addSkill = (skill) => {
    const s = (skill || skillInput).trim()
    if (s && !form.skills.includes(s)) {
      update('skills', [...form.skills, s])
      setSkillInput('')
    }
  }

  const removeSkill = (s) => update('skills', form.skills.filter(x => x !== s))

  const addQuestion = () => {
    if (questionInput.trim()) {
      update('customQuestions', [...form.customQuestions, questionInput.trim()])
      setQuestionInput('')
    }
  }

  const removeQuestion = (i) =>
    update('customQuestions', form.customQuestions.filter((_, j) => j !== i))

  const submitJob = async (status = 'active') => {
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error('Job title and description are required')
    }
    setLoading(true)
    try {
      await api.post('/recruiter/jobs', { ...form, status })
      toast.success(status === 'draft' ? 'Saved as draft!' : 'Job posted successfully! 🎉')
      navigate('/recruiter/jobs')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submitJob('active')
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← Back</button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">➕ Post a <span className="gradient-text">Job</span></h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 860 }}>

        {/* ── BASIC INFO ─────────────────────────── */}
        <Section title="📋 Basic Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Job Title *</label>
              <input
                className="input"
                id="job-title"
                placeholder="e.g., Senior React Developer"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={form.category} onChange={e => update('category', e.target.value)}>
                <option value="">Select category</option>
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Job Type</label>
              <select className="select" value={form.jobType} onChange={e => update('jobType', e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Job Description *</label>
              <textarea
                className="textarea"
                id="job-description"
                style={{ minHeight: 150 }}
                placeholder="Describe the role, what the candidate will do, and what makes it exciting..."
                value={form.description}
                onChange={e => update('description', e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Requirements</label>
              <textarea
                className="textarea"
                id="job-requirements"
                style={{ minHeight: 100 }}
                placeholder="List qualifications, degrees, certifications required..."
                value={form.requirements}
                onChange={e => update('requirements', e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* ── LOCATION & EXPERIENCE ──────────────── */}
        <Section title="📍 Location & Experience">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="input"
                id="job-location"
                placeholder="e.g., Bangalore, India"
                value={form.location}
                onChange={e => update('location', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location Type</label>
              <select className="select" value={form.locationType} onChange={e => update('locationType', e.target.value)}>
                <option value="remote">🌐 Remote</option>
                <option value="hybrid">🏠 Hybrid</option>
                <option value="onsite">🏢 On-site</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select className="select" value={form.experienceLevel} onChange={e => update('experienceLevel', e.target.value)}>
                <option value="fresher">Fresher (0 yr)</option>
                <option value="entry">Entry (1–2 yrs)</option>
                <option value="mid">Mid (3–5 yrs)</option>
                <option value="senior">Senior (5+ yrs)</option>
                <option value="lead">Lead / Principal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Min Salary (₹/year)</label>
              <input
                className="input"
                id="job-salary-min"
                type="number"
                placeholder="300000"
                value={form.salaryMin}
                onChange={e => update('salaryMin', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Salary (₹/year)</label>
              <input
                className="input"
                id="job-salary-max"
                type="number"
                placeholder="1500000"
                value={form.salaryMax}
                onChange={e => update('salaryMax', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Application Deadline</label>
              <input
                className="input"
                type="date"
                value={form.deadline}
                onChange={e => update('deadline', e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* ── SKILLS ────────────────────────────── */}
        <Section title="🛠️ Required Skills">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              className="input"
              id="skill-input"
              placeholder="Type a skill and hit Add or Enter..."
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            />
            <button type="button" onClick={() => addSkill()} className="btn btn-secondary">Add</button>
          </div>

          {form.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {form.skills.map(s => (
                <span
                  key={s}
                  className="skill-tag"
                  style={{ cursor: 'pointer', padding: '5px 12px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={() => removeSkill(s)}
                >
                  {s} <span style={{ opacity: 0.6 }}>✕</span>
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Quick add:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SKILLS_SUGGESTIONS.filter(s => !form.skills.includes(s)).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '12px', border: '1px solid var(--border)' }}
              >
                + {s}
              </button>
            ))}
          </div>
        </Section>

        {/* ── INTERVIEW CONFIG ───────────────────── */}
        <Section title="🤖 Interview Configuration">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Default Interview Type</label>
              <select
                className="select"
                value={form.defaultInterviewType}
                onChange={e => update('defaultInterviewType', e.target.value)}
              >
                <option value="none">No automatic interview</option>
                <option value="ai">🤖 AI Interview (automatic)</option>
                <option value="video">📹 Video Call Interview</option>
              </select>
            </div>

            {form.defaultInterviewType === 'ai' && (
              <div className="form-group">
                <label className="form-label">AI Interview Mode</label>
                <select
                  className="select"
                  value={form.aiInterviewMode}
                  onChange={e => update('aiInterviewMode', e.target.value)}
                >
                  <option value="full">🤖 Full AI — AI generates all questions</option>
                  <option value="assisted">📝 AI-Assisted — use my custom questions</option>
                </select>
              </div>
            )}
          </div>

          {/* Interview Duration */}
          {form.defaultInterviewType !== 'none' && (
            <div className="form-group" style={{ marginBottom: '20px', maxWidth: 220 }}>
              <label className="form-label">Interview Duration</label>
              <select className="select" value={form.interviewDuration} onChange={e => update('interviewDuration', Number(e.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          )}

          {/* Custom Questions */}
          {form.defaultInterviewType === 'ai' && form.aiInterviewMode === 'assisted' && (
            <div>
              <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Custom Interview Questions</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  className="input"
                  id="question-input"
                  placeholder="Type a question and press Add..."
                  value={questionInput}
                  onChange={e => setQuestionInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion() } }}
                />
                <button type="button" onClick={addQuestion} className="btn btn-secondary">Add</button>
              </div>
              {form.customQuestions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '8px', alignItems: 'flex-start',
                  padding: '10px 14px', background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)', marginBottom: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--brand-purple)', fontWeight: 700, minWidth: 24, marginTop: 1 }}>Q{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>{q}</span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ff4757', padding: '2px 8px' }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── SUBMIT ────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <motion.button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? <span className="spinner spinner-sm" /> : '🚀 Post Job'}
          </motion.button>

          <button
            type="button"
            onClick={() => submitJob('draft')}
            disabled={loading}
            className="btn btn-secondary btn-lg"
          >
            💾 Save as Draft
          </button>

          <button
            type="button"
            onClick={() => navigate('/recruiter/jobs')}
            className="btn btn-ghost btn-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
