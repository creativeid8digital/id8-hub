'use client'
import { useEffect, useState } from 'react'
import { supabase, type Brief } from '@/lib/supabase'
import { ExternalLink, Plus } from 'lucide-react'

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  not_started: { bg:'rgba(74,65,104,0.2)',  color:'var(--text-muted)',   border:'var(--border-subtle)' },
  in_progress: { bg:'rgba(245,158,11,0.12)', color:'#fbbf24',            border:'rgba(245,158,11,0.3)' },
  review:      { bg:'rgba(59,130,246,0.12)', color:'#60a5fa',            border:'rgba(59,130,246,0.3)' },
  approved:    { bg:'rgba(34,197,94,0.12)',  color:'#4ade80',            border:'rgba(34,197,94,0.3)' },
}

export default function BriefHub({ brandId }: { brandId: string }) {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('briefs').select('*, brands(name,color)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    q.then(({ data }) => { setBriefs(data || []); setLoading(false) })
  }, [brandId])

  const isLate = (d: string | null) => d && new Date(d) < new Date()

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20 }}>Loading briefs…</div>

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.05em', color:'var(--text-primary)' }}>Brief & Asset Hub</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>All files auto-sync to Google Drive</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {briefs.map(b => {
          const st = STATUS_STYLE[b.status] || STATUS_STYLE.not_started
          const brand = b.brands as any
          return (
            <div key={b.id} style={{
              background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)',
              borderTop: `2px solid ${brand?.color || 'var(--accent)'}`,
              borderRadius:'var(--radius-md)', padding:18, cursor:'pointer',
              transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 36px rgba(0,0,0,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>
                {brand?.name || 'No Brand'} · {b.team?.replace('_',' ')}
              </div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', marginBottom:10, lineHeight:1.3 }}>{b.title}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <span style={{ fontSize:10, padding:'3px 9px', borderRadius:100, fontWeight:500, background: st.bg, color: st.color, border:`0.5px solid ${st.border}` }}>
                  {b.status.replace('_',' ')}
                </span>
                <span style={{ fontSize:11, color: isLate(b.due_date) ? 'var(--danger)' : 'var(--text-muted)', fontFamily:'monospace' }}>
                  {b.due_date ? `Due ${b.due_date}` : 'No deadline'}
                </span>
              </div>
              {b.drive_file_url && (
                <a href={b.drive_file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', border:'0.5px solid var(--border-subtle)', fontSize:11, color:'var(--info)', textDecoration:'none' }}
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={11} />
                  {b.drive_file_url.length > 40 ? b.drive_file_url.slice(0,40)+'…' : b.drive_file_url}
                </a>
              )}
            </div>
          )
        })}

        {/* Add new placeholder */}
        <div style={{ border:'0.5px dashed var(--border-subtle)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:160, cursor:'pointer', transition:'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'}
        >
          <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
            <Plus size={24} color="var(--accent)" style={{ marginBottom:8 }} />
            <div style={{ fontSize:12, letterSpacing:'0.06em', textTransform:'uppercase' }}>New Brief</div>
          </div>
        </div>
      </div>
    </div>
  )
}
