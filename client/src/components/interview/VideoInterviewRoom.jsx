import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Peer from 'simple-peer'
import { io } from 'socket.io-client'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const GRID_STYLES = {
  1: { gridTemplateColumns: '1fr' },
  2: { gridTemplateColumns: '1fr 1fr' },
  3: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }, // 2+1
  4: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
}

function VideoTile({ stream, label, muted = false, isSelf = false, videoOff = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
    }
  }, [stream])

  return (
    <div style={{
      position: 'relative', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', background: '#0a0a10',
      border: '1px solid rgba(255,255,255,0.08)',
      aspectRatio: '16/9',
    }}>
      {stream && !videoOff ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isSelf ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)' }}>
            {label?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            {stream ? 'Camera off' : 'Waiting to connect…'}
          </div>
        </div>
      )}
      {/* Label overlay */}
      <div style={{
        position: 'absolute', bottom: 10, left: 12,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        padding: '4px 12px', borderRadius: 99,
        fontSize: '12px', fontWeight: 600, color: '#fff',
      }}>
        {label}{isSelf ? ' (You)' : ''}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VideoInterviewRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [localStream, setLocalStream] = useState(null)
  const [peers, setPeers] = useState([])   // [{ socketId, stream, name, role }]
  const [participants, setParticipants] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [interviewInfo, setInterviewInfo] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const localStreamRef = useRef(null)
  const socketRef = useRef(null)
  const peersRef = useRef([])
  const timerRef = useRef(null)

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  // ── Init room ──────────────────────────────────────────────────────────────
  useEffect(() => {
    initRoom()
    return () => cleanup()
  }, [])

  const createPeer = useCallback((initiator, targetSocketId, stream, socket) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    })

    peer.on('signal', (signal) => {
      if (initiator) {
        socket.emit('webrtc_offer', { offer: signal, targetSocketId, from: user._id })
      } else {
        socket.emit('webrtc_answer', { answer: signal, targetSocketId })
      }
    })

    peer.on('stream', (remoteStream) => {
      setPeers(prev => {
        const existing = prev.find(p => p.socketId === targetSocketId)
        if (existing) {
          return prev.map(p => p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p)
        }
        return [...prev, { socketId: targetSocketId, stream: remoteStream, name: 'Participant', role: '' }]
      })
      setConnected(true)
    })

    peer.on('error', e => console.error('Peer error:', e))
    peer.on('close', () => {
      setPeers(prev => prev.filter(p => p.socketId !== targetSocketId))
      peersRef.current = peersRef.current.filter(p => p.socketId !== targetSocketId)
    })

    return peer
  }, [user._id])

  const initRoom = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(mediaStream)
      localStreamRef.current = mediaStream

      const socket = io('/', { auth: { userId: user._id } })
      socketRef.current = socket

      socket.emit('join_user_room', user._id)
      socket.emit('join_interview_room', {
        roomId,
        userId: user._id,
        userRole: user.role,
        userName: user.name,
      })

      // Others already in room → initiate peer to each
      socket.on('room_participants', (others) => {
        setParticipants(others)
        others.forEach(other => {
          const peer = createPeer(true, other.socketId, mediaStream, socket)
          peersRef.current.push({ socketId: other.socketId, peer, name: other.userName, role: other.userRole })
          setPeers(prev => {
            if (prev.find(p => p.socketId === other.socketId)) return prev
            return [...prev, { socketId: other.socketId, stream: null, name: other.userName, role: other.userRole }]
          })
        })
      })

      // New participant joined → they will offer to me
      socket.on('user_joined', ({ socketId, userName, userRole }) => {
        toast(`${userName} joined`)
        setPeers(prev => {
          if (prev.find(p => p.socketId === socketId)) return prev
          return [...prev, { socketId, stream: null, name: userName, role: userRole }]
        })
        setParticipants(prev => [...prev, { socketId, userName, userRole }])
      })

      // Incoming offer
      socket.on('webrtc_offer', ({ offer, from, fromUser }) => {
        const peer = createPeer(false, from, mediaStream, socket)
        peer.signal(offer)
        peersRef.current.push({ socketId: from, peer, name: fromUser || 'Participant', role: '' })
      })

      // Answer
      socket.on('webrtc_answer', ({ answer, from }) => {
        const entry = peersRef.current.find(p => p.socketId === from)
        entry?.peer?.signal(answer)
      })

      // ICE
      socket.on('ice_candidate', ({ candidate, from }) => {
        const entry = peersRef.current.find(p => p.socketId === from)
        entry?.peer?.signal(candidate)
      })

      // Chat
      socket.on('chat_message', (msg) => {
        setChatMessages(prev => [...prev, msg])
      })

      // Participant left
      socket.on('user_left', ({ socketId, userName }) => {
        toast(`${userName || 'Participant'} left`)
        const entry = peersRef.current.find(p => p.socketId === socketId)
        entry?.peer?.destroy()
        peersRef.current = peersRef.current.filter(p => p.socketId !== socketId)
        setPeers(prev => prev.filter(p => p.socketId !== socketId))
        setParticipants(prev => prev.filter(p => p.socketId !== socketId))
        if (peersRef.current.length === 0) setConnected(false)
      })

      // Video/audio toggle from remote
      socket.on('participant_video_toggle', ({ socketId, enabled }) => {
        setPeers(prev => prev.map(p => p.socketId === socketId ? { ...p, videoOff: !enabled } : p))
      })

      // Interview ended by host
      socket.on('interview_ended', () => {
        toast('Interview ended by host')
        cleanup()
        navigate(-1)
      })

    } catch (e) {
      toast.error('Could not access camera / microphone. Please allow permissions and refresh.')
    }
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    peersRef.current.forEach(({ peer }) => peer?.destroy())
    socketRef.current?.disconnect()
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !audioEnabled })
      setAudioEnabled(v => !v)
      socketRef.current?.emit('toggle_audio', { roomId, enabled: !audioEnabled })
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !videoEnabled })
      setVideoEnabled(v => !v)
      socketRef.current?.emit('toggle_video', { roomId, enabled: !videoEnabled })
    }
  }

  const toggleScreen = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        peersRef.current.forEach(({ peer }) => {
          const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })
        screenTrack.onended = toggleScreen
        setScreenSharing(true)
      } catch {}
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0]
      peersRef.current.forEach(({ peer }) => {
        const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) sender.replaceTrack(videoTrack)
      })
      setScreenSharing(false)
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    socketRef.current?.emit('chat_message', { roomId, message: chatInput, senderName: user.name })
    setChatMessages(prev => [...prev, {
      message: chatInput, senderName: 'You',
      senderId: user._id, timestamp: new Date().toISOString(),
    }])
    setChatInput('')
  }

  const endCall = () => {
    if (user.role === 'recruiter') {
      socketRef.current?.emit('end_interview', { roomId })
    }
    cleanup()
    navigate(-1)
  }

  // Total tiles = local + remote peers
  const totalTiles = 1 + peers.length
  const gridStyle = GRID_STYLES[Math.min(totalTiles, 4)] || GRID_STYLES[4]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#08080f',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 20px', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '1.1rem' }}>📹</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              Video Interview
              {peers.length > 1 && (
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 99, background: 'rgba(108,71,255,0.25)', color: 'var(--brand-purple)', fontSize: '11px' }}>
                  Panel
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Room: {roomId?.substring(0, 10)}…</div>
          </div>
          {connected && (
            <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,212,170,0.15)', color: 'var(--brand-green)', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(0,212,170,0.25)' }}>
              🟢 Live
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Elapsed timer */}
          <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '15px', color: elapsed > 50 * 60 ? '#ff4757' : 'rgba(255,255,255,0.7)' }}>
            ⏱ {formatTime(elapsed)}
          </div>

          {/* Participants count */}
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            👥 {totalTiles} in call
          </div>

          <button onClick={() => setChatOpen(v => !v)} className="btn btn-secondary btn-sm">
            💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
          </button>

          {user.role === 'recruiter' && (
            <button onClick={endCall} className="btn btn-danger btn-sm">📵 End for Everyone</button>
          )}
          {user.role === 'candidate' && (
            <button onClick={endCall} className="btn btn-secondary btn-sm">🚪 Leave</button>
          )}
        </div>
      </div>

      {/* ── Main area: videos + chat ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Video grid */}
        <div style={{
          flex: 1, display: 'grid', gap: 10, padding: 14,
          alignContent: 'center',
          ...gridStyle,
        }}>
          {/* Local tile */}
          <VideoTile
            stream={localStream}
            label={user.name}
            muted
            isSelf
            videoOff={!videoEnabled}
          />

          {/* Remote tiles */}
          {peers.map(peer => (
            <VideoTile
              key={peer.socketId}
              stream={peer.stream}
              label={peer.name || 'Participant'}
              videoOff={peer.videoOff}
            />
          ))}

          {/* Placeholder when waiting */}
          {peers.length === 0 && (
            <div style={{
              borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 16, aspectRatio: '16/9',
            }}>
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                <span className="spinner" />
              </motion.div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Waiting for other participants to join…
              </p>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(0,0,0,0.35)', overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                💬 Chat
                <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: '13px',
                    background: msg.senderId === user._id ? 'rgba(108,71,255,0.25)' : 'rgba(255,255,255,0.06)',
                    alignSelf: msg.senderId === user._id ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                  }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{msg.senderName}</div>
                    {msg.message}
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 40 }}>No messages yet</div>
                )}
              </div>
              <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message…"
                  style={{ fontSize: '13px', flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm">→</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls bar ───────────────────────────────────────────────────── */}
      <div style={{
        height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        {/* Mic */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute' : 'Unmute'}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: audioEnabled ? 'rgba(255,255,255,0.12)' : '#ff4757',
            color: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.25s',
          }}
        >
          {audioEnabled ? '🎙️' : '🔇'}
        </motion.button>

        {/* Camera */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={toggleVideo}
          title={videoEnabled ? 'Hide Camera' : 'Show Camera'}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: videoEnabled ? 'rgba(255,255,255,0.12)' : '#ff4757',
            color: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.25s',
          }}
        >
          {videoEnabled ? '📹' : '📷'}
        </motion.button>

        {/* Screen share */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={toggleScreen}
          title="Share Screen"
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: screenSharing ? 'var(--brand-purple)' : 'rgba(255,255,255,0.12)',
            color: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          🖥️
        </motion.button>

        {/* Chat toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => setChatOpen(v => !v)}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: chatOpen ? 'var(--brand-cyan)' : 'rgba(255,255,255,0.12)',
            color: chatOpen ? '#000' : '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          💬
        </motion.button>

        {/* End / Leave */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={endCall}
          title={user.role === 'recruiter' ? 'End for Everyone' : 'Leave Call'}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#ff4757', color: '#fff', fontSize: '1.4rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255,71,87,0.5)',
          }}
        >
          📵
        </motion.button>
      </div>
    </div>
  )
}
