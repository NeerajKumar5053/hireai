import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Peer from 'simple-peer'
import { io } from 'socket.io-client'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function VideoInterviewRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [stream, setStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const myVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    initRoom()
    return () => cleanup()
  }, [])

  const initRoom = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(mediaStream)
      streamRef.current = mediaStream
      if (myVideoRef.current) myVideoRef.current.srcObject = mediaStream

      // Connect socket
      const socket = io('/', { auth: { userId: user._id } })
      socketRef.current = socket

      socket.emit('join_user_room', user._id)
      socket.emit('join_interview_room', { roomId, userId: user._id, userRole: user.role, userName: user.name })

      socket.on('room_participants', (others) => {
        setParticipants(others)
        if (others.length > 0) {
          // Initiate call as the one who joined second
          const targetSocketId = others[0].socketId
          const peer = createPeer(true, targetSocketId, mediaStream, socket)
          peerRef.current = peer
        }
      })

      socket.on('user_joined', ({ socketId, userName }) => {
        toast(`${userName} joined the interview`)
      })

      socket.on('webrtc_offer', ({ offer, from }) => {
        const peer = createPeer(false, from, mediaStream, socket)
        peer.signal(offer)
        peerRef.current = peer
      })

      socket.on('webrtc_answer', ({ answer }) => {
        peerRef.current?.signal(answer)
      })

      socket.on('ice_candidate', ({ candidate }) => {
        peerRef.current?.signal(candidate)
      })

      socket.on('chat_message', (msg) => {
        setChatMessages(prev => [...prev, msg])
      })

      socket.on('user_left', ({ userName }) => {
        toast(`${userName} left the interview`)
        setRemoteStream(null)
        setConnected(false)
      })

      socket.on('interview_ended', () => {
        toast('Interview ended')
        cleanup()
        navigate(-1)
      })

    } catch (e) {
      toast.error('Could not access camera/microphone')
    }
  }

  const createPeer = (initiator, targetSocketId, mediaStream, socket) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: mediaStream,
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
      setRemoteStream(remoteStream)
      setConnected(true)
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
    })

    peer.on('error', (e) => console.error('Peer error:', e))
    peer.on('close', () => setConnected(false))

    return peer
  }

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !audioEnabled)
      setAudioEnabled(!audioEnabled)
      socketRef.current?.emit('toggle_audio', { roomId, enabled: !audioEnabled })
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !videoEnabled)
      setVideoEnabled(!videoEnabled)
      socketRef.current?.emit('toggle_video', { roomId, enabled: !videoEnabled })
    }
  }

  const toggleScreen = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = peerRef.current?._pc?.getSenders?.().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(screenTrack)
        screenTrack.onended = () => toggleScreen()
        setScreenSharing(true)
        socketRef.current?.emit('screen_share_started', { roomId })
      } catch (e) {}
    } else {
      const videoTrack = streamRef.current?.getVideoTracks()[0]
      const sender = peerRef.current?._pc?.getSenders?.().find(s => s.track?.kind === 'video')
      if (sender && videoTrack) sender.replaceTrack(videoTrack)
      setScreenSharing(false)
      socketRef.current?.emit('screen_share_stopped', { roomId })
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    socketRef.current?.emit('chat_message', { roomId, message: chatInput, senderName: user.name })
    setChatMessages(prev => [...prev, { message: chatInput, senderName: 'You', senderId: user._id, timestamp: new Date().toISOString() }])
    setChatInput('')
  }

  const endCall = () => {
    socketRef.current?.emit('end_interview', { roomId })
    cleanup()
    navigate(-1)
  }

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    peerRef.current?.destroy()
    socketRef.current?.disconnect()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="interview-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem' }}>📹</span>
          <div>
            <div style={{ fontWeight: 700 }}>Video Interview</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Room: {roomId?.substring(0, 8)}...</div>
          </div>
          {connected && (
            <span className="badge badge-green" style={{ marginLeft: '8px' }}>🟢 Connected</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setChatOpen(!chatOpen)} className="btn btn-secondary btn-sm">💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}</button>
          <button onClick={endCall} className="btn btn-danger btn-sm">📵 End Call</button>
        </div>
      </div>

      {/* Video Grid */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '20px' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: remoteStream ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {/* My Video */}
          <div className="video-tile" style={{ position: 'relative' }}>
            <video ref={myVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>
              You ({user.role})
            </div>
            {!videoEnabled && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{user?.name?.[0]?.toUpperCase()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Camera Off</div>
                </div>
              </div>
            )}
          </div>

          {/* Remote Video */}
          {remoteStream ? (
            <div className="video-tile">
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>
                Interviewer
              </div>
            </div>
          ) : (
            <div className="video-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <span className="spinner" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Waiting for other participant...</p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            style={{ width: 300, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px' }}>💬 Chat</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px',
                  background: msg.senderId === user._id ? 'rgba(108,71,255,0.2)' : 'rgba(255,255,255,0.05)',
                  alignSelf: msg.senderId === user._id ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{msg.senderName}</div>
                  {msg.message}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
              <input
                className="input" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                style={{ fontSize: '13px', padding: '8px 12px' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">→</button>
            </form>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="video-controls">
        <button onClick={toggleAudio} className={`video-ctrl-btn ${!audioEnabled ? 'danger' : 'active'}`} title={audioEnabled ? 'Mute' : 'Unmute'}>
          {audioEnabled ? '🎙️' : '🔇'}
        </button>
        <button onClick={toggleVideo} className={`video-ctrl-btn ${!videoEnabled ? 'danger' : 'active'}`} title={videoEnabled ? 'Hide Camera' : 'Show Camera'}>
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button onClick={toggleScreen} className={`video-ctrl-btn ${screenSharing ? 'active' : ''}`} title="Share Screen">
          🖥️
        </button>
        <button onClick={endCall} className="video-ctrl-btn end-call" title="End Call">
          📵
        </button>
        <button onClick={() => setChatOpen(!chatOpen)} className={`video-ctrl-btn ${chatOpen ? 'active' : ''}`} title="Chat">
          💬
        </button>
      </div>
    </div>
  )
}
