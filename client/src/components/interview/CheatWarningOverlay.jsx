import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Per-warning-level configs ──────────────────────────────────────────────
const CFG = {
  1: {
    icon: '⚠️',
    label: 'Warning 1 of 3',
    color: '#ffd43b',
    border: 'rgba(255,212,59,0.4)',
    bg: 'rgba(255,212,59,0.07)',
    btn: 'I Understand — Resume Interview',
    lockSeconds: 4,
  },
  2: {
    icon: '🚨',
    label: 'Warning 2 of 3 — Final Chance',
    color: '#ff8c47',
    border: 'rgba(255,140,71,0.5)',
    bg: 'rgba(255,140,71,0.1)',
    btn: 'I Understand — Last Warning',
    lockSeconds: 5,
  },
  3: {
    icon: '🔴',
    label: 'Interview Terminated',
    color: '#ff4757',
    border: 'rgba(255,71,87,0.6)',
    bg: 'rgba(255,71,87,0.12)',
    btn: null,
    lockSeconds: 6,
  },
}

// ── Violation-type specific messages ──────────────────────────────────────
const VIOLATION_INFO = {
  eyes_away: {
    icon: '👀',
    title: 'Not Looking at Camera',
    detail: 'You must face the camera directly throughout the interview. Looking away repeatedly will result in termination.',
  },
  multiple_faces: {
    icon: '👥',
    title: 'Multiple Persons Detected',
    detail: 'Another person has been detected in the frame. Only the candidate should be visible on camera during the interview.',
  },
  device_suspected: {
    icon: '📱',
    title: 'External Device Detected',
    detail: 'A mobile phone or other device may be in use. All external resources and devices must be put away.',
  },
  tab_switch: {
    icon: '🪟',
    title: 'Browser Tab Switched',
    detail: 'You navigated away from the interview tab. Do not switch tabs or open other browser windows during the interview.',
  },
  window_blur: {
    icon: '🖥️',
    title: 'Application Switch Detected',
    detail: 'You switched to another application. Keep this interview window in focus at all times.',
  },
  copy_paste: {
    icon: '📋',
    title: 'Copy / Paste Attempt',
    detail: 'Copy or paste actions are not permitted during the interview.',
  },
  generic: {
    icon: '🛡️',
    title: 'Integrity Violation',
    detail: 'A suspicious activity has been detected. Please ensure you follow all interview guidelines.',
  },
}

export default function CheatWarningOverlay({ visible, warningNumber, reason, violationType, onResume, onTerminated }) {
  const [lockTimer, setLockTimer] = useState(0)
  const [canDismiss, setCanDismiss] = useState(false)
  const [termCountdown, setTermCountdown] = useState(6)

  const cfg = CFG[Math.min(warningNumber, 3)] || CFG[1]
  const isTerminal = warningNumber >= 3
  const vInfo = VIOLATION_INFO[violationType] || VIOLATION_INFO.generic

  // ── Lock countdown (prevents instant dismissal) ────────────────────────
  useEffect(() => {
    if (!visible || isTerminal) return
    const secs = cfg.lockSeconds || 4
    setLockTimer(secs)
    setCanDismiss(false)
    const id = setInterval(() => {
      setLockTimer(t => {
        if (t <= 1) {
          clearInterval(id)
          setCanDismiss(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [visible, warningNumber]) // re-run when overlay re-appears

  // ── Terminal redirect countdown ────────────────────────────────────────
  useEffect(() => {
    if (!visible || !isTerminal) return
    setTermCountdown(6)
    const id = setInterval(() => {
      setTermCountdown(c => {
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
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(14px) saturate(0.4)',
            background: 'rgba(0,0,0,0.92)',
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
              position: 'relative', maxWidth: 560, width: '94%',
              background: 'linear-gradient(160deg, var(--bg-card) 0%, #0d0d14 100%)',
              border: `2px solid ${cfg.border}`,
              borderRadius: 24, padding: '44px 40px',
              textAlign: 'center',
              boxShadow: `0 0 80px ${cfg.color}28, 0 30px 70px rgba(0,0,0,0.7)`,
            }}
          >
            {/* Violation type icon + main icon */}
            <motion.div
              animate={isTerminal
                ? { scale: [1, 1.1, 1] }
                : { rotate: [-6, 6, -6, 6, 0] }
              }
              transition={{ duration: 0.55, delay: 0.2, repeat: isTerminal ? Infinity : 0, repeatDelay: 2 }}
              style={{ fontSize: '3.5rem', marginBottom: 8, display: 'block' }}
            >
              {vInfo.icon}
            </motion.div>
            <div style={{ fontSize: '2.2rem', marginBottom: 16 }}>{cfg.icon}</div>

            {/* Label chip */}
            <div style={{
              display: 'inline-block', padding: '5px 16px',
              borderRadius: 99, border: `1px solid ${cfg.border}`,
              background: cfg.bg, color: cfg.color,
              fontSize: '11px', fontWeight: 800, letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 14,
            }}>
              {cfg.label}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
              {isTerminal ? 'Interview Terminated' : vInfo.title}
            </h2>

            {/* Violation detail */}
            <div style={{
              padding: '12px 18px', borderRadius: 12, marginBottom: 16,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'left',
            }}>
              <strong style={{ color: cfg.color, display: 'block', marginBottom: 4 }}>
                🔍 Detected: {reason || vInfo.title}
              </strong>
              {vInfo.detail}
            </div>

            {/* Warning progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  flex: 1, maxWidth: 60, height: 6, borderRadius: 3,
                  background: n <= warningNumber ? cfg.color : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.4s',
                }} />
              ))}
            </div>

            {/* Body text */}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
              {isTerminal
                ? `Due to repeated integrity violations, this interview has been flagged and terminated. Your report will include all detected incidents. Redirecting in ${termCountdown}s…`
                : warningNumber === 1
                  ? 'The interview is paused. Please correct the issue and acknowledge below. Continuing violations will result in termination.'
                  : '⚠️ This is your FINAL warning. One more violation will immediately terminate the interview and flag your submission.'}
            </p>

            {/* CTA */}
            {!isTerminal ? (
              <motion.button
                whileHover={canDismiss ? { scale: 1.04, boxShadow: `0 6px 28px ${cfg.color}60` } : {}}
                whileTap={canDismiss ? { scale: 0.97 } : {}}
                onClick={canDismiss ? onResume : undefined}
                style={{
                  width: '100%', padding: '15px 24px',
                  background: canDismiss ? cfg.color : 'rgba(255,255,255,0.1)',
                  color: canDismiss ? '#000' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 12,
                  fontSize: '15px', fontWeight: 800,
                  cursor: canDismiss ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                }}
              >
                {canDismiss
                  ? cfg.btn
                  : `Please wait ${lockTimer}s to acknowledge…`}
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
                🔴 Redirecting to report in {termCountdown}s…
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
