import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const experienceLabels = { fresher: 'Fresher', entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior', lead: 'Lead/Principal' }
const locationTypeColors = { remote: 'badge-green', hybrid: 'badge-orange', onsite: 'badge-cyan' }

export default function JobBoard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [applying, setApplying] = useState(null) // jobId being applied
  const [appliedJobs, setAppliedJobs] = useState(new Set())
  const [showApplyModal, setShowApplyModal] = useState(null) // job
  const [coverLetter, setCoverLetter] = useState('')
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({
    search: '', location: '', locationType: '', jobType: '',
    experienceLevel: '', salaryMin: '', salaryMax: '', sort: 'latest',
  })

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ...filters, page, limit: 12 })
      Object.keys(filters).forEach(k => !filters[k] && params.delete(k))
      const { data } = await api.get(`/jobs?${params}`)
      setJobs(data.jobs)
      setPagination(data.pagination)
    } catch (e) {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [page])
  useEffect(() => { setPage(1); fetchJobs() }, [filters.sort])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchJobs()
  }

  const handleApply = async () => {
    if (!showApplyModal) return
    setApplying(showApplyModal._id)
    try {
      await api.post(`/candidate/apply/${showApplyModal._id}`, { coverLetter })
      setAppliedJobs(prev => new Set([...prev, showApplyModal._id]))
      setShowApplyModal(null)
      setCoverLetter('')
      toast.success('Application submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(null)
    }
  }

  const getSalaryLabel = (job) => {
    if (!job.salaryMin && !job.salaryMax) return null
    const currency = job.salaryCurrency === 'INR' ? '₹' : '$'
    const format = (n) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}k`
    if (job.salaryMin && job.salaryMax) return `${currency}${format(job.salaryMin)} - ${currency}${format(job.salaryMax)}`
    if (job.salaryMin) return `${currency}${format(job.salaryMin)}+`
    return `Up to ${currency}${format(job.salaryMax)}`
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">🔍 Job <span className="gradient-text">Board</span></h1>
        <p className="page-subtitle">Find your perfect role from hundreds of opportunities</p>
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            className="input" style={{ flex: 1 }} placeholder="🔍 Search jobs, skills, companies..."
            value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select className="select" style={{ minWidth: 140 }} value={filters.locationType} onChange={e => setFilters({ ...filters, locationType: e.target.value })}>
            <option value="">📍 All Locations</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          <select className="select" style={{ minWidth: 140 }} value={filters.experienceLevel} onChange={e => setFilters({ ...filters, experienceLevel: e.target.value })}>
            <option value="">⭐ Experience</option>
            <option value="fresher">Fresher</option>
            <option value="entry">Entry Level</option>
            <option value="mid">Mid Level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
          <select className="select" style={{ minWidth: 140 }} value={filters.jobType} onChange={e => setFilters({ ...filters, jobType: e.target.value })}>
            <option value="">💼 Job Type</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <select className="select" style={{ minWidth: 140 }} value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
            <option value="latest">🕐 Latest</option>
            <option value="salary_high">💰 Salary: High to Low</option>
            <option value="salary_low">💰 Salary: Low to High</option>
            <option value="deadline">⏰ Deadline Soon</option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', location: '', locationType: '', jobType: '', experienceLevel: '', salaryMin: '', salaryMax: '', sort: 'latest' })}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
          <h3>No jobs found</h3>
          <p className="text-muted">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Showing {jobs.length} of {pagination.total} jobs
            </p>
          </div>

          <div className="jobs-grid">
            {jobs.map((job, i) => {
              const salaryLabel = getSalaryLabel(job)
              const isApplied = appliedJobs.has(job._id)

              return (
                <motion.div
                  key={job._id}
                  className="job-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/candidate/jobs/${job._id}`)}
                >
                  <div className="job-card-header">
                    <div className="company-logo">
                      {job.companyLogo
                        ? <img src={job.companyLogo} alt={job.company} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                        : job.company?.[0]?.toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="job-title">{job.title}</div>
                      <div className="company-name">{job.company}</div>
                    </div>
                    {job.defaultInterviewType !== 'none' && (
                      <span className={`badge ${job.defaultInterviewType === 'ai' ? 'badge-purple' : 'badge-cyan'}`}>
                        {job.defaultInterviewType === 'ai' ? '🤖 AI' : '📹 Video'}
                      </span>
                    )}
                  </div>

                  <div className="job-meta">
                    {job.location && <span className="job-meta-item">📍 {job.location}</span>}
                    <span className={`badge ${locationTypeColors[job.locationType]}`}>{job.locationType}</span>
                    <span className="job-meta-item">⭐ {experienceLabels[job.experienceLevel]}</span>
                    <span className="job-meta-item">💼 {job.jobType}</span>
                  </div>

                  {job.skills?.length > 0 && (
                    <div className="job-skills">
                      {job.skills.slice(0, 4).map(s => <span key={s} className="skill-tag">{s}</span>)}
                      {job.skills.length > 4 && <span className="skill-tag">+{job.skills.length - 4}</span>}
                    </div>
                  )}

                  <div className="job-footer">
                    {salaryLabel
                      ? <span className="salary-badge">{salaryLabel}</span>
                      : <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Salary not disclosed</span>
                    }
                    <button
                      className={`btn btn-sm ${isApplied ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={e => { e.stopPropagation(); if (!isApplied) setShowApplyModal(job) }}
                      disabled={isApplied}
                    >
                      {isApplied ? '✅ Applied' : 'Apply Now'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className="modal-header">
                <h2 className="modal-title">Apply for {showApplyModal.title}</h2>
                <button onClick={() => setShowApplyModal(null)} className="btn btn-ghost btn-icon">✕</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>{showApplyModal.company}</p>

              {user?.resume ? (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', marginBottom: '20px', fontSize: '13px', color: 'var(--brand-green)' }}>
                  ✅ Your uploaded resume will be attached automatically
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,140,71,0.1)', border: '1px solid rgba(255,140,71,0.2)', marginBottom: '20px', fontSize: '13px', color: 'var(--brand-orange)' }}>
                  ⚠️ No resume uploaded — <a href="/candidate/profile" style={{ color: 'var(--brand-cyan)', textDecoration: 'underline' }}>Upload one in your profile</a>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Cover Letter (optional)</label>
                <textarea
                  className="textarea" rows={5} style={{ minHeight: 120 }}
                  placeholder="Tell the recruiter why you're a great fit..."
                  value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleApply} className="btn btn-primary" style={{ flex: 1 }} disabled={!!applying}>
                  {applying ? <span className="spinner spinner-sm" /> : '🚀 Submit Application'}
                </button>
                <button onClick={() => setShowApplyModal(null)} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
