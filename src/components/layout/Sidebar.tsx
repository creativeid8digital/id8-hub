'use client'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { supabase, type Brand } from '@/lib/supabase'
import type { ViewName } from '@/app/dashboard/page'
import { ListTodo, Calendar, TrendingUp, CheckCircle, Code2, ChevronDown, ChevronUp, LogOut, Shield, Briefcase, User, BarChart2 } from 'lucide-react'

// All nav items with role visibility
const ALL_NAV: { id: ViewName; label: string; icon: any; badge?: string; danger?: boolean; roles: string[] | 'all' }[] = [
  { id: 'myjobs',      label: 'My Tasks',       icon: User,         roles: ['creative_team','content_writer','publishing_team','performance','tech','creative_head'] },
  { id: 'tasks',       label: 'Task Pipeline',  icon: ListTodo,     roles: 'all' },
  { id: 'calendar',    label: 'Social Calendar',icon: Calendar,     badge: 'May', roles: ['am','publishing_team','content_writer','creative_head'] },
  { id: 'approvals',   label: 'Approvals',      icon: CheckCircle,  badge: undefined, danger: true, roles: ['am','creative_head'] },
  { id: 'performance', label: 'Performance',    icon: TrendingUp,   roles: ['am','performance','creative_head'] },
  { id: 'dev',         label: 'Dev Board',      icon: Code2,        roles: ['tech','am','creative_head'] },
  { id: 'brands',      label: 'Brand Manager',  icon: Briefcase,    roles: ['am','creative_head'] },
  { id: 'reports',     label: 'Team Reports',   icon: BarChart2,    roles: ['admin'] },
  { id: 'admin',       label: 'Admin Panel',    icon: Shield,       roles: ['admin'] },
]

type Props = {
  activeView: ViewName; onViewChange: (v: ViewName) => void
  activeBrand: Brand; onBrandChange: (b: Brand) => void
  user: any; isAdmin: boolean; agencyRole: string | null
}

export default function Sidebar({ activeView, onViewChange, activeBrand, onBrandChange, user, isAdmin, agencyRole }: Props) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [ddOpen, setDdOpen] = useState(false)

  const loadBrands = () => {
    supabase.from('brands').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setBrands(data) })
  }

  useEffect(() => {
    loadBrands()
    const sub = supabase.channel('brands-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, loadBrands)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  // Filter nav by role
  const visibleNav = ALL_NAV.filter(item => {
    if (item.roles === 'all') return true
    if (item.roles.includes('admin') && isAdmin) return true
    if (agencyRole && item.roles.includes(agencyRole)) return true
    return false
  })

  const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    am:              { label: 'Account Manager', color: '#10B981', bg: '#ECFDF5', icon: '🤝' },
    creative_head:   { label: 'Creative Head',   color: '#7C3AED', bg: '#EDE9FE', icon: '👑' },
    creative_team:   { label: 'Creative Team',   color: '#6D28D9', bg: '#EDE9FE', icon: '🎨' },
    content_writer:  { label: 'Content Writer',  color: '#3B82F6', bg: '#EFF6FF', icon: '✍️' },
    publishing_team: { label: 'Publishing',      color: '#EC4899', bg: '#FDF2F8', icon: '📱' },
    performance:     { label: 'Performance',     color: '#F59E0B', bg: '#FFFBEB', icon: '📊' },
    tech:            { label: 'Tech Team',       color: '#06B6D4', bg: '#ECFEFF', icon: '💻' },
  }
  const roleMeta = agencyRole ? ROLE_META[agencyRole] : null

  return (
    <nav style={{ width: 232, minWidth: 232, background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Logo */}
      <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #7C3AED, #9F67F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(124,58,237,0.3)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>ID8</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>ID8 Hub</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Agency Workspace</div>
          </div>
        </div>
      </div>

      {/* Brand switcher */}
      <div style={{ padding: '10px 10px 0' }}>
        <button onClick={() => setDdOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 10, background: '#F5F5F7', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeBrand.color, flexShrink: 0, boxShadow: `0 0 6px ${activeBrand.color}66` }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBrand.name}</span>
          {ddOpen ? <ChevronUp size={11} color="var(--text-muted)" /> : <ChevronDown size={11} color="var(--text-muted)" />}
        </button>

        {ddOpen && (
          <div style={{ marginTop: 4, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
            {[{ id: '', name: 'All Brands', color: '#7C3AED', drive_folder_url: null, created_at: '' }, ...brands].map((b: any) => (
              <div key={b.id} onClick={() => { onBrandChange(b); setDdOpen(false) }}
                style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: activeBrand.id === b.id ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: activeBrand.id === b.id ? 600 : 400, borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
              </div>
            ))}
            <div onClick={() => { onViewChange('brands'); setDdOpen(false) }}
              style={{ padding: '9px 12px', fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              + Manage Brands
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '14px 10px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>Workspace</div>

        {visibleNav.map(item => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const isAdminItem = item.id === 'admin'
          return (
            <div key={item.id} onClick={() => onViewChange(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 10, marginBottom: 1, cursor: 'pointer', background: isActive ? (isAdminItem ? '#FFFBEB' : 'var(--accent-subtle)') : 'transparent', color: isActive ? (isAdminItem ? '#D97706' : 'var(--accent)') : 'var(--text-muted)', fontWeight: isActive ? 600 : 400, fontSize: 13, transition: 'all 0.15s', position: 'relative' }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2.5, background: isAdminItem ? '#F59E0B' : 'var(--accent)', borderRadius: '0 2px 2px 0' }} />}
              <Icon size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, background: item.danger ? '#FEE2E2' : 'var(--accent-light)', color: item.danger ? '#EF4444' : 'var(--accent)', flexShrink: 0 }}>
                  {item.badge}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {/* Role badge */}
        {roleMeta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: roleMeta.bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${roleMeta.color}25` }}>
            <span style={{ fontSize: 14 }}>{roleMeta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: roleMeta.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleMeta.label}</div>
              {isAdmin && <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>★ Admin</div>}
            </div>
          </div>
        )}

        {/* Drive status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: '#ECFDF5', borderRadius: 10, marginBottom: 8, border: '1px solid #A7F3D0' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#065F46', fontWeight: 500 }}>Drive Connected</span>
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
          onClick={() => signOut({ callbackUrl: '/login' })}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          {user?.image
            ? <img src={user.image} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} alt="" />
            : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{user?.name?.[0]}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <LogOut size={12} color="var(--text-muted)" />
        </div>
      </div>
    </nav>
  )
}
