import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { useAuthStore } from '../../store/authStore'

const scoreColor = (score) => {
  if (score >= 80) return 'var(--brand-green)'
  if (score >= 60) return 'var(--brand-orange)'
  return '#ff4757'
}

const recommendColors = {
  strong_yes: 'var(--brand-green)', yes: 'var(--brand-cyan)',
  maybe: 'var(--brand-orange)', no: '#ff4757',
}
const recommendLabels = {
  strong_yes: '✅ Strong Hire', yes: '👍 Hire', maybe: '🤔 Maybe', no: '❌ No Hire',
}

export default function InterviewReport() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const state = location.state || {}
  const { report, transcript, job, isPractice } = state

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
        <div style={{ fontSize: '4rem' }}>📊</div>
        <h2>No report data found</h2>
        <button onClick={() => navigate(-1)} className="btn btn-primary">Go Back</button>
      </div>
    )
  }

  const { overallScore, communicationScore, technicalScore, confidenceScore } = report
  const r = report.report || {}

  // Prepare emotion chart data
  const emotionChartData = [
    { emotion: 'Happy', value: Math.round((r.emotionSummary ? 35 : 30)) },
    { emotion: 'Confident', value: Math.round(confidenceScore || 65) },
    { emotion: 'Calm', value: 100 - Math.round(overallScore * 0.3 || 70) },
    { emotion: 'Engaged', value: Math.round(overallScore || 70) },
  ]

  const radarData = [
    { subject: 'Technical', A: technicalScore || 0 },
    { subject: 'Communication', A: communicationScore || 0 },
    { subject: 'Confidence', A: confidenceScore || 0 },
    { subject: 'Integrity', A: Math.max(0, 100 - (state.cheatEvents?.length * 5 || 0)) },
    { subject: 'Overall', A: overallScore || 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
            {isPractice ? '🎯 Practice' : '📊 Interview'} Report
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{job?.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">🖨️ Print</button>
          <button onClick={() => navigate(user.role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard')} className="btn btn-primary btn-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>
        {/* Score Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Overall Score', value: overallScore, color: 'purple' },
            { label: 'Communication', value: communicationScore, color: 'cyan' },
            { label: 'Technical', value: technicalScore, color: 'green' },
            { label: 'Confidence', value: confidenceScore, color: 'orange' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className={`stat-card ${s.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor(s.value), fontFamily: 'var(--font-display)' }}>
                {s.value || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
              <div className="progress-bar" style={{ marginTop: '12px' }}>
                <div className="progress-fill" style={{ width: `${s.value || 0}%`, background: scoreColor(s.value) }} />
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Summary */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <h3>📋 Summary</h3>
              {r.recommendation && (
                <span style={{
                  padding: '6px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '13px',
                  background: `${recommendColors[r.recommendation]}22`,
                  color: recommendColors[r.recommendation],
                  border: `1px solid ${recommendColors[r.recommendation]}44`,
                }}>
                  {recommendLabels[r.recommendation]}
                </span>
              )}
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '20px' }}>{r.summary}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ color: 'var(--brand-green)', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>✅ Strengths</div>
                {(r.strengths || []).map((s, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', display: 'flex', gap: '8px' }}>
                    <span>•</span><span>{s}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ color: '#ff4757', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>📈 Areas to Improve</div>
                {(r.weaknesses || []).map((w, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', display: 'flex', gap: '8px' }}>
                    <span>•</span><span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '0.95rem' }}>📡 Skills Radar</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Radar name="Score" dataKey="A" stroke="var(--brand-purple)" fill="var(--brand-purple)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Analysis */}
        {r.detailedAnalysis && (
          <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>🔍 Detailed Analysis</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{r.detailedAnalysis}</p>
          </div>
        )}

        {/* Question-by-Question */}
        {r.questionAnalysis?.length > 0 && (
          <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>❓ Question Analysis</h3>
            {r.questionAnalysis.map((qa, i) => (
              <div key={i} style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}>Q{i + 1}: {qa.question}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: scoreColor(qa.score), marginLeft: '16px' }}>{qa.score}/100</div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--brand-cyan)' }}>Answer: </strong>{qa.answer}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${scoreColor(qa.score)}` }}>
                  💡 {qa.feedback}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emotion & Integrity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>😊 Emotion Analysis</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.emotionSummary || 'Emotion data analyzed during the session.'}</p>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>🛡️ Integrity Report</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.cheatingAnalysis || 'No integrity issues were detected during this interview.'}</p>
          </div>
        </div>

        {/* Transcript */}
        {transcript?.length > 0 && (
          <div className="glass-card" style={{ padding: '28px', marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>📝 Full Transcript</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transcript.map((t, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', lineHeight: 1.5,
                  background: t.role === 'ai' ? 'rgba(108,71,255,0.1)' : 'rgba(0,212,255,0.08)',
                  borderLeft: `3px solid ${t.role === 'ai' ? 'var(--brand-purple)' : 'var(--brand-cyan)'}`,
                }}>
                  <strong style={{ color: t.role === 'ai' ? 'var(--brand-purple)' : 'var(--brand-cyan)', fontSize: '11px' }}>
                    {t.role === 'ai' ? '🤖 AI' : '👤 Candidate'}
                  </strong>
                  <br />{t.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
