'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, Flag, ChevronRight } from 'lucide-react'

type Task = {
  id: string; title: string; status: string; priority: string
  due_date: string | null; assigned_team: string | null
  brands?: { name: string; color: string }; briefs?: { title: string }
  updated_at: string
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  brief:       { color: '#86868B', bg: '#F5F5F7' },
  assigned:    { color: '#7C3AED', bg: '#EDE9FE' },
  in_progress: { color: '#F59E0B', bg: '#FFFBEB' },
  submitted:   { color: '#3B82F6', bg: '#EFF6FF' },
  in_review:   { color: '#EC4899', bg: '#FDF2F8' },
  approved:    { color: '#10B981', bg: '#ECFDF5' },
  live:        { color: '#065F46', bg: '#D1FAE5' },
}
const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#10B981', bg: '#ECFDF5' },
  medium: { color: '#F59E0B', bg: '#FFFBEB' },
  high:   { color: '#EF4444', bg: '#FEE2E2' },
  urgent: { color: '#7C2D12', bg: '#FEF2F2' },
}

export default function MyTasks({ userEmail, onOpenTask }: { userEmail: string; onOpenTask: (id: string) => void }) {
  const [tasks, setTasks]       = useState<Task[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'mine' | 'team' | 'overdue'>('mine')

  useEffect(() => {
    supabase.from('users').select('id, agency_role').eq('email', userEmail).single()
      .then(({ data }) => { if (data) { setUserId(data.id); setUserRole(data.agency_role) } })
  }, [userEmail])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    let q = supabase.from('tasks').select('*, brands(name,color), briefs(title)')

    if (tab === 'mine') {
      q = q.eq('assigned_to', userId).neq('status', 'live')
    } else if (tab === 'team' && userRole) {
      q = q.eq('assigned_team', userRole).neq('status', 'live')
    } else if (tab === 'overdue') {
      q = q.lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'live').neq('status', 'approved')
    }

    q = q.order('updated_at', { ascending: false })
    const { data } = await q
    setTasks((data as Task[]) || [])
    setLoading(false)
  }, [userId, userRole, tab])

  useEffect(() => { if (userId) load() }, [userId, load])

  const isLate = (date: string | null) => date && new Date(date) < new Date()

  const grouped = tasks.reduce((acc: Record<string, Task[]>, t) => {
    const key = t.status
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>My Workspace</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Tasks assigned to you and your team</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F7', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'mine',   label: '👤 My Tasks'   },
          { key: 'team',   label: '👥 Team Tasks'  },
          { key: 'overdue',label: '⚠️ Overdue'     },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab === t.key ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t.label} {tab === t.key && tasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 100, marginLeft: 4 }}>{tasks.length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'overdue' ? '🎉' : '✅'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {tab === 'overdue' ? 'No overdue tasks!' : tab === 'mine' ? 'No tasks assigned to you' : 'No team tasks'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {tab === 'overdue' ? 'Everything is on track.' : 'Tasks assigned to you will appear here.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {Object.entries(grouped).map(([status, statusTasks]) => {
            const sc = STATUS_COLORS[status] || STATUS_COLORS.brief
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{status.replace('_', ' ')}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '1px 8px', borderRadius: 100 }}>{statusTasks.length}</div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {statusTasks.map(task => {
                    const pr = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                    return (
                      <div key={task.id} onClick={() => onOpenTask(task.id)}
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
                      >
                        {/* Priority dot */}
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: pr.color, flexShrink: 0 }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {((task.brands as any)?.name || (task.briefs as any)?.title) && (
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                              {(task.brands as any)?.name}{(task.briefs as any)?.title ? ` · ${(task.briefs as any).title}` : ''}
                            </div>
                          )}
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: pr.bg, color: pr.color }}>{task.priority}</span>
                          {task.due_date && (
                            <span style={{ fontSize: 11, color: isLate(task.due_date) ? '#EF4444' : 'var(--text-muted)', fontWeight: isLate(task.due_date) ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} />{isLate(task.due_date) ? '⚠ ' : ''}{task.due_date}
                            </span>
                          )}
                          <ChevronRight size={14} color="var(--text-muted)" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
