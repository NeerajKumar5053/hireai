import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const features = [
  { icon: '🤖', title: 'AI-Powered Interviews', desc: 'LLaMA 3.3-70B conducts intelligent, context-aware interviews that adapt to each candidate\'s responses in real time.' },
  { icon: '🎙️', title: 'Voice-to-AI Pipeline', desc: 'Candidates speak naturally. Groq Whisper transcribes instantly with 99% accuracy, sent to AI for analysis.' },
  { icon: '😊', title: 'Emotion Intelligence', desc: 'Real-time facial emotion analysis tracks confidence, anxiety, and engagement throughout the interview.' },
  { icon: '🛡️', title: 'Anti-Cheat System', desc: 'Multi-layer integrity monitoring — tab switching, gaze tracking, multiple faces, and audio anomaly detection.' },
  { icon: '📹', title: 'Live Video Interviews', desc: 'WebRTC-powered P2P video calls with screen sharing, in-call chat, and recording capabilities.' },
  { icon: '🎯', title: 'Practice Arena', desc: 'Candidates practice mock interviews by role, skill, and difficulty — with instant AI feedback.' },
]

const stats = [
  { value: '10x', label: 'Faster Hiring' },
  { value: '98%', label: 'Accuracy Rate' },
  { value: '500+', label: 'Companies Hiring' },
  { value: '50k+', label: 'Interviews Done' },
]

export default function Landing() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleGetStarted = () => {
    if (user) navigate(`/${user.role}/dashboard`)
    else navigate('/register')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav className="landing-nav" style={{ boxShadow: scrolled ? 'var(--shadow-md)' : 'none' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>
          <span className="gradient-text">Hire</span>
          <span style={{ color: 'var(--text-primary)' }}>AI</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>Features</a>
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>How It Works</a>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/${user.role}/dashboard`)}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        {/* Floating orbs */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,71,255,0.15) 0%, transparent 70%)',
          top: '20%', left: '-100px', animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
          bottom: '20%', right: '-50px', animation: 'float 8s ease-in-out infinite 2s',
        }} />

        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="hero-badge">
            ✨ Powered by LLaMA 3.3-70B & Groq Whisper
          </div>

          <h1 className="hero-title">
            The Future of{' '}
            <span className="gradient-text">AI-Powered</span>
            <br />Hiring is Here
          </h1>

          <p className="hero-subtitle">
            HireAI automates your interview process with cutting-edge AI — from intelligent voice interviews and
            real-time emotion analysis to anti-cheat monitoring and instant performance reports.
          </p>

          <div className="hero-cta">
            <motion.button
              className="btn btn-primary btn-lg"
              onClick={handleGetStarted}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              🚀 Start Hiring with AI
            </motion.button>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In →
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '60px', flexWrap: 'wrap' }}>
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2>Everything You Need to <span className="gradient-text">Hire Smarter</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px', maxWidth: 500, margin: '12px auto 0' }}>
            A complete platform for recruiters and candidates powered by state-of-the-art AI
          </p>
        </div>

        <div className="features-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="feature-icon" style={{ background: ['var(--grad-brand)', 'var(--grad-pink)', 'var(--grad-green)', 'linear-gradient(135deg, #ff4757, #ff8c47)', 'var(--grad-orange)', 'var(--grad-green)'][i] }}>
                {f.icon}
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '80px 60px', background: 'rgba(13,13,35,0.5)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '50px' }}>How <span className="gradient-text">HireAI</span> Works</h2>
          {[
            { step: '01', title: 'Recruiter Posts a Job', desc: 'Create a job posting with requirements, and configure AI or video interview settings.' },
            { step: '02', title: 'AI Screens & Schedules', desc: 'Candidates apply, get matched with a score, and receive an interview invite.' },
            { step: '03', title: 'AI Conducts the Interview', desc: 'Candidate speaks, Whisper transcribes, LLaMA analyses and asks follow-ups — all in real time.' },
            { step: '04', title: 'Get Instant Reports', desc: 'Recruiter receives a full report: scores, emotion charts, integrity analysis, and hire recommendation.' },
          ].map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '40px', textAlign: 'left' }}
            >
              <div style={{
                minWidth: 56, height: 56, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                fontSize: '14px', background: 'var(--grad-brand)',
              }}>{step.step}</div>
              <div>
                <h3 style={{ marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '80px 60px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 700, margin: '0 auto',
            padding: '60px', borderRadius: 32,
            background: 'linear-gradient(135deg, rgba(108,71,255,0.2), rgba(0,212,255,0.1))',
            border: '1px solid rgba(108,71,255,0.3)',
          }}
        >
          <h2 style={{ marginBottom: '16px' }}>Ready to Transform Your Hiring?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Join hundreds of companies using HireAI to find the best talent 10x faster.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register?role=recruiter" className="btn btn-primary btn-lg">Post a Job Free</Link>
            <Link to="/register?role=candidate" className="btn btn-secondary btn-lg">Find Your Dream Job</Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 60px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
          <span className="gradient-text">Hire</span><span>AI</span>
        </div>
        <p>© 2024 HireAI. Powered by Groq LLaMA 3.3-70B & Whisper.</p>
      </footer>
    </div>
  )
}
