'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const ROLES = [
  { key:'am',              label:'Account Manager',  icon:'🤝', desc:'Own client relationships, write briefs, manage timelines.',         color:'#22c55e' },
  { key:'creative_head',   label:'Creative Head',    icon:'👑', desc:'Approve all creative output. Final gatekeeper before delivery.',    color:'#a855f7' },
  { key:'creative_team',   label:'Creative Team',    icon:'🎨', desc:'Designers and art directors. Execute briefs, submit for review.',   color:'#7c3aed' },
  { key:'content_writer',  label:'Content Writer',   icon:'✍️', desc:'Write copy, captions, blogs and scripts.',                         color:'#3b82f6' },
  { key:'publishing_team', label:'Publishing Team',  icon:'📱', desc:'Schedule and publish social media content.',                       color:'#ec4899' },
  { key:'performance',     label:'Performance',      icon:'📊', desc:'Run paid campaigns. Track spend, ROAS and results.',               color:'#f59e0b' },
  { key:'tech',            label:'Tech Team',        icon:'💻', desc:'Build and ship. Manage sprints, bugs and dev tasks.',              color:'#06b6d4' },
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/user/onboarding')
      .then(r => r.json())
      .then(d => { if (d.onboarding_complete) router.push('/dashboard') })
      .catch(() => {})
  }, [status, router])

  const handleConfirm = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency_role: selected }),
      })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard')
    } catch {
      setError('Something went wrong — try again.')
      setSaving(false)
    }
  }

  if (status === 'loading') return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--text-muted)', letterSpacing:'0.1em' }}>
        ID<span style={{color:'var(--accent-bright)'}}>8</span> HUB
      </div>
    </div>
  )

  const sel = ROLES.find(r => r.key === selected)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px 160px', fontFamily:'var(--font-body)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, letterSpacing:'0.08em', color:'var(--text-primary)', marginBottom:32 }}>
        ID<span style={{color:'var(--accent-bright)'}}>8</span> HUB
      </div>

      <div style={{ textAlign:'center', marginBottom:40, maxWidth:500 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:36, letterSpacing:'0.04em', color:'var(--text-primary)', marginBottom:12 }}>
          Welcome, {session?.user?.name?.split(' ')[0]} 👋
        </div>
        <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>
          Pick your role to set up your workspace. You only do this once.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, width:'100%', maxWidth:1000 }}>
        {ROLES.map(role => {
          const isSelected = selected === role.key
          return (
            <button key={role.key} onClick={() => setSelected(role.key)} style={{
              display:'flex', flexDirection:'column', alignItems:'flex-start',
              padding:'18px 16px', borderRadius:14, cursor:'pointer',
              textAlign:'left', fontFamily:'var(--font-body)',
              background: isSelected ? `${role.color}12` : 'var(--bg-surface)',
              border: isSelected ? `1.5px solid ${role.color}` : '0.5px solid var(--border-subtle)',
              boxShadow: isSelected ? `0 0 24px ${role.color}22` : 'none',
              transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              position:'relative',
            }}>
              {isSelected && (
                <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:role.color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</div>
              )}
              <div style={{ fontSize:26, marginBottom:8 }}>{role.icon}</div>
              <div style={{ fontSize:14, fontWeight:600, color: isSelected ? role.color : 'var(--text-primary)', marginBottom:6 }}>{role.label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>{role.desc}</div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', width:'calc(100% - 48px)', maxWidth:600, background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)', borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:100 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>Selected</div>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>{sel?.icon} {sel?.label}</div>
          </div>
          <button onClick={handleConfirm} disabled={saving} style={{ padding:'10px 22px', borderRadius:100, background: saving ? 'var(--accent-dim)' : 'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, fontFamily:'var(--font-body)', cursor: saving ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
            {saving ? 'Setting up…' : 'Set up my workspace →'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ position:'fixed', bottom:110, left:'50%', transform:'translateX(-50%)', background:'rgba(239,68,68,0.15)', border:'0.5px solid rgba(239,68,68,0.4)', color:'#f87171', padding:'10px 20px', borderRadius:10, fontSize:13 }}>
          {error}
        </div>
      )}
    </div>
  )
}
