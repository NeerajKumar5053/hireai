import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function JobList() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/recruiter/jobs').then(r => setJobs(r.data.jobs || [])).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this job posting?')) return
    await api.delete(`/recruiter/jobs/${id}`)
    setJobs(prev => prev.filter(j => j._id !== id))
    toast.success('Job deleted')
  }

  const toggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active'
    await api.put(`/recruiter/jobs/${job._id}`, { status: newStatus })
    setJobs(prev => prev.map(j => j._id === job._id ? { ...j, status: newStatus } : j))
    toast.success(`Job ${newStatus}`)
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">💼 My <span className="gradient-text">Jobs</span></h1>
          <p className="page-subtitle">{jobs.length} job postings</p>
        </div>
        <Link to="/recruiter/jobs/create" className="btn btn-primary">➕ Post New Job</Link>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div> :
        jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>💼</div>
            <h3>No jobs posted yet</h3>
            <Link to="/recruiter/jobs/create" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Post Your First Job</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Job Title</th><th>Applicants</th><th>Type</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <motion.tr key={job._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{job.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job.locationType} • {job.experienceLevel}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{job.applicantCount} applicants</span>
                    </td>
                    <td>
                      {job.defaultInterviewType !== 'none' && (
                        <span className={`badge ${job.defaultInterviewType === 'ai' ? 'badge-purple' : 'badge-cyan'}`}>
                          {job.defaultInterviewType === 'ai' ? '🤖 AI' : '📹 Video'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${job.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{job.status}</span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{new Date(job.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => navigate(`/recruiter/jobs/${job._id}/edit`)} className="btn btn-ghost btn-sm">✏️</button>
                        <button onClick={() => toggleStatus(job)} className={`btn btn-sm ${job.status === 'active' ? 'btn-secondary' : 'btn-success'}`}>
                          {job.status === 'active' ? 'Close' : 'Reopen'}
                        </button>
                        <button onClick={() => handleDelete(job._id)} className="btn btn-sm" style={{ color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>🗑️</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
