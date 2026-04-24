import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import NotificationCenter from '../../components/shared/NotificationCenter'

const navItems = [
  { to: '/recruiter/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/recruiter/jobs', icon: '💼', label: 'My Jobs' },
  { to: '/recruiter/jobs/create', icon: '➕', label: 'Post a Job' },
  { to: '/recruiter/applicants', icon: '👥', label: 'Applicants' },
  { to: '/recruiter/schedule', icon: '📅', label: 'Schedule Interview' },
]

export default function RecruiterLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div className="sidebar-logo">⚡ HireAI</div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to} to={item.to}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.company}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="portal-main">
        {/* Topbar */}
        <div className="topbar">
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!user?.isVerified && (
              <div style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'rgba(255,140,71,0.15)', border: '1px solid rgba(255,140,71,0.3)', fontSize: '12px', color: 'var(--brand-orange)' }}>
                ⚠️ Pending Verification
              </div>
            )}
            <NotificationCenter />
          </div>
        </div>

        <div className="portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
