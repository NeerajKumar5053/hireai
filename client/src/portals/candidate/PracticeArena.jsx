import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ROLES = [
  { id: 'frontend', name: 'Frontend Dev', icon: '🌐' },
  { id: 'backend', name: 'Backend Dev', icon: '⚙️' },
  { id: 'fullstack', name: 'Full Stack', icon: '🔥' },
  { id: 'devops', name: 'DevOps', icon: '🚀' },
  { id: 'data-science', name: 'Data Scientist', icon: '📊' },
  { id: 'ml-engineer', name: 'ML Engineer', icon: '🤖' },
  { id: 'product-manager', name: 'Product Manager', icon: '📋' },
  { id: 'ui-ux', name: 'UI/UX Designer', icon: '🎨' },
  { id: 'android', name: 'Android Dev', icon: '📱' },
  { id: 'ios', name: 'iOS Dev', icon: '🍎' },
  { id: 'cloud', name: 'Cloud Engineer', icon: '☁️' },
  { id: 'cybersecurity', name: 'Cybersecurity', icon: '🔒' },
]

const SKILLS = {
  frontend: ['React', 'Vue.js', 'Angular', 'JavaScript', 'CSS', 'TypeScript'],
  backend: ['Node.js', 'Python', 'Java', 'Go', 'REST APIs', 'Databases'],
  fullstack: ['MERN Stack', 'MEAN Stack', 'Django', 'Ruby on Rails'],
  devops: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform'],
  'data-science': ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Pandas'],
  'ml-engineer': ['TensorFlow', 'PyTorch', 'Deep Learning', 'NLP', 'Computer Vision'],
  'product-manager': ['Agile', 'Product Strategy', 'User Research', 'Roadmapping'],
  'ui-ux': ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
  android: ['Kotlin', 'Java', 'Android SDK', 'Jetpack Compose'],
  ios: ['Swift', 'Objective-C', 'UIKit', 'SwiftUI'],
  cloud: ['AWS', 'Azure', 'GCP', 'Infrastructure as Code'],
  cybersecurity: ['Network Security', 'Penetration Testing', 'OWASP', 'Cryptography'],
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

export default function PracticeArena() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [selectedDiff, setSelectedDiff] = useState('intermediate')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/candidate/practice/sessions').then(r => setSessions(r.data.sessions || []))
  }, [])

  const handleStart = async () => {
    if (!selectedRole || !selectedSkill) return toast.error('Please select a role and skill!')
    setLoading(true)
    try {
      const { data } = await api.post('/ai/practice/start', {
        role: selectedRole.name,
        skill: selectedSkill,
        difficulty: selectedDiff,
      })
      navigate(`/interview/practice/${data.sessionId}`, {
        state: { firstQuestion: data.question, role: selectedRole.name, skill: selectedSkill, difficulty: selectedDiff },
      })
    } catch (err) {
      toast.error('Failed to start practice interview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">🎯 Practice <span className="gradient-text">Arena</span></h1>
        <p className="page-subtitle">Sharpen your interview skills with AI-powered mock interviews</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Config Panel */}
        <div>
          {/* Role Selection */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>1. Choose Your Role</h3>
            <div className="practice-role-grid">
              {ROLES.map(role => (
                <motion.div
                  key={role.id}
                  className={`practice-role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedRole(role); setSelectedSkill(null) }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  <div className="practice-role-icon">{role.icon}</div>
                  <div className="practice-role-name">{role.name}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Skill Selection */}
          {selectedRole && (
            <motion.div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>2. Choose a Skill / Topic</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {(SKILLS[selectedRole.id] || []).map(skill => (
                  <motion.button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className="btn btn-sm"
                    style={{
                      background: selectedSkill === skill ? 'var(--grad-brand)' : 'var(--bg-card)',
                      border: `1px solid ${selectedSkill === skill ? 'var(--brand-purple)' : 'var(--border)'}`,
                      color: selectedSkill === skill ? '#fff' : 'var(--text-secondary)',
                    }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  >
                    {skill}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Difficulty */}
          {selectedSkill && (
            <motion.div className="glass-card" style={{ padding: '24px' }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>3. Select Difficulty</h3>
              <div className="difficulty-selector">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-chip ${selectedDiff === d ? `selected ${d}` : ''}`}
                    onClick={() => setSelectedDiff(d)}
                  >
                    {d === 'beginner' ? '🟢' : d === 'intermediate' ? '🟡' : '🔴'} {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Summary + Start */}
        <div>
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px', position: 'sticky', top: '80px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>Interview Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Role:</span>
                <span style={{ fontWeight: 600 }}>{selectedRole?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Topic:</span>
                <span style={{ fontWeight: 600 }}>{selectedSkill || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Difficulty:</span>
                <span className={`badge ${selectedDiff === 'beginner' ? 'badge-green' : selectedDiff === 'intermediate' ? 'badge-orange' : 'badge-red'}`}>
                  {selectedDiff}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Questions:</span>
                <span style={{ fontWeight: 600 }}>~8 questions</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Duration:</span>
                <span style={{ fontWeight: 600 }}>~15-20 mins</span>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              🤖 AI will ask questions, listen to your voice responses, and provide detailed feedback at the end.
            </div>

            <motion.button
              className="btn btn-primary w-full btn-lg"
              onClick={handleStart}
              disabled={!selectedRole || !selectedSkill || loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              {loading ? <span className="spinner spinner-sm" /> : '🚀 Start Practice Interview'}
            </motion.button>
          </div>

          {/* Past Sessions */}
          {sessions.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '14px' }}>Recent Practice Sessions</h3>
              {sessions.slice(0, 5).map(s => (
                <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.practiceRole}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{s.practiceSkill} • {s.practiceDifficulty}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.overallScore && <div className="gradient-text" style={{ fontWeight: 700 }}>{s.overallScore}/100</div>}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{new Date(s.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
