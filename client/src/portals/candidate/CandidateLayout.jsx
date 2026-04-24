import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import NotificationCenter from '../../components/shared/NotificationCenter'

const navItems = [
  { to: '/candidate/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/candidate/jobs', icon: '🔍', label: 'Browse Jobs' },
  { to: '/candidate/applications', icon: '📋', label: 'Applications' },
  { to: '/candidate/practice', icon: '🎯', label: 'Practice Arena' },
  { to: '/candidate/profile', icon: '👤', label: 'My Profile' },
]

export default function CandidateLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-logo">⚡ HireAI</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--grad-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Candidate</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>
      <main className="portal-main">
        <div className="topbar">
          <div />
          <NotificationCenter />
        </div>
        <div className="portal-content"><Outlet /></div>
      </main>
    </div>
  )
}
