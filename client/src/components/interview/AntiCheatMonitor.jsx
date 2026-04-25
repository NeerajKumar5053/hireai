import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

// ── Tunable thresholds ────────────────────────────────────────────────────────
const TAB_SWITCH_WARN_AT    = 1     // warn on 1st tab switch (immediate)
const WINDOW_BLUR_WARN_AT   = 1     // warn on 1st window blur  (no grace)
const NO_FACE_SECONDS       = 3     // continuous seconds of missing face before flag (down from 6)
const GAZE_COOLDOWN_MS      = 3000  // min ms between consecutive gaze flags
const GAZE_CHECK_MS         = 1200  // face detection frequency (up from 2000)
const NOSE_OFFSET_RATIO     = 0.14  // head-turn threshold — stricter (down from 0.18)
const LOOK_AWAY_WARN_AT     = 1     // warn on 1st look-away event (down from 3)
const MULTI_FACE_WARN_AT    = 1     // warn immediately on any extra face
const PHONE_SIZE_RATIO      = 0.15  // bounding box < 15% frame width = possible phone
// ─────────────────────────────────────────────────────────────────────────────

export default function AntiCheatMonitor({
  isActive,
  videoRef,
  onCheatEvent,
  onWarning,     // (warningCount: 1|2, reason: string, type: string) => void
  onTerminate,   // (reason: string) => void
  events = [],
}) {
  const [modelsLoaded, setModelsLoaded] = useState(false)

  // All counters live in refs so callbacks don't go stale
  const warningCountRef       = useRef(0)
  const tabSwitchCountRef     = useRef(0)
  const windowBlurCountRef    = useRef(0)
  const noFaceSecCountRef     = useRef(0)
  const multiFaceCountRef     = useRef(0)
  const lookAwayCountRef      = useRef(0)
  const gazeCooldownRef       = useRef(false)
  const animFrameRef          = useRef(null)
  const lastGazeCheckRef      = useRef(0)
  const phoneDetectCoolRef    = useRef(false)
  const issuedWarningRef      = useRef(false) // prevent double-fire per detection cycle

  // ── Load face-api models ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
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
  const issueWarning = useCallback((reason, type = 'generic') => {
    if (issuedWarningRef.current) return // debounce rapid double-fires
    issuedWarningRef.current = true
    setTimeout(() => { issuedWarningRef.current = false }, 2000)

    warningCountRef.current += 1
    const n = warningCountRef.current
    if (n >= 3) {
      onTerminate?.(reason)
    } else {
      onWarning?.(n, reason, type)
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
        issueWarning('You switched to another browser tab', 'tab_switch')
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
        issueWarning('You switched to another application', 'window_blur')
      }
    }
    window.addEventListener('blur', handle)
    return () => window.removeEventListener('blur', handle)
  }, [isActive, onCheatEvent, issueWarning])

  // ── Copy / Paste / Devtools prevention ────────────────────────────────────
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
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.40 }))
            .withFaceLandmarks()

          const videoWidth = video.videoWidth || video.clientWidth || 640

          if (results.length === 0) {
            // ── No face visible ──────────────────────────────────────────────
            noFaceSecCountRef.current += GAZE_CHECK_MS / 1000
            if (noFaceSecCountRef.current >= NO_FACE_SECONDS) {
              noFaceSecCountRef.current = 0
              if (!gazeCooldownRef.current) {
                gazeCooldownRef.current = true
                onCheatEvent?.({ type: 'eyes_away', timestamp: new Date(), details: `Face not visible for ${NO_FACE_SECONDS}+ seconds` })
                lookAwayCountRef.current += 1
                if (lookAwayCountRef.current >= LOOK_AWAY_WARN_AT) {
                  lookAwayCountRef.current = 0
                  issueWarning('You are not looking at the camera / screen', 'eyes_away')
                }
                setTimeout(() => { gazeCooldownRef.current = false }, GAZE_COOLDOWN_MS)
              }
            }
          } else {
            noFaceSecCountRef.current = 0

            // ── Multiple faces ───────────────────────────────────────────────
            if (results.length > 1) {
              multiFaceCountRef.current += 1
              onCheatEvent?.({ type: 'multiple_faces', timestamp: new Date(), details: `${results.length} faces detected` })
              if (multiFaceCountRef.current >= MULTI_FACE_WARN_AT) {
                multiFaceCountRef.current = 0
                issueWarning(`${results.length} persons detected in frame — only the candidate should be visible`, 'multiple_faces')
              }
            } else {
              multiFaceCountRef.current = 0
              const { landmarks, detection } = results[0]
              const pts  = landmarks.positions
              const box  = detection.box

              // ── Phone / small device detection ──────────────────────────
              // If the detected face bounding box is very small relative to frame,
              // it may be a phone being held up (candidate looking at phone)
              const faceWidthRatio = box.width / videoWidth
              if (faceWidthRatio < PHONE_SIZE_RATIO && !phoneDetectCoolRef.current) {
                phoneDetectCoolRef.current = true
                onCheatEvent?.({ type: 'device_suspected', timestamp: new Date(), details: `Face too small (${(faceWidthRatio * 100).toFixed(0)}% of frame) — possible phone use` })
                issueWarning('A mobile device or external screen may be in use', 'device_suspected')
                setTimeout(() => { phoneDetectCoolRef.current = false }, 8000)
              }

              // ── Head pose / gaze direction ───────────────────────────────
              if (!gazeCooldownRef.current) {
                const nose  = pts[30]   // nose tip
                const faceC = box.x + box.width / 2
                const ratio = (nose.x - faceC) / box.width

                // Also check vertical gaze — chin vs nose vertical offset
                const chin     = pts[8]
                const leftEye  = pts[36]
                const rightEye = pts[45]
                const eyeMidY  = (leftEye.y + rightEye.y) / 2
                const noseY    = pts[30].y
                const chinY    = chin.y
                const vertRatio = (noseY - eyeMidY) / Math.max(chinY - eyeMidY, 1)
                // vertRatio < 0.35 means looking down sharply, > 0.85 means looking up

                const lookingLeft  = ratio < -NOSE_OFFSET_RATIO
                const lookingRight = ratio > NOSE_OFFSET_RATIO
                const lookingDown  = vertRatio < 0.32
                const lookingUp    = vertRatio > 0.88

                if (lookingLeft || lookingRight || lookingDown || lookingUp) {
                  gazeCooldownRef.current = true
                  let dir = ''
                  if (lookingLeft)  dir = 'left'
                  if (lookingRight) dir = 'right'
                  if (lookingDown)  dir = 'down'
                  if (lookingUp)    dir = 'up'

                  onCheatEvent?.({ type: 'eyes_away', timestamp: new Date(), details: `Looking ${dir} (h:${(Math.abs(ratio)*100).toFixed(0)}% v:${(vertRatio*100).toFixed(0)}%)` })
                  lookAwayCountRef.current += 1
                  if (lookAwayCountRef.current >= LOOK_AWAY_WARN_AT) {
                    lookAwayCountRef.current = 0
                    issueWarning('You are not looking at the camera — please face the screen', 'eyes_away')
                  }
                  setTimeout(() => { gazeCooldownRef.current = false }, GAZE_COOLDOWN_MS)
                }
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
    const w = {
      tab_switch: 15,
      multiple_faces: 20,
      eyes_away: 8,
      copy_paste: 8,
      window_blur: 8,
      devtools_attempt: 12,
      device_suspected: 20,
    }
    return acc + (w[e.type] ?? 5)
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

      {/* Detection capabilities */}
      {modelsLoaded && (
        <div style={{ fontSize: '10px', color: 'var(--brand-green)', marginBottom: 6 }}>
          ✅ AI vision active
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
