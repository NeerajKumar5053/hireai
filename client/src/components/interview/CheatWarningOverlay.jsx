import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CFG = {
  1: {
    icon: '⚠️',
    label: 'Warning 1 of 3',
    color: '#ffd43b',
    border: 'rgba(255,212,59,0.4)',
    bg: 'rgba(255,212,59,0.07)',
    btn: 'I Understand — Resume Interview',
  },
  2: {
    icon: '🚨',
    label: 'Warning 2 of 3 — Final Chance',
    color: '#ff8c47',
    border: 'rgba(255,140,71,0.5)',
    bg: 'rgba(255,140,71,0.1)',
    btn: 'I Understand — Last Warning',
  },
  3: {
    icon: '🔴',
    label: 'Interview Terminated',
    color: '#ff4757',
    border: 'rgba(255,71,87,0.6)',
    bg: 'rgba(255,71,87,0.12)',
    btn: null,
  },
}

export default function CheatWarningOverlay({ visible, warningNumber, reason, onResume, onTerminated }) {
  const [countdown, setCountdown] = useState(6)
  const cfg = CFG[Math.min(warningNumber, 3)] || CFG[1]
  const isTerminal = warningNumber >= 3

  useEffect(() => {
    if (!visible || !isTerminal) return
    setCountdown(6)
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); onTerminated?.(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [visible, isTerminal, onTerminated])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cheat-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(14px) saturate(0.4)',
            background: 'rgba(0,0,0,0.88)',
          }}
        >
          {/* Pulsing glow bg */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              position: 'absolute', width: 600, height: 600, borderRadius: '50%',
              background: cfg.color, filter: 'blur(130px)', pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ scale: 0.75, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              position: 'relative', maxWidth: 540, width: '92%',
              background: 'linear-gradient(160deg, var(--bg-card) 0%, #0d0d14 100%)',
              border: `2px solid ${cfg.border}`,
              borderRadius: 24, padding: '52px 44px',
              textAlign: 'center',
              boxShadow: `0 0 80px ${cfg.color}28, 0 30px 70px rgba(0,0,0,0.7)`,
            }}
          >
            {/* Animated icon */}
            <motion.div
              animate={isTerminal
                ? { scale: [1, 1.1, 1] }
                : { rotate: [-6, 6, -6, 6, 0] }
              }
              transition={{ duration: 0.55, delay: 0.2, repeat: isTerminal ? Infinity : 0, repeatDelay: 2 }}
              style={{ fontSize: '4.2rem', marginBottom: 20, display: 'block' }}
            >
              {cfg.icon}
            </motion.div>

            {/* Label chip */}
            <div style={{
              display: 'inline-block', padding: '5px 16px',
              borderRadius: 99, border: `1px solid ${cfg.border}`,
              background: cfg.bg, color: cfg.color,
              fontSize: '11px', fontWeight: 800, letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 18,
            }}>
              {cfg.label}
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>
              {isTerminal ? 'Your interview has been terminated' : 'Suspicious Activity Detected'}
            </h2>

            {/* Reason box */}
            <div style={{
              padding: '12px 18px', borderRadius: 12, marginBottom: 24,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              <strong style={{ color: cfg.color }}>Reason: </strong>{reason || 'Integrity violation detected'}
            </div>

            {/* Warning progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  flex: 1, maxWidth: 60, height: 6, borderRadius: 3,
                  background: n <= warningNumber ? cfg.color : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.4s',
                }} />
              ))}
            </div>

            {/* Body text */}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 30, lineHeight: 1.7 }}>
              {isTerminal
                ? `Due to repeated integrity violations, this session has been flagged and terminated. Your report will include this incident. Redirecting in ${countdown}s…`
                : warningNumber === 1
                  ? 'Please ensure you stay on this tab, face the camera directly, and do not consult external resources. The interview is paused until you acknowledge.'
                  : 'This is your FINAL warning. One more violation will immediately terminate this interview and flag your submission.'}
            </p>

            {/* CTA */}
            {!isTerminal ? (
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 6px 28px ${cfg.color}60` }}
                whileTap={{ scale: 0.97 }}
                onClick={onResume}
                style={{
                  width: '100%', padding: '15px 24px',
                  background: cfg.color, color: '#000',
                  border: 'none', borderRadius: 12,
                  fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                  boxShadow: `0 4px 22px ${cfg.color}45`,
                  transition: 'box-shadow 0.2s',
                }}
              >
                {cfg.btn}
              </motion.button>
            ) : (
              <motion.div
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{
                  padding: '14px 24px', borderRadius: 12,
                  background: 'rgba(255,71,87,0.12)',
                  border: '1px solid rgba(255,71,87,0.35)',
                  fontSize: '15px', fontWeight: 700, color: '#ff4757',
                }}
              >
                🔴 Redirecting to report in {countdown}s…
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
