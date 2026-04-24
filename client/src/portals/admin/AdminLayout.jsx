import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import NotificationCenter from '../../components/shared/NotificationCenter'

const navItems = [
  { to: '/admin/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/analytics', icon: '📈', label: 'Analytics' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-logo">🛡️ HireAI Admin</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: 'var(--brand-purple)', fontWeight: 600 }}>
            🛡️ Administrator
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>
      <main className="portal-main">
        <div className="topbar">
          <div className="topbar-title">Admin Panel</div>
          <NotificationCenter />
        </div>
        <div className="portal-content"><Outlet /></div>
      </main>
    </div>
  )
}
