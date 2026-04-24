import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { format } from 'date-fns'

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/auth/notifications')
      setNotifications(data.notifications || [])
      setUnread((data.notifications || []).filter(n => !n.read).length)
    } catch (e) {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markRead = async () => {
    if (unread === 0) return
    await api.put('/auth/notifications/read')
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const typeColors = { success: 'var(--brand-green)', error: '#ff4757', warning: 'var(--brand-orange)', info: 'var(--brand-cyan)' }
  const typeIcons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) markRead() }}
        className="btn btn-ghost btn-icon"
        style={{ position: 'relative', fontSize: '1.1rem' }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 16, height: 16,
            borderRadius: '50%', background: '#ff4757', color: 'white',
            fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</div>
              <button onClick={markRead} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>Mark all read</button>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                🎉 You're all caught up!
              </div>
            ) : (
              notifications.slice(0, 15).map((n, i) => (
                <div
                  key={i}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  style={{ borderLeft: !n.read ? `3px solid ${typeColors[n.type] || 'var(--brand-purple)'}` : 'none' }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px' }}>{typeIcons[n.type] || '🔔'}</span>
                    <div className="notif-item-text">{n.message}</div>
                  </div>
                  {n.createdAt && (
                    <div className="notif-item-time">
                      {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
