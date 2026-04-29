'use client'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { supabase, type Brand } from '@/lib/supabase'
import type { ViewName } from '@/app/dashboard/page'
import { ListTodo, Calendar, FileText, TrendingUp, CheckCircle, Code2, ChevronDown, ChevronUp, LogOut, Clock, Shield } from 'lucide-react'

const NAV = [
  { id: 'tasks'       as ViewName, label: 'Task Pipeline',   icon: ListTodo,    badge: null,  danger: false, adminOnly: false },
  { id: 'briefs'      as ViewName, label: 'Brief Hub',       icon: FileText,    badge: null,  danger: false, adminOnly: false },
  { id: 'calendar'    as ViewName, label: 'Social Calendar', icon: Calendar,    badge: 'May', danger: false, adminOnly: false },
  { id: 'approvals'   as ViewName, label: 'Approvals',       icon: CheckCircle, badge: '3',   danger: true,  adminOnly: false },
  { id: 'performance' as ViewName, label: 'Performance',     icon: TrendingUp,  badge: null,  danger: false, adminOnly: false },
  { id: 'time'        as ViewName, label: 'Time Tracker',    icon: Clock,       badge: null,  danger: false, adminOnly: false },
  { id: 'dev'         as ViewName, label: 'Dev Projects',    icon: Code2,       badge: null,  danger: false, adminOnly: false },
  { id: 'admin'       as ViewName, label: 'Admin Panel',     icon: Shield,      badge: null,  danger: false, adminOnly: true  },
]

type Props = {
  activeView: ViewName; onViewChange: (v: ViewName) => void
  activeBrand: Brand; onBrandChange: (b: Brand) => void
  user: any; isAdmin: boolean
}

export default function Sidebar({ activeView, onViewChange, activeBrand, onBrandChange, user, isAdmin }: Props) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [ddOpen, setDdOpen] = useState(false)

  useEffect(() => {
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
  }, [])

  const visibleNav = NAV.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav style={{ width: 240, minWidth: 240, background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #9F67F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.25)', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>ID8</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>ID8 Hub</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Agency Workspace</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 12px 0' }}>
        <button onClick={() => setDdOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: '#F5F5F7', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeBrand.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{activeBrand.name}</span>
          {ddOpen ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
        </button>
        {ddOpen && (
          <div style={{ marginTop: 4, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            {[{ id: '', name: 'All Brands', color: '#7C3AED', drive_folder_url: null, created_at: '' }, ...brands].map((b: any) => (
              <div key={b.id} onClick={() => { onBrandChange(b); setDdOpen(false) }}
                style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: activeBrand.id === b.id ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: activeBrand.id === b.id ? 600 : 400, borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />{b.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 12px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>Workspace</div>
        {visibleNav.map(item => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const isAdminItem = item.id === 'admin'
          return (
            <div key={item.id} onClick={() => onViewChange(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 12, marginBottom: 2, cursor: 'pointer', background: isActive ? (isAdminItem ? '#FFFBEB' : 'var(--accent-subtle)') : 'transparent', color: isActive ? (isAdminItem ? '#D97706' : 'var(--accent)') : 'var(--text-muted)', fontWeight: isActive ? 600 : 400, fontSize: 13, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: item.danger ? '#FEE2E2' : 'var(--accent-light)', color: item.danger ? '#EF4444' : 'var(--accent)' }}>{item.badge}</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#ECFDF5', borderRadius: 10, marginBottom: 8, border: '1px solid #A7F3D0' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#065F46', fontWeight: 500 }}>Google Drive Connected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s' }}
          onClick={() => signOut({ callbackUrl: '/login' })}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F5F7'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          {user?.image
            ? <img src={user.image} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} alt="" />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{user?.name?.[0]}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <LogOut size={13} color="var(--text-muted)" />
        </div>
      </div>
    </nav>
  )
}
