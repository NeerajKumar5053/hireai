import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function InterviewResults() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/recruiter/interviews/${sessionId}/result`).then(r => setInterview(r.data.interview)).finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div>
  if (!interview?.session) return <div style={{ textAlign: 'center', padding: '80px' }}>No results yet.</div>

  const session = interview.session
  const r = session.report

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">←</button>
        <div>
          <h1 className="page-title">📊 Interview <span className="gradient-text">Results</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{interview.candidate?.name}</p>
        </div>
      </div>

      {r ? (
        <button onClick={() => navigate(`/interview/report/${session._id}`, { state: { report: { overallScore: session.overallScore, communicationScore: session.communicationScore, technicalScore: session.technicalScore, confidenceScore: session.confidenceScore, report: r }, transcript: session.transcript, job: interview.job } })}
          className="btn btn-primary btn-lg">
          📊 View Full Report →
        </button>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
          <h3>Report Not Generated Yet</h3>
          <p className="text-muted">The candidate hasn't completed the interview yet.</p>
        </div>
      )}
    </div>
  )
}
