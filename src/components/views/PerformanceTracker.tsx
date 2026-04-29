'use client'
import { useEffect, useState } from 'react'
import { supabase, type PerformanceCampaign } from '@/lib/supabase'
import { format } from 'date-fns'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  live:   { bg:'rgba(34,197,94,0.12)',  color:'#4ade80' },
  paused: { bg:'rgba(245,158,11,0.12)', color:'#fbbf24' },
  ended:  { bg:'rgba(124,58,237,0.12)', color:'#a855f7' },
  review: { bg:'rgba(239,68,68,0.12)',  color:'#f87171' },
}

export default function PerformanceTracker({ brandId }: { brandId: string }) {
  const [campaigns, setCampaigns] = useState<PerformanceCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('performance_campaigns').select('*, brands(name,color)').eq('month_year', currentMonth).order('spend', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    q.then(({ data }) => { setCampaigns(data || []); setLoading(false) })
  }, [brandId])

  const totalSpend = campaigns.reduce((a, c) => a + (c.spend || 0), 0)
  const avgRoas = campaigns.length ? campaigns.reduce((a, c) => a + (c.roas || 0), 0) / campaigns.length : 0
  const totalImpressions = campaigns.reduce((a, c) => a + (c.impressions || 0), 0)

  const colorForRoas = (v: number) => v >= 4 ? 'var(--success)' : v >= 2.5 ? 'var(--warning)' : 'var(--danger)'
  const colorForCtr  = (v: number) => v >= 2 ? 'var(--success)' : v >= 1   ? 'var(--warning)' : 'var(--danger)'

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20 }}>Loading performance data…</div>

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Ad Spend', value: `₹${(totalSpend/100000).toFixed(1)}L`, color:'var(--accent-bright)' },
          { label:'Avg. ROAS',      value: `${avgRoas.toFixed(1)}x`,              color: colorForRoas(avgRoas) },
          { label:'Total Impressions', value: totalImpressions > 1000000 ? `${(totalImpressions/1000000).toFixed(1)}M` : `${(totalImpressions/1000).toFixed(0)}K`, color:'var(--text-primary)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'16px 18px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', color: s.color, lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
        {campaigns.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            No performance data for this month yet.<br/>
            <span style={{ fontSize:11 }}>Add campaigns via the + button above.</span>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                {['Campaign','Brand','Platform','Spend','Impressions','CTR','CPC','ROAS','Status'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', background:'var(--bg-elevated)', borderBottom:'0.5px solid var(--border-subtle)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const st = STATUS_STYLE[c.status] || STATUS_STYLE.live
                return (
                  <tr key={c.id} style={{ transition:'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-primary)', fontWeight:500 }}>{c.name}</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-secondary)' }}>{(c.brands as any)?.name || '—'}</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-secondary)', textTransform:'capitalize' }}>{c.platform}</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-secondary)', fontFamily:'monospace' }}>₹{(c.spend/100000).toFixed(1)}L</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-secondary)', fontFamily:'monospace' }}>{(c.impressions/1000000).toFixed(1)}M</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', fontFamily:'monospace', color: colorForCtr(c.ctr) }}>{c.ctr}%</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', color:'var(--text-secondary)', fontFamily:'monospace' }}>₹{c.cpc}</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)', fontFamily:'monospace', color: colorForRoas(c.roas) }}>{c.roas}x</td>
                    <td style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border-subtle)' }}>
                      <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:100, fontSize:10, fontWeight:500, background: st.bg, color: st.color }}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
