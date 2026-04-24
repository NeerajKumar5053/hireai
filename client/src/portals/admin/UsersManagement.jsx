import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  const fetchUsers = () => {
    setLoading(true)
    api.get(`/admin/users?role=${roleFilter}&search=${search}`)
      .then(r => { setUsers(r.data.users || []); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [roleFilter, search])

  const suspend = async (id) => {
    await api.put(`/admin/users/${id}/suspend`)
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: false } : u))
    toast.success('User suspended')
  }
  const activate = async (id) => {
    await api.put(`/admin/users/${id}/activate`)
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: true } : u))
    toast.success('User activated')
  }
  const verify = async (id) => {
    await api.put(`/admin/recruiters/${id}/verify`)
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isVerified: true } : u))
    toast.success('Recruiter verified')
  }
  const remove = async (id) => {
    if (!confirm('Delete this user permanently?')) return
    await api.delete(`/admin/users/${id}`)
    setUsers(prev => prev.filter(u => u._id !== id))
    toast.success('User deleted')
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="page-title">👥 <span className="gradient-text">Users</span></h1>
        <p className="page-subtitle">{total} total users</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input className="input" style={{ maxWidth: 300 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="recruiter">Recruiter</option>
          <option value="candidate">Candidate</option>
        </select>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><span className="spinner" /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Company/Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                  </td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'recruiter' ? 'badge-orange' : 'badge-green'}`}>{u.role}</span></td>
                  <td style={{ fontSize: '13px' }}>
                    {u.role === 'recruiter' ? u.company : new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                      {u.role === 'recruiter' && !u.isVerified && <span className="badge badge-orange">Unverified</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {u.role === 'recruiter' && !u.isVerified && (
                        <button onClick={() => verify(u._id)} className="btn btn-sm btn-success">✅ Verify</button>
                      )}
                      {u.isActive
                        ? <button onClick={() => suspend(u._id)} className="btn btn-sm" style={{ color: 'var(--brand-orange)', background: 'rgba(255,140,71,0.1)', border: '1px solid rgba(255,140,71,0.2)' }}>⏸ Suspend</button>
                        : <button onClick={() => activate(u._id)} className="btn btn-sm btn-success">▶ Activate</button>
                      }
                      {u.role !== 'admin' && (
                        <button onClick={() => remove(u._id)} className="btn btn-sm" style={{ color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>🗑️</button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
