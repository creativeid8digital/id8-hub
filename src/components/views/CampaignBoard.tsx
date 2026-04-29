'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Campaign } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'

const COLS = [
  { key: 'todo',        label: 'To Do',      color: '#4a4168' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'review',      label: 'In Review',   color: '#3b82f6' },
  { key: 'done',        label: 'Done',        color: '#22c55e' },
]

const TEAM_COLORS: Record<string, string> = {
  creative: '#a855f7', performance: '#f59e0b', content: '#3b82f6',
  social: '#ec4899', account_managers: '#22c55e', tech: '#06b6d4',
}

export default function CampaignBoard({ brandId }: { brandId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('campaigns').select('*, brands(name, color)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    const { data } = await q
    setCampaigns(data || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => {
    loadCampaigns()
    const sub = supabase.channel('campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, loadCampaigns)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [loadCampaigns])

  const moveCampaign = async (id: string, status: string) => {
    await supabase.from('campaigns').update({ status }).eq('id', id)
  }

  const isLate = (date: string | null) => date && new Date(date) < new Date()

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20 }}>Loading campaigns…</div>

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Active',    value: campaigns.filter(c => c.status !== 'done').length,    color:'var(--accent-bright)' },
          { label:'In Review', value: campaigns.filter(c => c.status === 'review').length,  color:'var(--warning)' },
          { label:'Done',      value: campaigns.filter(c => c.status === 'done').length,    color:'var(--success)' },
          { label:'Total',     value: campaigns.length,                                      color:'var(--text-primary)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'16px 18px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', color: s.color, lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, alignItems:'start' }}>
        {COLS.map(col => {
          const cards = campaigns.filter(c => c.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: col.color }} />
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{col.label}</div>
                <div style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{cards.length}</div>
              </div>

              {cards.map(c => (
                <div key={c.id} style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:14, marginBottom:10, cursor:'pointer', position:'relative', overflow:'hidden', transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='var(--border-default)'; el.style.transform='translateY(-3px)'; el.style.boxShadow='0 12px 36px rgba(0,0,0,0.5)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='rgba(124,58,237,0.12)'; el.style.transform='none'; el.style.boxShadow='none' }}
                >
                  <div style={{ position:'absolute', top:0, left:0, width:3, bottom:0, background: (c.brands as any)?.color || TEAM_COLORS[c.team] || 'var(--accent)', borderRadius:'var(--radius-md) 0 0 var(--radius-md)' }} />
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, paddingLeft:8 }}>{(c.brands as any)?.name || 'No Brand'}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:10, lineHeight:1.4, paddingLeft:8 }}>{c.title}</div>
                  {c.team && (
                    <div style={{ paddingLeft:8, marginBottom:10 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:100, fontSize:10, fontWeight:500, background:`${TEAM_COLORS[c.team] || '#7c3aed'}18`, color: TEAM_COLORS[c.team] || 'var(--accent-bright)', border:`0.5px solid ${TEAM_COLORS[c.team] || '#7c3aed'}40` }}>
                        {c.team.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:8 }}>
                    <div style={{ fontSize:10, color: isLate(c.due_date) ? 'var(--danger)' : 'var(--text-muted)', fontFamily:'monospace' }}>
                      {c.due_date ? `${isLate(c.due_date) ? '⚠ ' : ''}${c.due_date}` : '—'}
                    </div>
                    <select value={c.status} onChange={e => moveCampaign(c.id, e.target.value)} onClick={e => e.stopPropagation()}
                      style={{ fontSize:10, background:'var(--bg-elevated)', border:'0.5px solid var(--border-subtle)', borderRadius:6, color:'var(--text-secondary)', padding:'2px 6px', cursor:'pointer', fontFamily:'var(--font-body)' }}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  {c.drive_folder_url && (
                    <a href={c.drive_folder_url} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:5, marginTop:10, paddingTop:8, borderTop:'0.5px solid var(--border-subtle)', fontSize:10, color:'var(--info)', textDecoration:'none' }}
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink size={10} /> Open in Drive
                    </a>
                  )}
                </div>
              ))}

              {cards.length === 0 && (
                <div style={{ border:'0.5px dashed var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'20px 14px', textAlign:'center', fontSize:11, color:'var(--text-disabled)' }}>
                  No campaigns here
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
