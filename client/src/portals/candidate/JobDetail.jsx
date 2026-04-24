import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.get(`/jobs/${id}`).then(r => setJob(r.data.job)).finally(() => setLoading(false))
  }, [id])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplying(true)
    try {
      await api.post(`/candidate/apply/${id}`, { coverLetter })
      setApplied(true)
      setShowForm(false)
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><span className="spinner" /></div>
  if (!job) return <div style={{ textAlign: 'center', padding: '80px' }}>Job not found. <Link to="/candidate/jobs">Back to Jobs</Link></div>

  return (
    <div className="animate-fade-up">
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: '20px' }}>← Back to Jobs</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Main */}
        <div>
          <motion.div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div className="company-logo" style={{ width: 64, height: 64, fontSize: '1.8rem', flexShrink: 0 }}>
                {job.companyLogo ? <img src={job.companyLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} /> : job.company?.[0]}
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{job.title}</h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{job.company}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {job.location && <span className="badge badge-gray">📍 {job.location}</span>}
                  <span className="badge badge-cyan">{job.locationType}</span>
                  <span className="badge badge-purple">{job.experienceLevel}</span>
                  <span className="badge badge-gray">{job.jobType}</span>
                </div>
              </div>
            </div>

            {(job.salaryMin || job.salaryMax) && (
              <div style={{ marginBottom: '24px', padding: '14px', background: 'rgba(0,212,170,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,212,170,0.2)' }}>
                <span style={{ color: 'var(--brand-green)', fontWeight: 700, fontSize: '1.1rem' }}>
                  {job.salaryCurrency === 'INR' ? '₹' : '$'}{job.salaryMin?.toLocaleString()} — {job.salaryCurrency === 'INR' ? '₹' : '$'}{job.salaryMax?.toLocaleString()}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '8px' }}>per year</span>
              </div>
            )}

            <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>Job Description</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginBottom: '24px' }}>{job.description}</p>

            {job.requirements && (
              <>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>Requirements</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginBottom: '24px' }}>{job.requirements}</p>
              </>
            )}

            {job.skills?.length > 0 && (
              <>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>Required Skills</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {job.skills.map(s => <span key={s} className="skill-tag" style={{ padding: '6px 14px', fontSize: '13px' }}>{s}</span>)}
                </div>
              </>
            )}
          </motion.div>

          {/* Apply Form */}
          {showForm && (
            <motion.div className="glass-card" style={{ padding: '28px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ marginBottom: '16px' }}>Apply for this Position</h3>
              <form onSubmit={handleApply}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Cover Letter (optional)</label>
                  <textarea className="textarea" rows={6} placeholder="Tell us why you're the perfect fit..." value={coverLetter} onChange={e => setCoverLetter(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="btn btn-primary" disabled={applying}>
                    {applying ? <span className="spinner spinner-sm" /> : '🚀 Submit Application'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
            {applied ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--brand-green)', marginBottom: '8px' }}>Applied!</div>
                <Link to="/candidate/applications" className="btn btn-secondary btn-sm w-full" style={{ marginTop: '8px' }}>View Applications</Link>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary w-full btn-lg"
                disabled={showForm}
              >
                🚀 Apply Now
              </button>
            )}

            {job.defaultInterviewType !== 'none' && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(108,71,255,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108,71,255,0.2)', fontSize: '12px', color: 'var(--brand-purple)', textAlign: 'center' }}>
                {job.defaultInterviewType === 'ai' ? '🤖 AI Interview will be conducted' : '📹 Video interview will be scheduled'}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>About {job.recruiter?.company}</h4>
            {job.recruiter?.companyDescription && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{job.recruiter?.companyDescription}</p>}
            {job.recruiter?.companyWebsite && (
              <a href={job.recruiter?.companyWebsite} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm w-full">🌐 Company Website</a>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>👁️ {job.viewCount} views</span>
              <span>👥 {job.applicantCount} applicants</span>
            </div>
            {job.deadline && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--brand-orange)' }}>
                ⏰ Apply by {new Date(job.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
