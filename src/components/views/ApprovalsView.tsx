'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Approval } from '@/lib/supabase'

export default function ApprovalsView({ brandId }: { brandId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('approvals').select('*, brands(name,color)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    const { data } = await q
    setApprovals(data || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => { fetchData() }, [fetchData])

  const approve = async (id: string, stage: string) => {
    const update: Record<string, unknown> = {}
    if (stage === 'creative') { update.creative_approved = true; update.current_stage = 'account_manager' }
    if (stage === 'account_manager') { update.am_approved = true; update.current_stage = 'client' }
    if (stage === 'client') { update.client_approved = true }
    await supabase.from('approvals').update(update).eq('id', id)
    fetchData()
  }

  const reject = async (id: string) => {
    await supabase.from('approvals').delete().eq('id', id)
    setApprovals(a => a.filter(x => x.id !== id))
  }

  const pending = approvals.filter(a => !a.client_approved)
  const done    = approvals.filter(a =>  a.client_approved)

  const StageChip = ({ isDone, label }: { isDone: boolean; label: string }) => (
    <span style={{
      padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:500,
      background: isDone ? 'rgba(34,197,94,0.12)' : 'rgba(74,65,104,0.2)',
      color: isDone ? '#4ade80' : 'var(--text-disabled)',
      border: `0.5px solid ${isDone ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
    }}>{isDone ? '✓' : '⏳'} {label}</span>
  )

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20 }}>Loading approvals…</div>

  return (
    <div>
      <div style={{ marginBottom:8, fontSize:12, color:'var(--text-muted)' }}>{pending.length} items need attention</div>

      <div style={{ display:'grid', gap:10, marginBottom:24 }}>
        {pending.map(a => (
          <div key={a.id} style={{
            background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)', padding:'16px 18px',
            display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center',
          }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>
                {(a.brands as any)?.name || 'No Brand'}
              </div>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:8 }}>{a.title}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <StageChip isDone={a.creative_approved} label="Creative" />
                <span style={{ color:'var(--text-disabled)', fontSize:10 }}>→</span>
                <StageChip isDone={a.am_approved} label="AM Review" />
                <span style={{ color:'var(--text-disabled)', fontSize:10 }}>→</span>
                <StageChip isDone={a.client_approved} label="Client" />
              </div>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button
                onClick={() => approve(a.id, a.current_stage)}
                style={{ padding:'7px 14px', borderRadius:100, background:'rgba(34,197,94,0.12)', color:'var(--success)', border:'0.5px solid rgba(34,197,94,0.3)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}
              >✓ Approve</button>
              <button
                onClick={() => reject(a.id)}
                style={{ padding:'7px 14px', borderRadius:100, background:'rgba(239,68,68,0.1)', color:'var(--danger)', border:'0.5px solid rgba(239,68,68,0.3)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}
              >✗ Reject</button>
            </div>
          </div>
        ))}

        {pending.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)' }}>
            🎉 All caught up — no pending approvals
          </div>
        )}
      </div>

      {done.length > 0 && (
        <>
          <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Approved</div>
          <div style={{ display:'grid', gap:8 }}>
            {done.map(a => (
              <div key={a.id} style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'12px 18px', opacity:0.6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{a.title}</div>
                <span style={{ fontSize:10, padding:'2px 9px', borderRadius:100, background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'0.5px solid rgba(34,197,94,0.3)' }}>✓ Fully Approved</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
