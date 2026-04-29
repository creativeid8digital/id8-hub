'use client'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { supabase, type Brand } from '@/lib/supabase'
import type { ViewName } from '@/app/dashboard/page'
import {
  LayoutGrid, Calendar, FileText, TrendingUp,
  CheckCircle, Code2, Users, LogOut, ChevronDown, ChevronUp
} from 'lucide-react'

const NAV = [
  { id: 'campaigns'   as ViewName, label: 'Campaign Board',    icon: LayoutGrid,  badge: null,  alert: false },
  { id: 'calendar'    as ViewName, label: 'Social Calendar',   icon: Calendar,    badge: 'May', alert: false },
  { id: 'briefs'      as ViewName, label: 'Brief & Asset Hub', icon: FileText,    badge: null,  alert: false },
  { id: 'performance' as ViewName, label: 'Performance',       icon: TrendingUp,  badge: null,  alert: true  },
  { id: 'approvals'   as ViewName, label: 'Approvals',         icon: CheckCircle, badge: '3',   alert: false, danger: true },
  { id: 'dev'         as ViewName, label: 'Dev Projects',      icon: Code2,       badge: null,  alert: false },
]

type Props = {
  activeView: ViewName
  onViewChange: (v: ViewName) => void
  activeBrand: { id: string; name: string; color: string }
  onBrandChange: (b: { id: string; name: string; color: string }) => void
  user: any
}

const s: Record<string, React.CSSProperties> = {
  sidebar: { width:232, minWidth:232, background:'var(--bg-surface)', borderRight:'0.5px solid var(--border-subtle)', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' },
  glow: { position:'absolute', top:0, right:0, width:1, height:'100%', background:'linear-gradient(180deg, transparent 0%, var(--accent) 50%, transparent 100%)', opacity:0.35, pointerEvents:'none' },
  logoArea: { padding:'22px 18px 16px', borderBottom:'0.5px solid var(--border-subtle)', flexShrink:0 },
  logoText: { fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.06em', color:'var(--text-primary)', lineHeight:1 },
  logoSub: { fontSize:10, color:'var(--text-muted)', letterSpacing:'0.14em', textTransform:'uppercase', marginTop:4 },
  brandBtn: { margin:'12px 10px 0', background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)', borderRadius:'var(--radius-sm)', padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all 0.2s' },
  brandDd: { margin:'4px 10px 0', background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)', borderRadius:'var(--radius-sm)', overflow:'hidden' },
  brandOpt: { padding:'9px 12px', fontSize:12, color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderBottom:'0.5px solid var(--border-subtle)', transition:'all 0.15s' },
  secLabel: { padding:'18px 16px 6px', fontSize:9, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.14em', textTransform:'uppercase', flexShrink:0 },
  footer: { marginTop:'auto', padding:12, borderTop:'0.5px solid var(--border-subtle)', flexShrink:0 },
  drivePill: { display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', border:'0.5px solid rgba(34,197,94,0.2)', marginBottom:8 },
  userRow: { display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', border:'0.5px solid var(--border-subtle)', cursor:'pointer' },
}

export default function Sidebar({ activeView, onViewChange, activeBrand, onBrandChange, user }: Props) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [ddOpen, setDdOpen] = useState(false)

  useEffect(() => {
    supabase.from('brands').select('*').then(({ data }) => {
      if (data) setBrands(data)
    })
  }, [])

  return (
    <nav style={s.sidebar}>
      <div style={s.glow} />

      {/* Logo */}
      <div style={s.logoArea}>
        <div style={s.logoText}>ID<span style={{color:'var(--accent-bright)'}}>8</span> HUB</div>
        <div style={s.logoSub}>Agency Workspace</div>
      </div>

      {/* Brand switcher */}
      <button style={s.brandBtn} onClick={() => setDdOpen(v => !v)}>
        <div style={{ width:8, height:8, borderRadius:'50%', background: activeBrand.color, boxShadow:`0 0 8px ${activeBrand.color}66`, flexShrink:0 }} />
        <div style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)', flex:1, textAlign:'left' }}>{activeBrand.name}</div>
        {ddOpen ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
      </button>

      {ddOpen && (
        <div style={s.brandDd}>
          <div
            style={{...s.brandOpt, color: activeBrand.id === '' ? 'var(--accent-bright)' : 'var(--text-secondary)'}}
            onClick={() => { onBrandChange({ id:'', name:'All Brands', color:'#7c3aed' }); setDdOpen(false) }}
          >
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#7c3aed' }} />
            All Brands
          </div>
          {brands.map(b => (
            <div
              key={b.id}
              style={{...s.brandOpt, color: activeBrand.id === b.id ? 'var(--accent-bright)' : 'var(--text-secondary)'}}
              onClick={() => { onBrandChange(b); setDdOpen(false) }}
            >
              <div style={{ width:6, height:6, borderRadius:'50%', background: b.color }} />
              {b.name}
            </div>
          ))}
        </div>
      )}

      {/* Nav */}
      <div style={s.secLabel}>Workspace</div>
      {NAV.map(item => {
        const Icon = item.icon
        const isActive = activeView === item.id
        return (
          <div
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 14px', margin:'1px 8px',
              borderRadius:'var(--radius-sm)', cursor:'pointer',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-subtle)' : 'transparent',
              border: isActive ? '0.5px solid var(--border-subtle)' : '0.5px solid transparent',
              fontSize:13, fontWeight:400,
              position:'relative', userSelect:'none',
              transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {isActive && (
              <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:2, height:'55%', background:'var(--accent-bright)', borderRadius:'0 2px 2px 0', boxShadow:'0 0 8px var(--accent-glow)' }} />
            )}
            <Icon size={15} style={{ opacity: isActive ? 1 : 0.55, color: isActive ? 'var(--accent-bright)' : 'inherit', flexShrink:0 }} />
            <span style={{flex:1}}>{item.label}</span>
            {item.badge && (
              <span style={{
                background: (item as any).danger ? 'rgba(239,68,68,0.15)' : 'var(--accent-subtle)',
                color: (item as any).danger ? '#ef4444' : 'var(--accent-bright)',
                border: `0.5px solid ${(item as any).danger ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                fontSize:10, padding:'2px 7px', borderRadius:100, fontFamily:'monospace',
              }}>{item.badge}</span>
            )}
            {item.alert && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-bright)', boxShadow:'0 0 6px var(--accent-glow)', marginLeft:'auto' }} />}
          </div>
        )
      })}

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.drivePill}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--success)', boxShadow:'0 0 6px var(--success)', animation:'pulse 2s infinite', flexShrink:0 }} />
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Google Drive <span style={{color:'var(--success)'}}>Connected</span></div>
        </div>
        <div style={s.userRow} onClick={() => signOut({ callbackUrl:'/login' })}>
          {user?.image && <img src={user.image} style={{ width:24, height:24, borderRadius:'50%' }} alt="" />}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          </div>
          <LogOut size={12} color="var(--text-muted)" />
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </nav>
  )
}
