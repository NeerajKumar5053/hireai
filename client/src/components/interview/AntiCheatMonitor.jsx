import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

// ── Tunable thresholds ────────────────────────────────────────────────────────
const TAB_SWITCH_WARN_AT    = 1   // warn on 1st tab switch
const WINDOW_BLUR_WARN_AT   = 2   // warn on 2nd window-blur (1 grace)
const EYES_AWAY_WARN_AT     = 3   // warn after 3 gaze-away events
const MULTI_FACE_WARN_AT    = 1   // warn immediately on multiple faces
const NO_FACE_SECONDS       = 6   // continuous seconds of missing face before flag
const GAZE_COOLDOWN_MS      = 4000 // seconds between consecutive gaze flags
const GAZE_CHECK_MS         = 2000 // how often to run face detection
const NOSE_OFFSET_RATIO     = 0.18 // head-turn threshold (% of face width)
// ─────────────────────────────────────────────────────────────────────────────

export default function AntiCheatMonitor({
  isActive,
  videoRef,
  onCheatEvent,
  onWarning,     // (warningCount: 1|2, reason: string) => void
  onTerminate,   // (reason: string) => void
  events = [],
}) {
  const [modelsLoaded, setModelsLoaded] = useState(false)

  // All counters live in refs so callbacks don't go stale
  const warningCountRef       = useRef(0)
  const tabSwitchCountRef     = useRef(0)
  const windowBlurCountRef    = useRef(0)
  const eyesAwayCountRef      = useRef(0)
  const multiFaceCountRef     = useRef(0)
  const noFaceSecCountRef     = useRef(0)
  const gazeCooldownRef       = useRef(false)
  const animFrameRef          = useRef(null)
  const lastGazeCheckRef      = useRef(0)

  // ── Load face-api models (shared with EmotionMonitor — cached globally) ────
  useEffect(() => {
    const load = async () => {
      try {
        // Only load if not already loaded by EmotionMonitor
        if (!faceapi.nets.ssdMobilenetv1.params) {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        }
        if (!faceapi.nets.faceLandmark68Net.params) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        }
        setModelsLoaded(true)
      } catch (e) {
        console.warn('AntiCheat: face models unavailable —', e.message)
      }
    }
    load()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  // ── Central warning issuer ─────────────────────────────────────────────────
  const issueWarning = useCallback((reason) => {
    warningCountRef.current += 1
    const n = warningCountRef.current
    if (n >= 3) {
      onTerminate?.(reason)
    } else {
      onWarning?.(n, reason)
    }
  }, [onWarning, onTerminate])

  // ── Tab visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const handle = () => {
      if (!document.hidden) return
      tabSwitchCountRef.current += 1
      const n = tabSwitchCountRef.current
      onCheatEvent?.({ type: 'tab_switch', timestamp: new Date(), details: `Tab switch #${n}` })
      if (n >= TAB_SWITCH_WARN_AT) {
        tabSwitchCountRef.current = 0
        issueWarning('You switched to another browser tab')
      }
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [isActive, onCheatEvent, issueWarning])

  // ── Window blur (Alt-Tab / app switch) ────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const handle = () => {
      windowBlurCountRef.current += 1
      const n = windowBlurCountRef.current
      onCheatEvent?.({ type: 'window_blur', timestamp: new Date(), details: `Window blur #${n}` })
      if (n >= WINDOW_BLUR_WARN_AT) {
        windowBlurCountRef.current = 0
        issueWarning('You switched to another application')
      }
    }
    window.addEventListener('blur', handle)
    return () => window.removeEventListener('blur', handle)
  }, [isActive, onCheatEvent, issueWarning])

  // ── Copy / Paste / Devtools prevention ───────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const copy    = (e) => { e.preventDefault(); onCheatEvent?.({ type: 'copy_paste', timestamp: new Date(), details: 'Copy attempt' }) }
    const paste   = (e) => { e.preventDefault(); onCheatEvent?.({ type: 'copy_paste', timestamp: new Date(), details: 'Paste attempt' }) }
    const ctx     = (e) => e.preventDefault()
    const keydown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
        onCheatEvent?.({ type: 'devtools_attempt', timestamp: new Date(), details: e.key })
      }
    }
    document.addEventListener('copy', copy)
    document.addEventListener('paste', paste)
    document.addEventListener('contextmenu', ctx)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('copy', copy)
      document.removeEventListener('paste', paste)
      document.removeEventListener('contextmenu', ctx)
      document.removeEventListener('keydown', keydown)
    }
  }, [isActive, onCheatEvent])

  // ── Face / Gaze detection loop ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !modelsLoaded || !videoRef?.current) return

    const detect = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2 || !isActive) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const now = Date.now()
      if (now - lastGazeCheckRef.current >= GAZE_CHECK_MS) {
        lastGazeCheckRef.current = now
        try {
          const results = await faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
            .withFaceLandmarks()

          if (results.length === 0) {
            // No face visible — accumulate
            noFaceSecCountRef.current += GAZE_CHECK_MS / 1000
            if (noFaceSecCountRef.current >= NO_FACE_SECONDS) {
              noFaceSecCountRef.current = 0
              if (!gazeCooldownRef.current) {
                gazeCooldownRef.current = true
                onCheatEvent?.({ type: 'eyes_away', timestamp: new Date(), details: 'Face not visible for 6+ seconds' })
                eyesAwayCountRef.current += 1
                if (eyesAwayCountRef.current >= EYES_AWAY_WARN_AT) {
                  eyesAwayCountRef.current = 0
                  issueWarning('You repeatedly looked away from the camera')
                }
                setTimeout(() => { gazeCooldownRef.current = false }, GAZE_COOLDOWN_MS)
              }
            }
          } else {
            noFaceSecCountRef.current = 0

            // ── Multiple faces ──────────────────────────────────────────────
            if (results.length > 1) {
              multiFaceCountRef.current += 1
              onCheatEvent?.({ type: 'multiple_faces', timestamp: new Date(), details: `${results.length} faces detected` })
              if (multiFaceCountRef.current >= MULTI_FACE_WARN_AT) {
                multiFaceCountRef.current = 0
                issueWarning('Another person was detected in the frame')
              }
            } else {
              multiFaceCountRef.current = 0

              // ── Head pose / gaze ────────────────────────────────────────
              const { landmarks, detection } = results[0]
              const pts   = landmarks.positions
              const box   = detection.box
              const nose  = pts[30]  // Nose tip (68-point model)
              const faceC = box.x + box.width / 2
              const ratio = (nose.x - faceC) / box.width

              if (Math.abs(ratio) > NOSE_OFFSET_RATIO && !gazeCooldownRef.current) {
                gazeCooldownRef.current = true
                const dir = ratio > 0 ? 'right' : 'left'
                onCheatEvent?.({ type: 'eyes_away', timestamp: new Date(), details: `Looking ${dir} (${(Math.abs(ratio)*100).toFixed(0)}% offset)` })
                eyesAwayCountRef.current += 1
                if (eyesAwayCountRef.current >= EYES_AWAY_WARN_AT) {
                  eyesAwayCountRef.current = 0
                  issueWarning('You repeatedly looked away from the camera')
                }
                setTimeout(() => { gazeCooldownRef.current = false }, GAZE_COOLDOWN_MS)
              }
            }
          }
        } catch { /* skip frame */ }
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    const boot = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(detect)
    }, 1500)

    return () => {
      clearTimeout(boot)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, modelsLoaded, videoRef, onCheatEvent, issueWarning])

  // ── Score ─────────────────────────────────────────────────────────────────
  const score = Math.max(0, 100 - events.reduce((acc, e) => {
    const w = { tab_switch: 12, multiple_faces: 18, eyes_away: 6, copy_paste: 8, window_blur: 5, devtools_attempt: 10 }
    return acc + (w[e.type] ?? 3)
  }, 0))
  const scoreColor = score >= 80 ? 'var(--brand-green)' : score >= 50 ? 'var(--brand-orange)' : '#ff4757'
  const warnCount  = warningCountRef.current

  return (
    <div style={{
      padding: '14px', borderRadius: 'var(--radius-lg)',
      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>🛡️ INTEGRITY</div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: scoreColor }}>{score}%</div>
      </div>

      {/* Score bar */}
      <div className="progress-bar" style={{ marginBottom: 10 }}>
        <div style={{ height: '100%', borderRadius: 4, background: scoreColor, width: `${score}%`, transition: 'width 0.5s' }} />
      </div>

      {/* Warning dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: n <= warnCount
              ? (n === 3 ? '#ff4757' : n === 2 ? 'var(--brand-orange)' : '#ffd43b')
              : 'rgba(255,255,255,0.1)',
            transition: 'background 0.4s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {warnCount === 0 ? '✅ No warnings' : `⚠️ ${warnCount}/3 warnings`}
      </div>

      {/* Face models status */}
      {!modelsLoaded && (
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: 6 }}>
          👁️ Loading vision AI…
        </div>
      )}

      {/* Recent events */}
      {events.length === 0 ? (
        <div style={{ fontSize: '11px', color: 'var(--brand-green)' }}>✅ No issues detected</div>
      ) : (
        <div style={{ maxHeight: 80, overflowY: 'auto' }}>
          {events.slice(-4).map((e, i) => (
            <div key={i} style={{ fontSize: '10px', color: '#ff4757', padding: '2px 0', display: 'flex', gap: 4 }}>
              <span>⚠️</span>
              <span>{e.type?.replace(/_/g, ' ')} — {new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
