import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function ScheduleInterview() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state || {}
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [recruiters, setRecruiters] = useState([]) // for panel
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    jobId: prefill.jobId || '',
    applicationId: prefill.applicationId || '',
    candidateId: prefill.candidateId || '',
    candidateName: prefill.candidateName || '',
    type: 'ai',
    aiMode: 'full',
    interviewMode: 'one_to_one',
    panelists: [],
    scheduledAt: '',
    duration: 30,
    customQuestions: [],
    notes: '',
  })
  const [questionInput, setQuestionInput] = useState('')

  // Compute min datetime (now + 5 min, rounded)
  const minDateTime = (() => {
    const d = new Date(Date.now() + 5 * 60 * 1000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
  })()

  useEffect(() => {
    api.get('/recruiter/jobs').then(r => setJobs(r.data.jobs || []))
    api.get('/recruiter/applications').then(r => setApplications(r.data.applications || []))
    // Load recruiters list for panel selection
    api.get('/admin/users?role=recruiter').catch(() => null).then(r => {
      if (r?.data?.users) setRecruiters(r.data.users)
    })
  }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleJobSelect = (jobId) => {
    update('jobId', jobId)
    const job = jobs.find(j => j._id === jobId)
    if (job) {
      update('type', job.defaultInterviewType !== 'none' ? job.defaultInterviewType : 'ai')
      update('aiMode', job.aiInterviewMode || 'full')
      update('customQuestions', job.customQuestions || [])
    }
  }

  const addQuestion = () => {
    if (questionInput.trim()) {
      update('customQuestions', [...form.customQuestions, questionInput.trim()])
      setQuestionInput('')
    }
  }

  const togglePanelist = (id) => {
    const current = form.panelists
    if (current.includes(id)) {
      update('panelists', current.filter(p => p !== id))
    } else if (current.length < 3) {
      update('panelists', [...current, id])
    } else {
      toast('Maximum 3 panelists allowed', { icon: '⚠️' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.candidateId) return toast.error('Please select a candidate')
    if (!form.scheduledAt) return toast.error('Please select a date and time')

    // Client-side future-date guard
    if (new Date(form.scheduledAt) <= new Date()) {
      return toast.error('Interview must be scheduled for a future date and time')
    }

    setLoading(true)
    try {
      await api.post('/recruiter/interviews', {
        job: form.jobId,
        application: form.applicationId,
        candidate: form.candidateId,
        type: form.type,
        aiMode: form.aiMode,
        interviewMode: form.type === 'video' ? form.interviewMode : 'one_to_one',
        panelists: form.type === 'video' && form.interviewMode === 'panel' ? form.panelists : [],
        customQuestions: form.customQuestions,
        scheduledAt: form.scheduledAt,
        duration: Number(form.duration),
        notes: form.notes,
      })
      toast.success('🎉 Interview scheduled! Candidate has been notified.')
      navigate('/recruiter/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule interview')
    } finally {
      setLoading(false)
    }
  }

  // Unique candidates from applications
  const candidates = applications.reduce((acc, app) => {
    if (!acc.find(c => c._id === app.candidate?._id)) {
      acc.push({ _id: app.candidate?._id, name: app.candidate?.name, appId: app._id, jobId: app.job?._id })
    }
    return acc
  }, [])

  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ]

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">←</button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">📅 Schedule <span className="gradient-text">Interview</span></h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Candidate */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>👤 Candidate</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Candidate *</label>
              {prefill.candidateName ? (
                <div className="input" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                  <span style={{ fontWeight: 600 }}>{prefill.candidateName}</span>
                </div>
              ) : (
                <select className="select" value={form.candidateId}
                  onChange={e => {
                    const c = candidates.find(x => x._id === e.target.value)
                    update('candidateId', e.target.value)
                    if (c) { update('applicationId', c.appId); update('jobId', c.jobId) }
                  }} required>
                  <option value="">Select candidate</option>
                  {candidates.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Related Job</label>
              <select className="select" value={form.jobId} onChange={e => handleJobSelect(e.target.value)}>
                <option value="">Select job (optional)</option>
                {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Interview Details */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>🎯 Interview Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Interview Type *</label>
              <select className="select" value={form.type} onChange={e => update('type', e.target.value)}>
                <option value="ai">🤖 AI Interview</option>
                <option value="video">📹 Video Call</option>
              </select>
            </div>

            {form.type === 'ai' && (
              <div className="form-group">
                <label className="form-label">AI Mode</label>
                <select className="select" value={form.aiMode} onChange={e => update('aiMode', e.target.value)}>
                  <option value="full">🤖 Full AI (AI generates questions)</option>
                  <option value="assisted">📝 AI-Assisted (my questions)</option>
                </select>
              </div>
            )}

            {form.type === 'video' && (
              <div className="form-group">
                <label className="form-label">Interview Format</label>
                <select className="select" value={form.interviewMode} onChange={e => update('interviewMode', e.target.value)}>
                  <option value="one_to_one">👤 1-on-1 (You + Candidate)</option>
                  <option value="panel">👥 Panel (Multiple Interviewers)</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                className="input"
                type="datetime-local"
                value={form.scheduledAt}
                min={minDateTime}
                onChange={e => update('scheduledAt', e.target.value)}
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                ⚡ Must be a future date and time
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Duration</label>
              <select
                className="select"
                value={form.duration}
                onChange={e => update('duration', Number(e.target.value))}
              >
                {durationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration preview */}
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(0,212,170,0.06)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--brand-green)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            ⏱️ Interview timer will be set to <strong>{form.duration} minutes</strong>
          </div>
        </div>

        {/* Panel selection (only when video + panel) */}
        {form.type === 'video' && form.interviewMode === 'panel' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>👥 Panel Members <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>(up to 3 additional interviewers)</span></h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              All selected panelists must have recruiter accounts. They will receive a notification to join the interview room.
            </p>
            {recruiters.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                No other recruiters found. You can still proceed with a 1-on-1 interview.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recruiters.map(r => (
                  <div
                    key={r._id}
                    onClick={() => togglePanelist(r._id)}
                    style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: `1px solid ${form.panelists.includes(r._id) ? 'var(--brand-purple)' : 'var(--border)'}`,
                      background: form.panelists.includes(r._id) ? 'rgba(108,71,255,0.1)' : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: form.panelists.includes(r._id) ? 'var(--brand-purple)' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {form.panelists.includes(r._id) ? '✓' : r.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.company || r.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.panelists.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--brand-green)' }}>
                ✅ {form.panelists.length} panelist{form.panelists.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        {/* Custom Questions */}
        {form.type === 'ai' && form.aiMode === 'assisted' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>❓ Custom Questions</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input className="input" placeholder="Add a question..."
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())} />
              <button type="button" onClick={addQuestion} className="btn btn-secondary">Add</button>
            </div>
            {form.customQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '8px' }}>
                <span style={{ color: 'var(--brand-purple)', fontWeight: 700 }}>Q{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px' }}>{q}</span>
                <button type="button" onClick={() => update('customQuestions', form.customQuestions.filter((_, j) => j !== i))}
                  className="btn btn-ghost btn-sm" style={{ color: '#ff4757' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes (for candidate)</label>
          <textarea className="textarea" placeholder="Any specific instructions for the candidate..." value={form.notes} onChange={e => update('notes', e.target.value)} style={{ minHeight: 80 }} />
        </div>

        <motion.button type="submit" className="btn btn-primary btn-lg" disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {loading ? <span className="spinner spinner-sm" /> : '📅 Schedule Interview & Notify Candidate'}
        </motion.button>
      </form>
    </div>
  )
}
