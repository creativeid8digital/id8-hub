'use client'
import { useEffect, useState } from 'react'

type UserReport = {
  user: { id: string; name: string; agency_role: string | null; avatar_url: string | null }
  completed: number; active: number; overdue: number
  onTime: number; late: number
  totalHours: number; totalSessions: number; avgDays: number
  recentTasks: any[]
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

export default function ReportsPanel() {
  const [data, setData] = useState<{ report: UserReport[]; month: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/reports?month=${month}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [month])

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading reports…</div>
  if (!data) return null

  const { report } = data
  const totalCompleted = report.reduce((a, r) => a + r.completed, 0)
  const totalHours = report.reduce((a, r) => a + r.totalHours, 0)
  const totalOverdue = report.reduce((a, r) => a + r.overdue, 0)

  // Sort by completed desc
  const sorted = [...report].sort((a, b) => b.completed - a.completed)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Team Reports</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Task efficiency and time tracking per team member</div>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }} />
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Tasks Completed', value: totalCompleted, color: '#10B981', icon: '✅' },
          { label: 'Total Hours Logged', value: `${totalHours.toFixed(1)}h`, color: 'var(--accent)', icon: '⏱' },
          { label: 'Overdue Tasks', value: totalOverdue, color: totalOverdue > 0 ? '#EF4444' : '#10B981', icon: '⚠️' },
          { label: 'Team Members', value: report.length, color: '#3B82F6', icon: '👥' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Per-user table */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 80px 80px 80px 80px 100px 100px 80px', gap: 0, background: '#F5F5F7', borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px' }}>
          {['Member', 'Done', 'Active', 'Overdue', 'On Time', 'Late', 'Hours', 'Avg Days'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No data for {month}. Tasks need to be completed and time logged to appear here.
          </div>
        ) : sorted.map(r => {
          const rc = ROLE_COLORS[r.user.agency_role || ''] || { color: '#86868B', bg: '#F5F5F7' }
          const efficiency = r.completed > 0 ? Math.round((r.onTime / r.completed) * 100) : 0
          const isExpanded = expanded === r.user.id

          return (
            <div key={r.user.id}>
              <div onClick={() => setExpanded(isExpanded ? null : r.user.id)}
                style={{ display: 'grid', gridTemplateColumns: '220px 80px 80px 80px 80px 100px 100px 80px', gap: 0, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                {/* Member */}
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

                {/* Done */}
                <div style={{ fontSize: 16, fontWeight: 700, color: r.completed > 0 ? '#10B981' : 'var(--text-muted)' }}>{r.completed}</div>

                {/* Active */}
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{r.active}</div>

                {/* Overdue */}
                <div style={{ fontSize: 16, fontWeight: 700, color: r.overdue > 0 ? '#EF4444' : 'var(--text-muted)' }}>
                  {r.overdue > 0 ? `⚠ ${r.overdue}` : r.overdue}
                </div>

                {/* On time */}
                <div style={{ fontSize: 14, fontWeight: 600, color: '#10B981' }}>{r.onTime}</div>

                {/* Late */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: r.late > 0 ? '#EF4444' : 'var(--text-muted)' }}>{r.late}</div>
                  {r.completed > 0 && (
                    <div style={{ marginTop: 4, height: 4, background: '#F5F5F7', borderRadius: 100, overflow: 'hidden', width: 70 }}>
                      <div style={{ height: '100%', width: `${efficiency}%`, background: efficiency >= 80 ? '#10B981' : efficiency >= 60 ? '#F59E0B' : '#EF4444', borderRadius: 100 }} />
                    </div>
                  )}
                </div>

                {/* Hours */}
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{r.totalHours}h</div>

                {/* Avg days */}
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{r.avgDays > 0 ? `${r.avgDays}d` : '—'}</div>
              </div>

              {/* Expanded — recent completed tasks */}
              {isExpanded && r.recentTasks.length > 0 && (
                <div style={{ padding: '12px 20px 16px 74px', background: '#FAFAFA', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Recent completed tasks</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {r.recentTasks.map((t: any) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.title}</span>
                        {(t.brands as any)?.name && <span style={{ color: 'var(--text-muted)' }}>· {(t.brands as any).name}</span>}
                        {t.due_date && (
                          <span style={{ marginLeft: 'auto', color: new Date(t.updated_at) > new Date(t.due_date) ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                            {new Date(t.updated_at) > new Date(t.due_date) ? '⚠ Late' : '✓ On time'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Click any row to see their recently completed tasks · Data updates in real time
      </div>
    </div>
  )
}
