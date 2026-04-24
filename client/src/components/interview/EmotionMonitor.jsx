import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

const EMOTION_COLORS = {
  happy: '#00d4aa', sad: '#4dabf7', angry: '#ff4757',
  fearful: '#ff8c47', disgusted: '#868e96', surprised: '#ffd43b', neutral: '#8888aa',
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

export default function EmotionMonitor({ videoRef, isActive, onSnapshot }) {
  const [emotions, setEmotions] = useState({
    happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0, neutral: 0,
  })
  const [dominantEmotion, setDominantEmotion] = useState('neutral')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const animFrameRef = useRef(null)
  const snapshotIntervalRef = useRef(null)
  const lastSnapshotRef = useRef(0)

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch (e) {
        console.warn('Face API models could not be loaded:', e.message)
      }
    }
    loadModels()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(snapshotIntervalRef.current)
    }
  }, [])

  // Detection loop
  useEffect(() => {
    if (!modelsLoaded || !isActive || !videoRef?.current) return

    const detect = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceExpressions()

        if (result?.expressions) {
          setFaceDetected(true)
          const expr = result.expressions

          setEmotions({
            happy: expr.happy || 0,
            sad: expr.sad || 0,
            angry: expr.angry || 0,
            fearful: expr.fearful || 0,
            disgusted: expr.disgusted || 0,
            surprised: expr.surprised || 0,
            neutral: expr.neutral || 0,
          })

          // Dominant emotion
          const dominant = Object.entries(expr).reduce((a, b) => b[1] > a[1] ? b : a)[0]
          setDominantEmotion(dominant)

          // Snapshot every 3 seconds
          const now = Date.now()
          if (now - lastSnapshotRef.current >= 3000 && onSnapshot) {
            lastSnapshotRef.current = now
            onSnapshot({
              timestamp: new Date(),
              emotions: {
                happy: expr.happy, sad: expr.sad, angry: expr.angry,
                fearful: expr.fearful, disgusted: expr.disgusted,
                surprised: expr.surprised, neutral: expr.neutral,
              },
              dominantEmotion: dominant,
              confidence: Math.max(...Object.values(expr)),
            })
          }
        } else {
          setFaceDetected(false)
        }
      } catch (e) {
        // silently skip frame errors
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    // Start after small delay
    const timeout = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(detect)
    }, 1000)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [modelsLoaded, isActive, videoRef, onSnapshot])

  if (!modelsLoaded) {
    return (
      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-lg)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        😊 Loading Emotion AI...
      </div>
    )
  }

  return (
    <div className="emotion-monitor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>😊 EMOTION ANALYSIS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: faceDetected ? 'var(--brand-green)' : '#ff4757',
          }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {faceDetected ? 'Face detected' : 'No face'}
          </span>
        </div>
      </div>

      {/* Dominant emotion */}
      <div style={{ textAlign: 'center', marginBottom: '12px', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Dominant</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: EMOTION_COLORS[dominantEmotion] || 'var(--text-primary)', textTransform: 'capitalize' }}>
          {dominantEmotion}
        </div>
      </div>

      {/* Emotion bars */}
      <div className="emotion-bar-group">
        {Object.entries(emotions).map(([emotion, value]) => (
          <div key={emotion} className="emotion-bar-row">
            <span className="emotion-label" style={{ textTransform: 'capitalize' }}>{emotion}</span>
            <div className="emotion-bar-track">
              <div
                className="emotion-bar-fill"
                style={{
                  width: `${(value * 100).toFixed(1)}%`,
                  background: EMOTION_COLORS[emotion] || 'var(--brand-purple)',
                }}
              />
            </div>
            <span className="emotion-pct">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
