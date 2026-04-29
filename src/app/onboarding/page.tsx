'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const ROLES = [
  { key:'am',              label:'Account Manager',  icon:'🤝', desc:'Own client relationships, write briefs, manage timelines.',       color:'#10B981', bg:'#ECFDF5', border:'#A7F3D0' },
  { key:'creative_head',   label:'Creative Head',    icon:'👑', desc:'Approve all creative output. Final gatekeeper before delivery.',  color:'#7C3AED', bg:'#EDE9FE', border:'#C4B5FD' },
  { key:'creative_team',   label:'Creative Team',    icon:'🎨', desc:'Designers and art directors. Execute briefs, submit for review.', color:'#6D28D9', bg:'#EDE9FE', border:'#C4B5FD' },
  { key:'content_writer',  label:'Content Writer',   icon:'✍️', desc:'Write copy, captions, blogs and scripts.',                       color:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE' },
  { key:'publishing_team', label:'Publishing Team',  icon:'📱', desc:'Schedule and publish social media content.',                     color:'#EC4899', bg:'#FDF2F8', border:'#FBCFE8' },
  { key:'performance',     label:'Performance',      icon:'📊', desc:'Run paid campaigns. Track spend, ROAS and results.',             color:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A' },
  { key:'tech',            label:'Tech Team',        icon:'💻', desc:'Build and ship. Manage sprints, bugs and dev tasks.',            color:'#06B6D4', bg:'#ECFEFF', border:'#A5F3FC' },
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
    fetch('/api/user/onboarding').then(r => r.json()).then(d => { if (d.onboarding_complete) router.push('/dashboard') }).catch(() => {})
  }, [status, router])

  const handleConfirm = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agency_role: selected }) })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard')
    } catch {
      setError('Something went wrong — try again.')
      setSaving(false)
    }
  }

  if (status === 'loading') return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>ID8 Hub</div>
    </div>
  )

  const sel = ROLES.find(r => r.key === selected)

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #F5F5F7 0%, #EDE9FE 40%, #EFF6FF 100%)', display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px 160px', fontFamily:'var(--font-body)' }}>
      {/* Decorative blobs */}
      <div style={{ position:'fixed', top:'-15vh', right:'-10vw', width:'50vw', height:'50vh', background:'radial-gradient(ellipse, rgba(124,58,237,0.10) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-15vh', left:'-10vw', width:'40vw', height:'40vh', background:'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:40 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg, #7C3AED, #9F67F7)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(124,58,237,0.3)' }}>
          <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>ID8</span>
        </div>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>ID8 Hub</span>
      </div>

      <div style={{ textAlign:'center', marginBottom:40, maxWidth:520 }}>
        <div style={{ fontSize:32, fontWeight:800, color:'var(--text-primary)', marginBottom:12, lineHeight:1.2 }}>
          Welcome, {session?.user?.name?.split(' ')[0]} 👋
        </div>
        <div style={{ fontSize:15, color:'var(--text-secondary)', lineHeight:1.7 }}>
          Pick your role to personalise your workspace.<br/>You only do this once.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:14, width:'100%', maxWidth:1100 }}>
        {ROLES.map(role => {
          const isSelected = selected === role.key
          return (
            <button key={role.key} onClick={() => setSelected(role.key)} style={{
              display:'flex', flexDirection:'column', alignItems:'flex-start',
              padding:'20px 18px', borderRadius:20, cursor:'pointer',
              textAlign:'left', fontFamily:'var(--font-body)',
              background: isSelected ? role.bg : 'rgba(255,255,255,0.85)',
              border: isSelected ? `2px solid ${role.color}` : '1.5px solid rgba(255,255,255,0.9)',
              boxShadow: isSelected ? `0 8px 30px ${role.color}25` : '0 2px 12px rgba(0,0,0,0.06)',
              transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              backdropFilter:'blur(20px)',
              position:'relative',
            }}>
              {isSelected && (
                <div style={{ position:'absolute', top:12, right:12, width:22, height:22, borderRadius:'50%', background:role.color, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${role.color}40` }}>✓</div>
              )}
              <div style={{ fontSize:28, marginBottom:10 }}>{role.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color: isSelected ? role.color : 'var(--text-primary)', marginBottom:6 }}>{role.label}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{role.desc}</div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', width:'calc(100% - 48px)', maxWidth:560, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, boxShadow:'0 20px 60px rgba(0,0,0,0.12)', zIndex:100 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2, fontWeight:500 }}>Selected role</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{sel?.icon} {sel?.label}</div>
          </div>
          <button onClick={handleConfirm} disabled={saving} style={{ padding:'11px 24px', borderRadius:100, background: saving ? '#C4B5FD' : 'var(--accent)', color:'#fff', border:'none', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)', cursor: saving ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(124,58,237,0.35)', transition:'all 0.2s' }}>
            {saving ? 'Setting up…' : 'Set up my workspace →'}
          </button>
        </div>
      )}

      {error && <div style={{ position:'fixed', bottom:110, left:'50%', transform:'translateX(-50%)', background:'#FEE2E2', border:'1px solid #FECACA', color:'#EF4444', padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:500 }}>{error}</div>}
    </div>
  )
}
