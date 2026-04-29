'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Clock, Shield, TrendingUp, RefreshCw } from 'lucide-react'

type User = {
  id: string; email: string; name: string | null
  agency_role: string | null; is_admin: boolean
  onboarding_complete: boolean; created_at: string
}
type MonthlyHours = {
  user_id: string; user_name: string; agency_role: string
  log_month: string; sessions: number; total_seconds: number; total_hours: number
}

const ROLES = [
  { value: 'am',              label: 'Account Manager'  },
  { value: 'creative_head',   label: 'Creative Head'    },
  { value: 'creative_team',   label: 'Creative Team'    },
  { value: 'content_writer',  label: 'Content Writer'   },
  { value: 'publishing_team', label: 'Publishing Team'  },
  { value: 'performance',     label: 'Performance'      },
  { value: 'tech',            label: 'Tech Team'        },
]

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  am:              { color: '#10B981', bg: '#ECFDF5' },
  creative_head:   { color: '#7C3AED', bg: '#EDE9FE' },
  creative_team:   { color: '#6D28D9', bg: '#EDE9FE' },
  content_writer:  { color: '#3B82F6', bg: '#EFF6FF' },
  publishing_team: { color: '#EC4899', bg: '#FDF2F8' },
  performance:     { color: '#F59E0B', bg: '#FFFBEB' },
  tech:            { color: '#06B6D4', bg: '#ECFEFF' },
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [hours, setHours] = useState<MonthlyHours[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'hours'>('users')
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: usersData }, { data: hoursData }] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('monthly_hours_summary').select('*').eq('log_month', currentMonth).order('total_hours', { ascending: false }),
    ])
    setUsers((usersData as User[]) || [])
    setHours((hoursData as MonthlyHours[]) || [])
    setLoading(false)
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  const updateRole = async (userId: string, role: string) => {
    setUpdatingRole(userId)
    await supabase.from('users').update({ agency_role: role }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, agency_role: role } : u))
    setUpdatingRole(null)
    setSaved(userId)
    setTimeout(() => setSaved(null), 2000)
  }

  const toggleAdmin = async (userId: string, current: boolean) => {
    await supabase.from('users').update({ is_admin: !current }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !current } : u))
  }

  const fmtHours = (secs: number) => (secs / 3600).toFixed(1) + 'h'
  const totalHours = hours.reduce((a, h) => a + (h.total_seconds || 0) / 3600, 0)

  const inputStyle: React.CSSProperties = {
    background: '#F5F5F7', border: '1px solid #E5E5EA', borderRadius: 8,
    padding: '5px 8px', fontSize: 12, color: '#1D1D1F',
    fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 100 }}>
              <Shield size={12} color="#D97706" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>Admin Only</span>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Manage team, roles and time reports</div>
        </div>
        <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, background: '#F5F5F7', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Team Members', value: users.length,                                         icon: <Users size={16} color="#7C3AED" />,     bg: '#EDE9FE' },
          { label: 'Onboarded',    value: users.filter(u => u.onboarding_complete).length,      icon: <Shield size={16} color="#10B981" />,    bg: '#ECFDF5' },
          { label: 'Hours This Month', value: `${totalHours.toFixed(1)}h`,                      icon: <Clock size={16} color="#F59E0B" />,     bg: '#FFFBEB' },
          { label: 'Admins',       value: users.filter(u => u.is_admin).length,                 icon: <TrendingUp size={16} color="#3B82F6" />, bg: '#EFF6FF' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F7', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {(['users', 'hours'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t === 'users' ? '👥 Team Members' : '⏱ Time Reports'}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F7' }}>
                {['Member', 'Role', 'Status', 'Admin', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</td></tr>
              ) : users.map(u => {
                const roleStyle = ROLE_COLORS[u.agency_role || ''] || { color: '#86868B', bg: '#F5F5F7' }
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select value={u.agency_role || ''} onChange={e => updateRole(u.id, e.target.value)} style={{ ...inputStyle, color: roleStyle.color, background: roleStyle.bg, border: 'none', fontWeight: 600 }}>
                          <option value="">No Role</option>
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        {saved === u.id && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Saved ✓</span>}
                        {updatingRole === u.id && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saving…</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: u.onboarding_complete ? '#ECFDF5' : '#FEE2E2', color: u.onboarding_complete ? '#10B981' : '#EF4444' }}>
                        {u.onboarding_complete ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => toggleAdmin(u.id, u.is_admin)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 100, border: 'none', background: u.is_admin ? '#FFFBEB' : '#F5F5F7', color: u.is_admin ? '#D97706' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                        {u.is_admin ? '★ Admin' : '☆ Member'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── HOURS TAB ── */}
      {tab === 'hours' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — Team Hours
          </div>
          {hours.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 16, border: '1.5px dashed var(--border-default)', color: 'var(--text-muted)', fontSize: 13 }}>
              No time logged this month yet.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F5F5F7' }}>
                    {['Team Member', 'Role', 'Sessions', 'Total Hours', 'Progress'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => {
                    const roleStyle = ROLE_COLORS[h.agency_role] || { color: '#86868B', bg: '#F5F5F7' }
                    const pct = Math.min(100, (h.total_hours / 160) * 100)
                    return (
                      <tr key={h.user_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{h.user_name}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: roleStyle.bg, color: roleStyle.color }}>
                            {h.agency_role?.replace('_', ' ') || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{h.sessions}</td>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{h.total_hours.toFixed(1)}h</td>
                        <td style={{ padding: '14px 16px', minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#F5F5F7', borderRadius: 100, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), #9F67F7)', borderRadius: 100 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
