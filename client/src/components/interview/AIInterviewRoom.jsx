import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import EmotionMonitor from './EmotionMonitor'
import AntiCheatMonitor from './AntiCheatMonitor'
import CheatWarningOverlay from './CheatWarningOverlay'
import toast from 'react-hot-toast'

const TOTAL_QUESTIONS = 8
const INTERVIEW_DURATION = 30 * 60

// ── WAV Encoder Utility ──────────────────────────────────────────────────────
const encodeWAV = (samples, sampleRate) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? 0x8000 * s : 0x7FFF * s, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}

// Helper: pick best supported audio MIME type
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

// Helper: derive extension from mimeType
function getExtension(mimeType) {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

export default function AIInterviewRoom({ isPractice = false }) {
  const { interviewId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [phase, setPhase] = useState('setup')
  const [transcript, setTranscript] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [aiPhase, setAiPhase] = useState('') // 'transcribing' | 'thinking' | ''
  const [liveTranscript, setLiveTranscript] = useState('') // what Whisper heard
  const [questionNumber, setQuestionNumber] = useState(0)
  const [sessionData, setSessionData] = useState(null)
  const [emotionSnapshots, setEmotionSnapshots] = useState([])
  const [cheatEvents, setCheatEvents] = useState([])
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [job, setJob] = useState(null)
  // Text mode fallback when mic is unavailable
  const [textMode, setTextMode] = useState(false)
  const [textAnswer, setTextAnswer] = useState('')

  // ── Anti-cheat warning system ─────────────────────────────────────────────
  const [warningCount, setWarningCount] = useState(0)
  const [showWarningOverlay, setShowWarningOverlay] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [interviewPaused, setInterviewPaused] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)      // camera+mic stream (for display)
  const audioStreamRef = useRef(null) // dedicated audio-only recording stream
  const mediaRecorderRef = useRef(null) // kept for legacy reference
  const audioContextRef = useRef(null)
  const processorRef = useRef(null)
  const audioInputRef = useRef(null)
  const pcmDataRef = useRef([])
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const transcriptEndRef = useRef(null)
  const transcriptRef = useRef([])    // always-current transcript for async callbacks
  const questionNumRef = useRef(0)
  const synth = window.speechSynthesis

  // Keep refs in sync with state
  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { questionNumRef.current = questionNumber }, [questionNumber])

  // ── Load interview data ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (isPractice) {
        const state = location.state
        if (state?.firstQuestion) {
          const jobInfo = { title: `${state.role} — ${state.skill}`, description: '', difficulty: state.difficulty }
          setJob(jobInfo)
          setCurrentQuestion(state.firstQuestion)
          setQuestionNumber(1)
          questionNumRef.current = 1
          const t0 = [{ role: 'ai', message: state.firstQuestion }]
          setTranscript(t0)
          transcriptRef.current = t0
        }
      } else {
        try {
          const { data } = await api.get(`/candidate/interviews/${interviewId}/join`)
          setJob(data.interview?.job)
          setSessionData(data.interview)
        } catch {
          toast.error('Could not load interview details')
        }
      }
    }
    load()
  }, [interviewId, isPractice])

  // ── Camera init ────────────────────────────────────────────────────────────
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraReady(true)
      setMicReady(true)
      toast.success('Camera & microphone ready! ✅')
    } catch (camErr) {
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        })
        audioStreamRef.current = audioStream
        setMicReady(true)
        toast('Microphone ready (camera not available)', { icon: '🎙️' })
      } catch {
        toast.error('Microphone access is required for the interview. Please allow mic access in browser settings.')
      }
    }
  }

  // ── Camera re-attach fix ───────────────────────────────────────────────────
  // When phase changes (setup → interview) the <video> element remounts in a
  // new DOM position. Re-attach the stream so the feed never goes blank.
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [phase, cameraReady])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'interview') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { handleEndInterview(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Auto-scroll transcript ─────────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.92
    utterance.pitch = 1
    utterance.volume = 1
    const voices = synth.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Samantha') ||
      (v.lang === 'en-US' && v.localService)
    )
    if (preferred) utterance.voice = preferred
    synth.speak(utterance)
  }, [synth])

  // ── Warning / Terminate handlers ───────────────────────────────────────────
  const handleWarning = useCallback((n, reason) => {
    synth.cancel()                    // stop AI speaking
    setWarningCount(n)
    setWarningReason(reason)
    setInterviewPaused(true)
    setShowWarningOverlay(true)
    toast(`⚠️ Warning ${n} of 3: ${reason}`, { duration: 3000 })
  }, [synth])

  const handleTerminate = useCallback((reason) => {
    synth.cancel()
    setWarningCount(3)
    setWarningReason(reason)
    setInterviewPaused(true)
    setShowWarningOverlay(true)
  }, [synth])

  const handleResumeFromWarning = useCallback(() => {
    setShowWarningOverlay(false)
    setInterviewPaused(false)
    // Re-read the current question after a short pause
    setTimeout(() => {
      if (currentQuestion) speakText(currentQuestion)
    }, 600)
  }, [currentQuestion, speakText])

  const handleTerminationComplete = useCallback(() => {
    setShowWarningOverlay(false)
    handleEndInterview()
  }, []) // handleEndInterview defined below — safe via ref scope

  // ── Start interview ────────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    if (!micReady && !isPractice) {
      return toast.error('Please enable your microphone first to continue')
    }
    // For practice, if mic not ready, init it now
    if (!micReady && isPractice) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioStreamRef.current = s
        setMicReady(true)
      } catch {
        toast.error('Microphone access required to record your answers')
        return
      }
    }

    setPhase('interview')

    if (!isPractice && !currentQuestion) {
      setIsAIThinking(true)
      try {
        const { data } = await api.post('/ai/interview/start', {
          jobTitle: job?.title,
          jobDescription: job?.description,
          requirements: job?.requirements,
          skills: job?.skills,
          mode: 'full',
        })
        setCurrentQuestion(data.question)
        setQuestionNumber(1)
        questionNumRef.current = 1
        const t0 = [{ role: 'ai', message: data.question }]
        setTranscript(t0)
        transcriptRef.current = t0
        speakText(data.question)
      } catch {
        toast.error('Failed to start AI interview. Please try again.')
      } finally {
        setIsAIThinking(false)
      }
    } else {
      speakText(currentQuestion)
    }
  }

  // ── Text answer submit (fallback when no mic) ──────────────────────────────
  const submitTextAnswer = async () => {
    const text = textAnswer.trim()
    if (!text) return toast('Please type your answer first', { icon: '✏️' })
    setTextAnswer('')
    await processTextAnswer(text)
  }

  const processTextAnswer = async (candidateText) => {
    setIsAIThinking(true)
    synth.cancel()
    try {
      const updatedTranscript = [
        ...transcriptRef.current,
        { role: 'candidate', message: candidateText },
      ]
      setTranscript(updatedTranscript)
      transcriptRef.current = updatedTranscript

      const currentQNum = questionNumRef.current
      const nextQNum = currentQNum + 1

      const endpoint = isPractice ? '/ai/practice/respond' : '/ai/interview/respond'
      const payload = isPractice
        ? { answer: candidateText, conversationHistory: updatedTranscript, role: job?.title?.split(' — ')[0], skill: location.state?.skill, difficulty: location.state?.difficulty, questionNumber: currentQNum, totalQuestions: TOTAL_QUESTIONS }
        : { answer: candidateText, conversationHistory: updatedTranscript, jobTitle: job?.title, questionNumber: currentQNum, totalQuestions: TOTAL_QUESTIONS }

      const { data: aiData } = await api.post(endpoint, payload, { timeout: 30000 })
      const aiResponse = aiData.response

      const finalTranscript = [...updatedTranscript, { role: 'ai', message: aiResponse }]
      setTranscript(finalTranscript)
      transcriptRef.current = finalTranscript
      setCurrentQuestion(aiResponse)
      setQuestionNumber(nextQNum)
      questionNumRef.current = nextQNum
      speakText(aiResponse)

      if (nextQNum > TOTAL_QUESTIONS) {
        setTimeout(() => handleEndInterview(finalTranscript), 4000)
      }
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsAIThinking(false)
    }
  }

  // ── Voice Recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    pcmDataRef.current = []

    try {
      // Use the existing active stream
      let activeStream = streamRef.current || audioStreamRef.current;
      if (!activeStream || activeStream.getAudioTracks().length === 0) {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        })
        audioStreamRef.current = activeStream
      }

      // Ensure audio track is enabled
      const audioTrack = activeStream.getAudioTracks()[0]
      if (audioTrack) audioTrack.enabled = true

      // Create AudioContext for PCM recording at 16kHz for Whisper
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const source = audioContext.createMediaStreamSource(activeStream)
      audioInputRef.current = source

      // Create ScriptProcessor for raw PCM data
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0)
        pcmDataRef.current.push(new Float32Array(inputBuffer))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
    } catch (err) {
      console.error('Recording error:', err)
      toast('Microphone unavailable — switching to text input mode', { icon: '✏️', duration: 4000 })
      setTextMode(true)
    }
  }

  const stopRecording = () => {
    if (audioContextRef.current && processorRef.current) {
      processorRef.current.disconnect()
      audioInputRef.current.disconnect()
      audioContextRef.current.close()
      setIsRecording(false)

      // Combine all PCM chunks
      const allSamples = []
      pcmDataRef.current.forEach(chunk => {
        allSamples.push(...chunk)
      })

      if (allSamples.length < 8000) { // ~0.5s at 16kHz
        toast('Recording too short — please speak and try again', { icon: '🎙️' })
        return
      }

      // Encode to WAV
      const sampleRate = 16000 // Standard for Whisper
      const wavBlob = encodeWAV(allSamples, sampleRate)
      processAudio(wavBlob, 'audio/wav')
    }
  }

  // ── Process audio ──────────────────────────────────────────────────────────
  const processAudio = async (audioBlob, mimeType) => {
    setIsAIThinking(true)
    setAiPhase('transcribing')
    setLiveTranscript('')
    synth.cancel()

    try {
      // Step 1: Transcribe with Groq Whisper
      const ext = getExtension(mimeType)
      const formData = new FormData()
      formData.append('audio', audioBlob, `response.${ext}`)

      console.log(`[Voice] Sending ${audioBlob.size} bytes (${ext}) to Whisper...`)

      const { data: transcribeData } = await api.post('/ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })

      const candidateText = (transcribeData.transcript || '').trim()
      console.log(`[Voice] Whisper returned: "${candidateText}"`)

      if (!candidateText || candidateText.length < 3) {
        setIsAIThinking(false)
        setAiPhase('')
        toast('Could not understand your answer — please speak clearly into the mic and try again.', {
          icon: '🎙️', duration: 5000,
        })
        return
      }

      // Show the transcription to the user immediately
      setLiveTranscript(candidateText)

      // Add candidate answer to transcript
      const updatedTranscript = [
        ...transcriptRef.current,
        { role: 'candidate', message: candidateText },
      ]
      setTranscript(updatedTranscript)
      transcriptRef.current = updatedTranscript

      const currentQNum = questionNumRef.current
      const nextQNum = currentQNum + 1

      // Step 2: Get AI follow-up
      setAiPhase('thinking')
      const endpoint = isPractice ? '/ai/practice/respond' : '/ai/interview/respond'
      const payload = isPractice
        ? {
            answer: candidateText,
            conversationHistory: updatedTranscript,
            role: job?.title?.split(' — ')[0],
            skill: location.state?.skill,
            difficulty: location.state?.difficulty,
            questionNumber: currentQNum,
            totalQuestions: TOTAL_QUESTIONS,
          }
        : {
            answer: candidateText,
            conversationHistory: updatedTranscript,
            jobTitle: job?.title,
            questionNumber: currentQNum,
            totalQuestions: TOTAL_QUESTIONS,
          }

      const { data: aiData } = await api.post(endpoint, payload, { timeout: 45000 })
      const aiResponse = aiData.response

      const finalTranscript = [...updatedTranscript, { role: 'ai', message: aiResponse }]
      setTranscript(finalTranscript)
      transcriptRef.current = finalTranscript
      setCurrentQuestion(aiResponse)
      setQuestionNumber(nextQNum)
      questionNumRef.current = nextQNum
      setLiveTranscript('') // clear preview
      speakText(aiResponse)

      // End interview after last question
      if (nextQNum > TOTAL_QUESTIONS) {
        setTimeout(() => handleEndInterview(finalTranscript), 4000)
      }
    } catch (err) {
      console.error('Process audio error:', err)
      const msg = err.response?.data?.message || err.message || 'Network error'
      toast.error('Error: ' + msg, { duration: 5000 })
    } finally {
      setIsAIThinking(false)
      setAiPhase('')
    }
  }

  // ── End interview ──────────────────────────────────────────────────────────
  const handleEndInterview = async (finalTranscript = transcriptRef.current) => {
    synth.cancel()
    clearInterval(timerRef.current)
    setPhase('ending')

    // Stop all tracks
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioStreamRef.current?.getTracks().forEach(t => t.stop())

    const toastId = toast.loading('AI is analyzing your interview and generating your report...')

    try {
      const { data } = await api.post('/ai/interview/report', {
        sessionId: sessionData?._id,
        transcript: finalTranscript,
        emotionData: emotionSnapshots,
        cheatEvents,
        jobTitle: job?.title,
        isPractice,
      }, { timeout: 60000 })

      toast.dismiss(toastId)
      toast.success('Your report is ready! 🎉')

      navigate(`/interview/report/${sessionData?._id || 'practice'}`, {
        state: { report: data, transcript: finalTranscript, job, isPractice },
      })
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Report generation failed: ' + (err.response?.data?.message || err.message))
      setPhase('done')
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: SETUP screen
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="interview-room">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 580, width: '100%', textAlign: 'center' }}
          >
            <div className="ai-avatar animate-glow" style={{ margin: '0 auto 32px', width: 100, height: 100, fontSize: '2.5rem' }}>
              🤖
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '12px' }}>
              {isPractice ? '🎓 Practice Interview' : '🤖 AI Interview'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '15px' }}>
              {job?.title || 'Loading…'}
            </p>

            {/* Guidelines */}
            <div style={{
              background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)',
              borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '28px', textAlign: 'left',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--brand-cyan)' }}>📋 Guidelines</div>
              {[
                '🎙️ Click the mic button to record your answer — click again to stop',
                '🔊 The AI will speak each question aloud via your speakers',
                '👁️ Stay in frame for emotion monitoring (optional)',
                '🚫 Do not switch tabs — anti-cheat monitoring is active',
                `📊 ${TOTAL_QUESTIONS} questions total · 30 minutes maximum`,
              ].map((r, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', display: 'flex', gap: '8px' }}>
                  {r}
                </div>
              ))}
            </div>

            {/* Camera Preview */}
            <div style={{
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              border: '2px solid ' + (cameraReady ? 'var(--brand-green)' : 'var(--border)'),
              marginBottom: '20px', aspectRatio: '16/9', background: 'var(--bg-secondary)',
              transition: 'border-color 0.3s',
            }}>
              {cameraReady ? (
                <video ref={videoRef} autoPlay muted playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '3rem' }}>📷</span>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                      {micReady ? '✅ Microphone ready' : 'Enable camera + microphone for best experience'}
                    </p>
                    <button onClick={initCamera} className="btn btn-secondary">
                      {micReady ? '📷 Enable Camera Too' : '🎙️ Enable Microphone & Camera'}
                    </button>
                  </div>
                  {isPractice && !micReady && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Mic will be enabled when you start the interview
                    </p>
                  )}
                </div>
              )}
            </div>

            {micReady && (
              <div style={{
                padding: '10px 20px', borderRadius: 'var(--radius-full)',
                background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                color: 'var(--brand-green)', fontSize: '13px', fontWeight: 600,
                marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                🟢 Microphone ready — you can start the interview
              </div>
            )}

            <motion.button
              className="btn btn-primary btn-lg w-full"
              onClick={handleStartInterview}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ fontSize: '16px' }}
            >
              🚀 Start Interview
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: ENDING screen
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === 'ending' || phase === 'done') {
    return (
      <div className="interview-room" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📊</div>
          <h2 style={{ marginBottom: '12px' }}>Generating Your Report</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: 400 }}>
            AI is analyzing your responses, emotions, and performance…<br />
            This may take up to 30 seconds.
          </p>
          <span className="spinner" style={{ margin: '0 auto' }} />
        </motion.div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: INTERVIEW screen
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="interview-room">
      {/* ── Header ── */}
      <div className="interview-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={`ai-avatar ${isAIThinking || isRecording ? 'speaking' : ''}`} style={{ width: 44, height: 44, fontSize: '1.3rem' }}>
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{isPractice ? 'Practice Interview' : 'AI Interview'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job?.title}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Question</div>
            <div style={{ fontWeight: 800, fontSize: '16px' }}>{questionNumber} / {TOTAL_QUESTIONS}</div>
          </div>
          <div className={`interview-timer ${timeLeft < 300 ? 'warning' : ''}`}>⏱ {formatTime(timeLeft)}</div>
          <button onClick={() => handleEndInterview()} className="btn btn-danger btn-sm">End Interview</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="interview-body">

        {/* Left panel: Camera + monitors */}
        <div style={{
          width: 300, borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', overflowY: 'auto',
        }}>
          {/* Video */}
          <div style={{
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            border: '1px solid var(--border)', aspectRatio: '4/3', background: 'var(--bg-secondary)',
          }}>
            {cameraReady ? (
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '1.5rem' }}>📷</span> Camera Off
              </div>
            )}
          </div>

          {/* Emotion Monitor */}
          {cameraReady && (
            <EmotionMonitor
              videoRef={videoRef}
              isActive={phase === 'interview'}
              onSnapshot={snap => setEmotionSnapshots(prev => [...prev, snap])}
            />
          )}

          {/* Anti-Cheat */}
          <AntiCheatMonitor
            isActive={phase === 'interview' && !interviewPaused}
            videoRef={videoRef}
            onCheatEvent={event => setCheatEvents(prev => [...prev, event])}
            onWarning={handleWarning}
            onTerminate={handleTerminate}
            events={cheatEvents}
          />

          {/* Integrity Score */}
          <div style={{
            padding: '12px 16px', background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>INTEGRITY</div>
            <div style={{
              fontSize: '1.6rem', fontWeight: 800,
              color: cheatEvents.length === 0 ? 'var(--brand-green)' : cheatEvents.length < 3 ? 'var(--brand-orange)' : '#ff4757',
            }}>
              {Math.max(0, 100 - cheatEvents.length * 5)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cheatEvents.length} event(s)</div>
          </div>
        </div>

        {/* Center: Transcript + Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minWidth: 0 }}>
          {/* AI Status Bar */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'rgba(108,71,255,0.04)',
          }}>
            <div className={`ai-avatar ${isAIThinking ? 'speaking' : ''}`} style={{ width: 40, height: 40, fontSize: '1.2rem', flexShrink: 0 }}>🤖</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                {aiPhase === 'transcribing' ? '✍️ Transcribing your voice…'
                  : aiPhase === 'thinking' ? '🤔 AI is analyzing your answer…'
                  : isRecording ? '🎙️ Listening…'
                  : '💬 AI Interviewer'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Powered by LLaMA 3.3-70B · Groq Whisper STT</div>
            </div>
          </div>

          {/* Current Question Banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '16px 20px',
                background: 'rgba(108,71,255,0.08)',
                borderBottom: '1px solid rgba(108,71,255,0.2)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--brand-purple)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Current Question — Q{questionNumber}
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                {currentQuestion || 'Loading first question…'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Transcript */}
          <div className="transcript-area" style={{ flex: 1 }}>
            {transcript.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`transcript-msg ${msg.role}`}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  {msg.role === 'ai' ? '🤖 AI Interviewer' : '👤 You'}
                </div>
                {msg.message}
              </motion.div>
            ))}

            {/* Live transcription preview — shows what Whisper heard */}
            {liveTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: '0 0 4px',
                  padding: '10px 14px',
                  background: 'rgba(0,212,170,0.08)',
                  border: '1px dashed rgba(0,212,170,0.4)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--brand-green)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  ✅ Whisper heard:
                </div>
                <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{liveTranscript}"</span>
              </motion.div>
            )}

            {isAIThinking && (
              <div className="transcript-msg ai" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="spinner spinner-sm" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {aiPhase === 'transcribing' ? 'Transcribing your voice with Whisper…' : 'AI is reading your answer and responding…'}
                </span>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Recording Controls */}
          <div className="recording-controls" style={{ padding: '20px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setTextMode(false)}
                className={`btn btn-sm ${!textMode ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                🎙️ Voice
              </button>
              <button
                onClick={() => setTextMode(true)}
                className={`btn btn-sm ${textMode ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                ✏️ Text
              </button>
            </div>

            {textMode ? (
              /* ── TEXT INPUT MODE ── */
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
                  ✏️ Type your answer below and click Send
                </p>
                <textarea
                  className="textarea"
                  style={{ minHeight: 90, width: '100%', fontSize: '13px', resize: 'vertical', marginBottom: '10px' }}
                  placeholder="Type your answer here…"
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  disabled={isAIThinking}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submitTextAnswer() }
                  }}
                />
                <button
                  id="submit-text-btn"
                  className="btn btn-primary w-full"
                  onClick={submitTextAnswer}
                  disabled={isAIThinking || !textAnswer.trim() || interviewPaused}
                >
                  {isAIThinking ? <span className="spinner spinner-sm" /> : '📤 Send Answer (Ctrl+Enter)'}
                </button>
              </div>
            ) : (
              /* ── VOICE RECORDING MODE ── */
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {isRecording
                    ? '🔴 Recording — press button again to stop'
                    : isAIThinking
                    ? '⏳ AI is processing…'
                    : '🎙️ Press the mic button to record your answer'}
                </p>

                {interviewPaused && (
                  <div style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(255,212,59,0.1)', border: '1px solid rgba(255,212,59,0.35)',
                    color: '#ffd43b', fontSize: '12px', fontWeight: 600, marginBottom: 12,
                  }}>
                    ⏸️ Interview paused — acknowledge the warning to continue
                  </div>
                )}
                <button
                  id="record-btn"
                  className={`record-btn ${isRecording ? 'recording' : 'idle'}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isAIThinking || interviewPaused}
                  title={interviewPaused ? 'Interview paused' : isRecording ? 'Stop Recording' : 'Start Recording'}
                  style={{ cursor: (isAIThinking || interviewPaused) ? 'not-allowed' : 'pointer', opacity: (isAIThinking || interviewPaused) ? 0.4 : 1 }}
                >
                  {isRecording ? '⏹' : '🎙️'}
                </button>

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4757', animation: 'pulse-record 1s infinite' }} />
                    <span style={{ fontSize: '12px', color: '#ff4757', fontWeight: 700, letterSpacing: '1px' }}>RECORDING</span>
                  </motion.div>
                )}

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Your voice is transcribed by Groq Whisper AI
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right panel: Progress */}
        <div style={{ width: 220, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</div>
            <div className="progress-bar" style={{ marginBottom: '8px' }}>
              <div className="progress-fill" style={{ width: `${(questionNumber / TOTAL_QUESTIONS) * 100}%` }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{questionNumber} of {TOTAL_QUESTIONS} questions</div>
          </div>

          {/* Cheat events */}
          {cheatEvents.slice(-5).reverse().map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                padding: '8px 12px', background: 'rgba(255,71,87,0.08)',
                borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,71,87,0.15)',
                fontSize: '11px', color: '#ff4757',
              }}
            >
              ⚠️ {e.type?.replace(/_/g, ' ')}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Anti-cheat warning overlay ── */}
      <CheatWarningOverlay
        visible={showWarningOverlay}
        warningNumber={warningCount}
        reason={warningReason}
        onResume={handleResumeFromWarning}
        onTerminated={handleTerminationComplete}
      />
    </div>
  )
}
