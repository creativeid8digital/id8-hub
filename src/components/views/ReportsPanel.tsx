'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, Clock } from 'lucide-react'

type UserReport = {
  user: { id: string; name: string; agency_role: string | null }
  completed: number; active: number; overdue: number
  onTime: number; late: number
  totalHours: number; totalSessions: number; avgDays: number
}

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  am:              { color: '#10B981', bg: '#ECFDF5' },
  creative_head:   { color: '#7C3AED', bg: '#EDE9FE' },
  creative_team:   { color: '#6D28D9', bg: '#EDE9FE' },
  content_writer:  { color: '#3B82F6', bg: '#EFF6FF' },
  publishing_team: { color: '#EC4899', bg: '#FDF2F8' },
  performance:     { color: '#F59E0B', bg: '#FFFBEB' },
  tech:            { color: '#06B6D4', bg: '#ECFEFF' },
}

const fmtHours = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ReportsPanel() {
  const [report, setReport] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedUser, setSelectedUser] = useState<UserReport | null>(null)
  const [detail, setDetail] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadSummary = async () => {
    setLoading(true)
    const res = await fetch(`/api/reports?month=${month}`)
    const d = await res.json()
    setReport(d.report || [])
    setLoading(false)
  }

  const loadDetail = async (user: UserReport) => {
    setSelectedUser(user)
    setDetailLoading(true)
    const res = await fetch(`/api/reports?month=${month}&user_id=${user.user.id}`)
    const d = await res.json()
    setDetail(d.taskBreakdown || [])
    setDetailLoading(false)
  }

  useEffect(() => { loadSummary() }, [month])

  const sorted = [...report].sort((a, b) => b.completed - a.completed)
  const totalCompleted = report.reduce((a, r) => a + r.completed, 0)
  const totalHours = report.reduce((a, r) => a + r.totalHours, 0)
  const totalOverdue = report.reduce((a, r) => a + r.overdue, 0)

  // ── DETAIL VIEW ───────────────────────────────────────────────────
  if (selectedUser) return (
    <div>
      <button onClick={() => setSelectedUser(null)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
        <ArrowLeft size={14} /> Back to Team Reports
      </button>

      {/* User header */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (ROLE_COLORS[selectedUser.user.agency_role || ''] || { bg: '#F5F5F7' }).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: (ROLE_COLORS[selectedUser.user.agency_role || ''] || { color: '#86868B' }).color, flexShrink: 0 }}>
          {selectedUser.user.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedUser.user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{selectedUser.user.agency_role?.replace('_', ' ')} · {month}</div>
        </div>
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Tasks Done',   value: selectedUser.completed, color: '#10B981' },
            { label: 'Hours Logged', value: `${selectedUser.totalHours}h`, color: 'var(--accent)' },
            { label: 'On Time',      value: `${selectedUser.completed > 0 ? Math.round(selectedUser.onTime / selectedUser.completed * 100) : 0}%`, color: selectedUser.completed > 0 && selectedUser.onTime / selectedUser.completed >= 0.8 ? '#10B981' : '#F59E0B' },
            { label: 'Overdue',      value: selectedUser.overdue, color: selectedUser.overdue > 0 ? '#EF4444' : '#10B981' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task time breakdown */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Time spent per task — {month}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click a task row to see individual sessions</div>
        </div>

        {detailLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : detail.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏱</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No time logged for {month}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This team member hasn't logged time this month using the timer in task detail.</div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 120px 100px', gap: 0, background: '#F5F5F7', padding: '10px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Task', 'Brand', 'Sessions', 'Time Spent', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>

            {detail.map((row: any, i: number) => {
              const task = row.task
              const brand = task.brands as any
              const statusColor: Record<string, string> = { approved: '#10B981', live: '#065F46', in_progress: '#F59E0B', submitted: '#3B82F6', in_review: '#EC4899', assigned: '#7C3AED', brief: '#86868B' }
              const isLate = task.due_date && new Date(task.updated_at) > new Date(task.due_date)
              return (
                <div key={task.id} style={{ borderBottom: i < detail.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 120px 100px', gap: 0, padding: '14px 24px', transition: 'background 0.1s', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                      {task.due_date && (
                        <div style={{ fontSize: 11, color: isLate ? '#EF4444' : 'var(--text-muted)', marginTop: 2 }}>
                          {isLate ? '⚠ Late — ' : ''}Due {task.due_date}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{brand?.name || '—'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{row.sessions.length}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="var(--accent)" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{fmtHours(row.totalSeconds)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: `${statusColor[task.status] || '#86868B'}18`, color: statusColor[task.status] || '#86868B' }}>
                        {task.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Session breakdown */}
                  {row.sessions.length > 1 && (
                    <div style={{ padding: '0 24px 12px 48px' }}>
                      {row.sessions.map((s: any) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', borderTop: '1px solid var(--border-subtle)' }}>
                          <span>{new Date(s.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(s.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} → {new Date(s.stopped_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent)' }}>{fmtHours(s.duration_seconds)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Total */}
            <div style={{ padding: '14px 24px', background: '#F5F3FF', borderTop: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Total time logged this month</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                {fmtHours(detail.reduce((a: number, r: any) => a + r.totalSeconds, 0))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // ── SUMMARY VIEW ─────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Team Reports</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Click any member to see their task-level time breakdown</div>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }} />
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Tasks Completed', value: totalCompleted, color: '#10B981', icon: '✅' },
          { label: 'Hours Logged',    value: `${totalHours.toFixed(1)}h`, color: 'var(--accent)', icon: '⏱' },
          { label: 'Overdue',         value: totalOverdue, color: totalOverdue > 0 ? '#EF4444' : '#10B981', icon: '⚠️' },
          { label: 'Team Members',    value: report.length, color: '#3B82F6', icon: '👥' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 70px 80px 90px 80px', background: '#F5F5F7', borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px', gap: 0 }}>
            {['Member', 'Done', 'Active', 'Overdue', 'Late', 'On Time %', 'Hours', 'Avg Days'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
            ))}
          </div>

          {sorted.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No completed tasks or time logs for {month} yet.
            </div>
          ) : sorted.map(r => {
            const rc = ROLE_COLORS[r.user.agency_role || ''] || { color: '#86868B', bg: '#F5F5F7' }
            const efficiency = r.completed > 0 ? Math.round(r.onTime / r.completed * 100) : 0
            return (
              <div key={r.user.id} onClick={() => loadDetail(r)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 70px 80px 90px 80px', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center', gap: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F5F3FF'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: rc.color, flexShrink: 0 }}>
                    {r.user.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.user.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 100, background: rc.bg, color: rc.color }}>
                      {r.user.agency_role?.replace('_', ' ') || '—'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.completed > 0 ? '#10B981' : 'var(--text-muted)' }}>{r.completed}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{r.active}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: r.overdue > 0 ? '#EF4444' : 'var(--text-muted)' }}>{r.overdue > 0 ? `⚠ ${r.overdue}` : '—'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: r.late > 0 ? '#EF4444' : 'var(--text-muted)' }}>{r.late || '—'}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: efficiency >= 80 ? '#10B981' : efficiency >= 60 ? '#F59E0B' : efficiency > 0 ? '#EF4444' : 'var(--text-muted)' }}>{r.completed > 0 ? `${efficiency}%` : '—'}</div>
                  {r.completed > 0 && (
                    <div style={{ marginTop: 4, height: 4, background: '#F5F5F7', borderRadius: 100, overflow: 'hidden', width: 60 }}>
                      <div style={{ height: '100%', width: `${efficiency}%`, background: efficiency >= 80 ? '#10B981' : efficiency >= 60 ? '#F59E0B' : '#EF4444', borderRadius: 100 }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: r.totalHours > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{r.totalHours > 0 ? `${r.totalHours}h` : '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.avgDays > 0 ? `${r.avgDays}d` : '—'}</div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Click any row → see time spent per task with full session breakdown
      </div>
    </div>
  )
}
