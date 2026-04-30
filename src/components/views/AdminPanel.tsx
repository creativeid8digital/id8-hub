'use client'
import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'

type User = {
  id: string; name: string; email: string; agency_role: string | null
  is_admin: boolean; onboarding_complete: boolean; avatar_url: string | null; created_at: string
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

const inp: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 8,
  padding: '7px 10px', fontSize: 12, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none',
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inviteLink = typeof window !== 'undefined' ? window.location.origin : 'https://hub.id8.digital'

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateUser = async (id: string, agency_role: string, is_admin: boolean) => {
    setSaving(id)
    await fetch('/api/admin', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, agency_role, is_admin })
    })
    setSaving(null)
    load()
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const active   = users.filter(u => u.onboarding_complete)
  const pending  = users.filter(u => !u.onboarding_complete)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Manage team members, roles and access</div>
        </div>
      </div>

      {/* Invite section */}
      <div style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)', borderRadius: 20, padding: 24, marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>📨 Invite Team Members</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          Share this link with your team. They sign in with Google and pick their role.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inviteLink}
          </div>
          <button onClick={copyInvite}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 100, background: '#fff', color: '#7C3AED', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, transition: 'all 0.2s' }}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Members', value: users.length, color: 'var(--accent)', icon: '👥' },
          { label: 'Active',        value: active.length, color: '#10B981', icon: '✅' },
          { label: 'Pending Setup', value: pending.length, color: '#F59E0B', icon: '⏳' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Team table */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading team…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 80px', background: '#F5F5F7', borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px', gap: 0 }}>
            {['Member', 'Role', 'Admin', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
            ))}
          </div>

          {users.map(user => {
            const rc = ROLE_COLORS[user.agency_role || ''] || { color: '#86868B', bg: '#F5F5F7' }
            return (
              <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 80px', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', gap: 0 }}>
                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: rc.color, flexShrink: 0 }}>
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                </div>

                {/* Role dropdown */}
                <select style={inp} value={user.agency_role || ''} disabled={saving === user.id}
                  onChange={e => updateUser(user.id, e.target.value, user.is_admin)}>
                  <option value="">No role</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>

                {/* Admin toggle */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={user.is_admin} onChange={e => updateUser(user.id, user.agency_role || '', e.target.checked)} disabled={saving === user.id} />
                    <span style={{ fontSize: 12, color: user.is_admin ? 'var(--accent)' : 'var(--text-muted)', fontWeight: user.is_admin ? 600 : 400 }}>
                      {user.is_admin ? 'Yes' : 'No'}
                    </span>
                  </label>
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: user.onboarding_complete ? '#ECFDF5' : '#FFFBEB', color: user.onboarding_complete ? '#10B981' : '#D97706' }}>
                    {user.onboarding_complete ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>
            )
          })}

          {users.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No team members yet. Share the invite link above.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
