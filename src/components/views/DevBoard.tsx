'use client'
import { useEffect, useState } from 'react'
import { supabase, type DevTask } from '@/lib/supabase'

const COLS = [
  { key:'backlog',  label:'Backlog',    color:'#4a4168' },
  { key:'in_dev',   label:'In Dev',     color:'#f59e0b' },
  { key:'qa',       label:'QA / Testing',color:'#3b82f6' },
  { key:'deployed', label:'Deployed',   color:'#22c55e' },
]
const TYPE_COLORS: Record<string, string> = {
  frontend:'#06b6d4', backend:'#ef4444', qa:'#3b82f6', devops:'#f59e0b', design:'#a855f7',
}

export default function DevBoard({ brandId }: { brandId: string }) {
  const [tasks, setTasks] = useState<DevTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('dev_tasks').select('*, brands(name,color)').order('created_at', { ascending:false })
    if (brandId) q = q.eq('brand_id', brandId)
    q.then(({ data }) => { setTasks(data || []); setLoading(false) })

    const sub = supabase.channel('dev_tasks').on('postgres_changes', { event:'*', schema:'public', table:'dev_tasks' }, () => {
      let q2 = supabase.from('dev_tasks').select('*, brands(name,color)').order('created_at', { ascending:false })
      if (brandId) q2 = q2.eq('brand_id', brandId)
      q2.then(({ data }) => setTasks(data || []))
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [brandId])

  const move = async (id: string, status: string) => {
    await supabase.from('dev_tasks').update({ status }).eq('id', id)
  }

  const sprints = [...new Set(tasks.map(t => t.sprint_name).filter(Boolean))]
  const activeSprint = sprints[0] || 'No Sprint'
  const sprintTasks = tasks.filter(t => t.sprint_name === activeSprint)
  const doneInSprint = sprintTasks.filter(t => t.status === 'deployed').length
  const progress = sprintTasks.length ? Math.round((doneInSprint / sprintTasks.length) * 100) : 0

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20 }}>Loading dev tasks…</div>

  return (
    <div>
      {/* Sprint banner */}
      {activeSprint !== 'No Sprint' && (
        <div style={{ background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)', borderRadius:'var(--radius-md)', padding:'14px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:16 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Current Sprint</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'0.05em', color:'var(--accent-bright)' }}>{activeSprint}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>
              <span>Progress</span><span style={{ color:'var(--accent-bright)' }}>{progress}%</span>
            </div>
            <div style={{ height:4, background:'var(--bg-overlay)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg, var(--accent), var(--accent-bright))', borderRadius:4, transition:'width 0.6s ease' }} />
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Tasks Done</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text-primary)', lineHeight:1 }}>{doneInSprint}/{sprintTasks.length}</div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, alignItems:'start' }}>
        {COLS.map(col => {
          const cards = tasks.filter(t => t.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10, padding:'0 2px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: col.color }} />
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{col.label}</div>
                <div style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{cards.length}</div>
              </div>

              {cards.map(t => (
                <div key={t.id} style={{
                  background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)',
                  borderRadius:'var(--radius-md)', padding:14, marginBottom:10, cursor:'pointer',
                  position:'relative', overflow:'hidden',
                  transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='var(--border-default)'; el.style.transform='translateY(-3px)'; el.style.boxShadow='0 12px 36px rgba(0,0,0,0.5)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='rgba(124,58,237,0.12)'; el.style.transform='none'; el.style.boxShadow='none' }}
                >
                  <div style={{ position:'absolute', top:0, left:0, width:3, bottom:0, background: TYPE_COLORS[t.task_type] || 'var(--accent)', borderRadius:'var(--radius-md) 0 0 var(--radius-md)' }} />
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, paddingLeft:8 }}>{(t.brands as any)?.name || 'Internal'}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:10, lineHeight:1.4, paddingLeft:8 }}>{t.title}</div>
                  {t.task_type && (
                    <div style={{ paddingLeft:8, marginBottom:8 }}>
                      <span style={{ display:'inline-flex', padding:'3px 8px', borderRadius:100, fontSize:10, fontWeight:500, background:`${TYPE_COLORS[t.task_type] || '#7c3aed'}18`, color: TYPE_COLORS[t.task_type] || 'var(--accent-bright)', border:`0.5px solid ${TYPE_COLORS[t.task_type] || '#7c3aed'}40` }}>
                        {t.task_type}
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:8 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{t.sprint_name || '—'}</div>
                    <select value={t.status} onChange={e => move(t.id, e.target.value)} onClick={e => e.stopPropagation()}
                      style={{ fontSize:10, background:'var(--bg-elevated)', border:'0.5px solid var(--border-subtle)', borderRadius:6, color:'var(--text-secondary)', padding:'2px 6px', cursor:'pointer', fontFamily:'var(--font-body)' }}>
                      <option value="backlog">Backlog</option>
                      <option value="in_dev">In Dev</option>
                      <option value="qa">QA</option>
                      <option value="deployed">Deployed</option>
                    </select>
                  </div>
                </div>
              ))}

              {cards.length === 0 && <div style={{ border:'0.5px dashed var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'20px 14px', textAlign:'center', fontSize:11, color:'var(--text-disabled)' }}>Empty</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
