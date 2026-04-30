'use client'
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type Task = {
  id: string; title: string; status: string; priority: string
  due_date: string | null; brands?: { name: string; color: string }
  briefs?: { title: string }; users?: { name: string }
}

const PIPELINE = [
  { key: 'brief',       label: 'Brief',       color: '#86868B', bg: '#F5F5F7' },
  { key: 'assigned',    label: 'Assigned',    color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'submitted',   label: 'Submitted',   color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'in_review',   label: 'In Review',   color: '#EC4899', bg: '#FDF2F8' },
  { key: 'approved',    label: 'Approved',    color: '#10B981', bg: '#ECFDF5' },
]

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  low:    { color: '#10B981', bg: '#ECFDF5' },
  medium: { color: '#F59E0B', bg: '#FFFBEB' },
  high:   { color: '#EF4444', bg: '#FEE2E2' },
  urgent: { color: '#7C2D12', bg: '#FEF2F2' },
}

export default function MyTasks({ onOpenTask }: { userEmail: string; onOpenTask: (id: string) => void }) {
  const [data, setData] = useState<{ mine: Task[]; team: Task[]; overdue: Task[] }>({ mine: [], team: [], overdue: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mine' | 'team' | 'overdue'>('mine')

  useEffect(() => {
    fetch('/api/mytasks').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const tasks = data[tab] || []
  const isLate = (date: string | null) => date && new Date(date) < new Date()
  const grouped = PIPELINE.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>My Tasks</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Tasks assigned to you — click to open</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F7', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'mine',    label: `👤 My Tasks (${data.mine.length})`   },
          { key: 'team',    label: `👥 Team (${data.team.length})`        },
          { key: 'overdue', label: `⚠️ Overdue (${data.overdue.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '7px 16px', borderRadius: 9, border: 'none', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab === t.key ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{tab === 'overdue' ? '🎉' : '✅'}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {tab === 'overdue' ? 'No overdue tasks!' : tab === 'mine' ? 'No tasks assigned to you yet' : 'No team tasks yet'}
          </div>
        </div>
      ) : (
        /* Same kanban layout as Task Pipeline */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(160px, 1fr))', gap: 12, alignItems: 'start', overflowX: 'auto' }}>
          {PIPELINE.map(col => {
            const cards = grouped[col.key] || []
            return (
              <div key={col.key} style={{ minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '7px 10px', background: col.bg, borderRadius: 10, border: `1px solid ${col.color}20` }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: col.color, flex: 1 }}>{col.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: col.color, background: `${col.color}20`, padding: '1px 6px', borderRadius: 100 }}>{cards.length}</div>
                </div>

                {cards.map(task => {
                  const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                  return (
                    <div key={task.id} onClick={() => onOpenTask(task.id)}
                      style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
                    >
                      {(task.brands as any)?.name && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(task.brands as any).name}{(task.briefs as any)?.title ? ` · ${(task.briefs as any).title}` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: task.due_date ? 8 : 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: pri.bg, color: pri.color }}>{task.priority}</span>
                      </div>
                      {task.due_date && (
                        <div style={{ fontSize: 11, color: isLate(task.due_date) ? '#EF4444' : 'var(--text-muted)', fontWeight: isLate(task.due_date) ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />{isLate(task.due_date) ? '⚠ ' : ''}{task.due_date}
                        </div>
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
