'use client'
import { useEffect, useState, useCallback } from 'react'
import TaskDetail from './TaskDetail'
import { Clock } from 'lucide-react'

type Task = {
  id: string; title: string; description: string | null
  brand_id: string | null; brief_id: string | null
  status: string; priority: string
  assigned_team: string | null; due_date: string | null
  drive_file_url: string | null; estimated_hours: number | null
  created_at: string
  brands?: { name: string; color: string }
  briefs?: { title: string }
  users?: { name: string; avatar_url: string | null }
}

const PIPELINE = [
  { key: 'brief',       label: 'Brief',       color: '#86868B', bg: '#F5F5F7' },
  { key: 'assigned',    label: 'Assigned',    color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'submitted',   label: 'Submitted',   color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'in_review',   label: 'In Review',   color: '#EC4899', bg: '#FDF2F8' },
  { key: 'approved',    label: 'Approved',    color: '#10B981', bg: '#ECFDF5' },
  { key: 'live',        label: 'Live',        color: '#065F46', bg: '#D1FAE5' },
]

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  low:    { color: '#10B981', bg: '#ECFDF5' },
  medium: { color: '#F59E0B', bg: '#FFFBEB' },
  high:   { color: '#EF4444', bg: '#FEE2E2' },
  urgent: { color: '#7C2D12', bg: '#FEF2F2' },
}

export default function TaskPipeline({ brandId, userEmail }: { brandId: string; userEmail?: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const url = brandId ? `/api/tasks?brand_id=${brandId}` : '/api/tasks'
    const res = await fetch(url)
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [brandId])

  useEffect(() => { load() }, [load])

  const moveTask = async (id: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  const isLate = (date: string | null) => date && new Date(date) < new Date()

  if (selectedTaskId) return <TaskDetail taskId={selectedTaskId} onBack={() => { setSelectedTaskId(null); load() }} userEmail={userEmail || ''} />

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)
  const grouped = PIPELINE.reduce((acc, col) => { acc[col.key] = filtered.filter(t => t.status === col.key); return acc }, {} as Record<string, Task[]>)

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Task Pipeline</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Click any card to open, edit and comment</div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('all')}
          style={{ padding: '6px 14px', borderRadius: 100, border: `1.5px solid ${filterStatus === 'all' ? 'var(--accent)' : 'var(--border-default)'}`, background: filterStatus === 'all' ? 'var(--accent-subtle)' : '#fff', color: filterStatus === 'all' ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          All ({tasks.length})
        </button>
        {PIPELINE.map(p => (
          <button key={p.key} onClick={() => setFilterStatus(filterStatus === p.key ? 'all' : p.key)}
            style={{ padding: '6px 14px', borderRadius: 100, border: `1.5px solid ${filterStatus === p.key ? p.color : 'transparent'}`, background: filterStatus === p.key ? p.color : p.bg, color: filterStatus === p.key ? '#fff' : p.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
            {p.label} ({tasks.filter(t => t.status === p.key).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No tasks yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create a job using the "+ New Job" button to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(155px, 1fr))', gap: 12, alignItems: 'start', overflowX: 'auto' }}>
          {PIPELINE.map(col => {
            const cards = grouped[col.key] || []
            return (
              <div key={col.key} style={{ minWidth: 155 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '7px 10px', background: col.bg, borderRadius: 10, border: `1px solid ${col.color}20` }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: col.color, flex: 1 }}>{col.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: col.color, background: `${col.color}20`, padding: '1px 6px', borderRadius: 100 }}>{cards.length}</div>
                </div>

                {cards.map(task => {
                  const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                  const pipe = PIPELINE.find(p => p.key === task.status)!
                  const nextStatus = PIPELINE[PIPELINE.indexOf(pipe) + 1]
                  const assignee = task.users as any
                  return (
                    <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
                      style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
                    >
                      {/* Brand / Brief */}
                      {((task.brands as any)?.name || (task.briefs as any)?.title) && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(task.brands as any)?.name}{(task.briefs as any)?.title ? ` · ${(task.briefs as any).title}` : ''}
                        </div>
                      )}

                      {/* Title */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>{task.title}</div>

                      {/* Assignee */}
                      {assignee?.name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                            {assignee.name[0]}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignee.name.split(' ')[0]}</span>
                        </div>
                      )}

                      {/* Priority + due date */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: pri.bg, color: pri.color }}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span style={{ fontSize: 10, color: isLate(task.due_date) ? '#EF4444' : 'var(--text-muted)', fontWeight: isLate(task.due_date) ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={9} />{task.due_date}
                          </span>
                        )}
                      </div>

                      {/* Move button */}
                      {nextStatus && (
                        <button onClick={e => moveTask(task.id, nextStatus.key, e)}
                          style={{ width: '100%', padding: '6px 0', borderRadius: 8, background: `${col.color}12`, color: col.color, border: `1px solid ${col.color}25`, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${col.color}22`}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = `${col.color}12`}
                        >→ {nextStatus.label}</button>
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
    </div>
  )
}
