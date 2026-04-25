import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef(null)

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Resume upload states
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeParsing, setResumeParsing] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  useEffect(() => {
    api.get(`/jobs/${id}`).then(r => setJob(r.data.job)).finally(() => setLoading(false))
  }, [id])

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
      setParsedData(data.parsed)
      updateUser(data.user)
      toast.success('✅ Resume parsed! Profile auto-filled.')

      // Fetch job recommendations based on new skills
      fetchRecommendations()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse resume')
    } finally {
      setResumeParsing(false)
    }
  }

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const { data } = await api.get('/candidate/job-recommendations')
      setRecommendations(data.jobs || [])
    } catch { /* silent */ } finally {
      setLoadingRecs(false)
    }
  }

  // ── Apply ────────────────────────────────────────────────────────────────
  const handleApply = async (e) => {
    e.preventDefault()
    setApplying(true)
    try {
      await api.post(`/candidate/apply/${id}`, { coverLetter })
      setApplied(true)
      setShowForm(false)
      toast.success('🚀 Application submitted!')
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
          <AnimatePresence>
            {showForm && (
              <motion.div className="glass-card" style={{ padding: '28px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h3 style={{ marginBottom: '16px' }}>Apply for this Position</h3>
                <form onSubmit={handleApply}>

                  {/* ── Resume Upload ── */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">📄 Resume (PDF) <span style={{ color: 'var(--brand-cyan)', fontSize: '11px', fontWeight: 600, marginLeft: 6 }}>AI will auto-fill your profile</span></label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed ' + (resumeFile ? 'var(--brand-green)' : 'var(--border)'),
                        borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer',
                        background: resumeFile ? 'rgba(0,212,170,0.05)' : 'var(--bg-secondary)',
                        textAlign: 'center', transition: 'all 0.3s',
                      }}
                    >
                      {resumeParsing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <span className="spinner spinner-sm" />
                          <span style={{ fontSize: '13px', color: 'var(--brand-purple)' }}>🤖 AI is reading your resume…</span>
                        </div>
                      ) : resumeFile ? (
                        <div>
                          <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>✅</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-green)' }}>{resumeFile.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>Click to replace</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📎</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click to upload your resume <strong style={{ color: 'var(--text-primary)' }}>(.pdf)</strong></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>Max 10 MB • AI will extract your info automatically</div>
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
                  </div>

                  {/* ── AI Parse Result ── */}
                  <AnimatePresence>
                    {parsedData && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-lg)' }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-green)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>✅ Profile Auto-Filled From Resume</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '12px' }}>
                          {parsedData.name && <div><span style={{ color: 'var(--text-secondary)' }}>Name:</span> <strong>{parsedData.name}</strong></div>}
                          {parsedData.location && <div><span style={{ color: 'var(--text-secondary)' }}>Location:</span> <strong>{parsedData.location}</strong></div>}
                          {parsedData.experience && <div><span style={{ color: 'var(--text-secondary)' }}>Level:</span> <strong style={{ textTransform: 'capitalize' }}>{parsedData.experience}</strong></div>}
                          {parsedData.phone && <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> <strong>{parsedData.phone}</strong></div>}
                        </div>
                        {parsedData.skills?.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Skills detected:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {parsedData.skills.slice(0, 12).map(s => <span key={s} className="skill-tag" style={{ fontSize: '11px', padding: '3px 10px' }}>{s}</span>)}
                              {parsedData.skills.length > 12 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+{parsedData.skills.length - 12} more</span>}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Cover Letter ── */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Cover Letter <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(optional)</span></label>
                    <textarea className="textarea" rows={5} placeholder="Tell us why you're the perfect fit..." value={coverLetter} onChange={e => setCoverLetter(e.target.value)} />
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
          </AnimatePresence>

          {/* ── Job Recommendations ── */}
          <AnimatePresence>
            {recommendations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--brand-cyan)' }}>🎯 Jobs Recommended For You</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recommendations.slice(0, 5).map(rec => (
                    <Link key={rec._id} to={`/candidate/jobs/${rec._id}`} style={{ textDecoration: 'none' }}>
                      <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        <div className="company-logo" style={{ width: 40, height: 40, fontSize: '1rem', flexShrink: 0 }}>{rec.company?.[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{rec.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rec.company}</div>
                        </div>
                        <div style={{
                          padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          background: rec.matchScore >= 70 ? 'rgba(0,212,170,0.15)' : rec.matchScore >= 40 ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.08)',
                          color: rec.matchScore >= 70 ? 'var(--brand-green)' : rec.matchScore >= 40 ? 'var(--brand-orange)' : 'var(--text-secondary)',
                          border: `1px solid ${rec.matchScore >= 70 ? 'rgba(0,212,170,0.3)' : rec.matchScore >= 40 ? 'rgba(255,165,0,0.3)' : 'var(--border)'}`,
                        }}>
                          {rec.matchScore}% match
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <>
                <button
                  onClick={() => { setShowForm(true); setTimeout(() => document.querySelector('.glass-card form')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
                  className="btn btn-primary w-full btn-lg"
                  disabled={showForm}
                >
                  🚀 Apply Now
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '10px' }}>
                  📎 You can upload your PDF resume for AI-powered auto-fill
                </p>
              </>
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
