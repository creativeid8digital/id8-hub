'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Campaign } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'

const COLS = [
  { key: 'todo',        label: 'To Do',       color: '#86868B', bg: '#F5F5F7' },
  { key: 'in_progress', label: 'In Progress',  color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'review',      label: 'In Review',    color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'done',        label: 'Done',         color: '#10B981', bg: '#ECFDF5' },
]

const TEAM_COLORS: Record<string, { color: string; bg: string }> = {
  creative:        { color: '#7C3AED', bg: '#EDE9FE' },
  performance:     { color: '#F59E0B', bg: '#FFFBEB' },
  content:         { color: '#3B82F6', bg: '#EFF6FF' },
  social:          { color: '#EC4899', bg: '#FDF2F8' },
  account_managers:{ color: '#10B981', bg: '#ECFDF5' },
  tech:            { color: '#06B6D4', bg: '#ECFEFF' },
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

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading campaigns…</div>

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active',    value: campaigns.filter(c => c.status !== 'done').length, color: 'var(--accent)',  bg: 'var(--accent-light)' },
          { label: 'In Review', value: campaigns.filter(c => c.status === 'review').length, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Done',      value: campaigns.filter(c => c.status === 'done').length,  color: '#10B981', bg: '#ECFDF5' },
          { label: 'Total',     value: campaigns.length, color: 'var(--text-primary)', bg: 'var(--bg-base)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, alignItems: 'start' }}>
        {COLS.map(col => {
          const cards = campaigns.filter(c => c.status === col.key)
          return (
            <div key={col.key}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, padding: '8px 12px', background: col.bg, borderRadius: 'var(--radius-md)', border: `1px solid ${col.color}20` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: col.color, background: `${col.color}20`, padding: '1px 7px', borderRadius: 100 }}>{cards.length}</div>
              </div>

              {cards.map(c => {
                const teamStyle = TEAM_COLORS[c.team] || { color: '#7C3AED', bg: '#EDE9FE' }
                return (
                  <div key={c.id} style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16, marginBottom: 10,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = 'var(--border-default)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-sm)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                      {(c.brands as any)?.name || 'No Brand'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4 }}>{c.title}</div>

                    {c.team && (
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: teamStyle.bg, color: teamStyle.color }}>
                          {c.team.replace('_', ' ')}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, color: isLate(c.due_date) ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isLate(c.due_date) ? 600 : 400 }}>
                        {c.due_date ? `${isLate(c.due_date) ? '⚠ ' : '📅 '}${c.due_date}` : '—'}
                      </div>
                      <select value={c.status} onChange={e => moveCampaign(c.id, e.target.value)} onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-secondary)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </div>

                    {c.drive_folder_url && (
                      <a href={c.drive_folder_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--blue)', fontWeight: 500, textDecoration: 'none' }}>
                        <ExternalLink size={11} /> Open in Drive
                      </a>
                    )}
                  </div>
                )
              })}

              {cards.length === 0 && (
                <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)' }}>
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
