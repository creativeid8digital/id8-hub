'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, ArrowLeft, Clock, User, Flag, ExternalLink, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────
type Task = {
  id: string
  title: string
  description: string | null
  brand_id: string | null
  brief_id: string | null
  status: 'brief' | 'assigned' | 'in_progress' | 'submitted' | 'in_review' | 'approved' | 'live'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_team: string | null
  due_date: string | null
  drive_file_url: string | null
  estimated_hours: number | null
  created_at: string
  brands?: { name: string; color: string }
  briefs?: { title: string }
}

type Brief = { id: string; title: string; brand_id: string | null; brands?: { name: string; color: string } }

// ── Status pipeline ────────────────────────────────────────────────────
const PIPELINE = [
  { key: 'brief',       label: 'Brief',       color: '#86868B', bg: '#F5F5F7', desc: 'Not yet assigned'         },
  { key: 'assigned',    label: 'Assigned',    color: '#7C3AED', bg: '#EDE9FE', desc: 'Team member assigned'     },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB', desc: 'Work underway'            },
  { key: 'submitted',   label: 'Submitted',   color: '#3B82F6', bg: '#EFF6FF', desc: 'Submitted for review'     },
  { key: 'in_review',   label: 'In Review',   color: '#EC4899', bg: '#FDF2F8', desc: 'Creative Head reviewing'  },
  { key: 'approved',    label: 'Approved',    color: '#10B981', bg: '#ECFDF5', desc: 'Approved, ready to go'    },
  { key: 'live',        label: 'Live',        color: '#065F46', bg: '#D1FAE5', desc: 'Published / delivered'    },
]

const PRIORITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  low:    { color: '#10B981', bg: '#ECFDF5', label: 'Low'    },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium' },
  high:   { color: '#EF4444', bg: '#FEE2E2', label: 'High'   },
  urgent: { color: '#7C2D12', bg: '#FEF2F2', label: 'Urgent' },
}

const TEAMS = [
  { value: 'creative_team',   label: 'Creative Team'    },
  { value: 'content_writer',  label: 'Content Writers'  },
  { value: 'publishing_team', label: 'Publishing Team'  },
  { value: 'performance',     label: 'Performance'      },
  { value: 'tech',            label: 'Tech Team'        },
  { value: 'am',              label: 'Account Manager'  },
]

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA',
  borderRadius: 10, padding: '9px 12px', fontSize: 13,
  color: '#1D1D1F', fontFamily: 'var(--font-body)',
  outline: 'none', width: '100%', transition: 'all 0.15s',
}

// ── Main component ─────────────────────────────────────────────────────
export default function TaskPipeline({ brandId }: { brandId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')

  // Create form
  const [form, setForm] = useState({
    title: '', description: '', brief_id: '',
    brand_id: brandId || '', assigned_team: 'creative_team',
    priority: 'medium', due_date: '', estimated_hours: '',
    drive_file_url: '',
  })
  const [creating, setCreating] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('tasks').select('*, brands(name,color), briefs(title)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    const { data } = await q
    setTasks((data as Task[]) || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => {
    loadTasks()
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
    // Load briefs for linking
    let bq = supabase.from('briefs').select('id, title, brand_id, brands(name,color)').order('created_at', { ascending: false })
    if (brandId) bq = bq.eq('brand_id', brandId)
    bq.then(({ data }) => { if (data) setBriefs(data as Brief[]) })

    // Realtime
    const sub = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [loadTasks, brandId])

  const createTask = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      brief_id: form.brief_id || null,
      brand_id: form.brand_id || null,
      assigned_team: form.assigned_team,
      priority: form.priority,
      due_date: form.due_date || null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      drive_file_url: form.drive_file_url || null,
      status: 'brief',
    })
    setForm({ title: '', description: '', brief_id: '', brand_id: brandId || '', assigned_team: 'creative_team', priority: 'medium', due_date: '', estimated_hours: '', drive_file_url: '' })
    setCreating(false)
    setShowCreate(false)
  }

  const moveTask = async (id: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t))
  }

  const isLate = (date: string | null) => date && new Date(date) < new Date()

  // Filter
  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterTeam !== 'all' && t.assigned_team !== filterTeam) return false
    return true
  })

  // Group by status for kanban
  const grouped = PIPELINE.reduce((acc, col) => {
    acc[col.key] = filtered.filter(t => t.status === col.key)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Task Pipeline</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Brief → Assigned → In Progress → Submitted → In Review → Approved → Live
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus size={15} strokeWidth={2.5} /> New Task
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {PIPELINE.map(p => (
          <div key={p.key} onClick={() => setFilterStatus(filterStatus === p.key ? 'all' : p.key)}
            style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 100, cursor: 'pointer', background: filterStatus === p.key ? p.color : p.bg, color: filterStatus === p.key ? '#fff' : p.color, border: `1.5px solid ${p.color}30`, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {p.label}
            <span style={{ background: filterStatus === p.key ? 'rgba(255,255,255,0.25)' : `${p.color}20`, padding: '1px 7px', borderRadius: 100, fontSize: 11 }}>
              {tasks.filter(t => t.status === p.key).length}
            </span>
          </div>
        ))}
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          style={{ flexShrink: 0, fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 100, border: '1.5px solid var(--border-default)', background: '#fff', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <option value="all">All Teams</option>
          {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading tasks…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', gap: 12, alignItems: 'start', overflowX: 'auto' }}>
          {PIPELINE.map(col => {
            const cards = grouped[col.key] || []
            return (
              <div key={col.key} style={{ minWidth: 160 }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '7px 10px', background: col.bg, borderRadius: 10, border: `1px solid ${col.color}20` }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: col.color, flex: 1 }}>{col.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: col.color, background: `${col.color}20`, padding: '1px 6px', borderRadius: 100 }}>{cards.length}</div>
                </div>

                {/* Cards */}
                {cards.map(task => {
                  const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                  const pipe = PIPELINE.find(p => p.key === task.status)!
                  const nextStatus = PIPELINE[PIPELINE.indexOf(pipe) + 1]
                  return (
                    <div key={task.id} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; el.style.transform = 'none' }}
                    >
                      {/* Brand + Brief */}
                      {((task.brands as any)?.name || (task.briefs as any)?.title) && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(task.brands as any)?.name}{(task.briefs as any)?.title ? ` · ${(task.briefs as any).title}` : ''}
                        </div>
                      )}

                      {/* Title */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>{task.title}</div>

                      {/* Team + Priority */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                        {task.assigned_team && (
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100, background: '#EDE9FE', color: '#7C3AED' }}>
                            {task.assigned_team.replace('_', ' ')}
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: pri.bg, color: pri.color }}>
                          {pri.label}
                        </span>
                      </div>

                      {/* Due date */}
                      {task.due_date && (
                        <div style={{ fontSize: 11, color: isLate(task.due_date) ? '#EF4444' : 'var(--text-muted)', fontWeight: isLate(task.due_date) ? 600 : 400, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />
                          {isLate(task.due_date) ? '⚠ ' : ''}{task.due_date}
                        </div>
                      )}

                      {/* Drive link */}
                      {task.drive_file_url && (
                        <a href={task.drive_file_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#3B82F6', fontWeight: 500, textDecoration: 'none', marginBottom: 10 }}>
                          <ExternalLink size={10} /> Drive
                        </a>
                      )}

                      {/* Move forward button */}
                      {nextStatus && (
                        <button onClick={() => moveTask(task.id, nextStatus.key)}
                          style={{ width: '100%', padding: '6px 0', borderRadius: 8, background: `${col.color}12`, color: col.color, border: `1px solid ${col.color}25`, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = `${col.color}22` }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = `${col.color}12` }}
                        >
                          → {nextStatus.label}
                        </button>
                      )}
                      {!nextStatus && (
                        <div style={{ width: '100%', padding: '6px 0', borderRadius: 8, background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>✓ Complete</div>
                      )}
                    </div>
                  )
                })}

                {cards.length === 0 && (
                  <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 12, padding: '16px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-disabled)' }}>Empty</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 520, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
              New <span style={{ color: 'var(--accent)' }}>Task</span>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Task Title *</label>
                <input style={inputStyle} placeholder="e.g. Design 5 Instagram reels for June campaign" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                />
              </div>

              {/* Link to Brief */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Link to Brief</label>
                <select style={inputStyle} value={form.brief_id} onChange={e => {
                  const brief = briefs.find(b => b.id === e.target.value)
                  setForm({ ...form, brief_id: e.target.value, brand_id: brief?.brand_id || form.brand_id })
                }}>
                  <option value="">No Brief</option>
                  {briefs.map(b => <option key={b.id} value={b.id}>{(b.brands as any)?.name ? `${(b.brands as any).name} — ` : ''}{b.title}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand</label>
                  <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">No Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Assign to Team</label>
                  <select style={inputStyle} value={form.assigned_team} onChange={e => setForm({ ...form, assigned_team: e.target.value })}>
                    {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Priority</label>
                  <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Due Date</label>
                  <input style={inputStyle} type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Est. Hours</label>
                  <input style={inputStyle} type="number" placeholder="e.g. 4" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="What needs to be done? Any specific instructions..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Link</label>
                <input style={inputStyle} placeholder="Paste Drive folder URL" value={form.drive_file_url} onChange={e => setForm({ ...form, drive_file_url: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              <button onClick={createTask} disabled={creating || !form.title.trim()} style={{ padding: '9px 24px', borderRadius: 100, background: creating ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {creating ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
