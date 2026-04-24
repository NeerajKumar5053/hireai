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
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    jobId: prefill.jobId || '', applicationId: prefill.applicationId || '',
    candidateId: prefill.candidateId || '', candidateName: prefill.candidateName || '',
    type: 'ai', aiMode: 'full', scheduledAt: '', duration: 30,
    customQuestions: [], notes: '',
  })
  const [questionInput, setQuestionInput] = useState('')

  useEffect(() => {
    api.get('/recruiter/jobs').then(r => setJobs(r.data.jobs || []))
    api.get('/recruiter/applications').then(r => setApplications(r.data.applications || []))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.candidateId || !form.scheduledAt) return toast.error('Please fill all required fields')
    setLoading(true)
    try {
      await api.post('/recruiter/interviews', {
        job: form.jobId, application: form.applicationId,
        candidate: form.candidateId, type: form.type, aiMode: form.aiMode,
        customQuestions: form.customQuestions, scheduledAt: form.scheduledAt,
        duration: form.duration, notes: form.notes,
      })
      toast.success('Interview scheduled! Candidate has been notified.')
      navigate('/recruiter/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule')
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
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input className="input" type="datetime-local" value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <select className="select" value={form.duration} onChange={e => update('duration', Number(e.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Questions */}
        {form.type === 'ai' && form.aiMode === 'assisted' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>❓ Custom Questions</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input className="input" placeholder="Add a question..." value={questionInput}
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
