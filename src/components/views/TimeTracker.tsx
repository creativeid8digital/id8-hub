'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, Square, Clock, Calendar, Download } from 'lucide-react'

type Task = { id: string; title: string; brands?: { name: string; color: string } }
type TimeLog = {
  id: string; task_id: string; user_id: string; brand_id: string | null
  started_at: string; stopped_at: string | null; duration_seconds: number | null
  note: string | null; log_date: string; log_month: string
  tasks?: { title: string }; brands?: { name: string; color: string }
}
type UserProfile = { id: string; name: string; agency_role: string }

export default function TimeTracker({ brandId, userEmail }: { brandId: string; userEmail: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [selectedTask, setSelectedTask] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [tab, setTab] = useState<'timer' | 'today' | 'monthly'>('timer')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load user profile
  useEffect(() => {
    supabase.from('users').select('id, name, agency_role').eq('email', userEmail).single()
      .then(({ data }) => { if (data) setUser(data as UserProfile) })
  }, [userEmail])

  // Load tasks
  useEffect(() => {
    let q = supabase.from('tasks').select('id, title, brands(name,color)').neq('status', 'live').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    q.then(({ data }) => { if (data) setTasks(data as unknown as Task[]) })
  }, [brandId])

  // Load today's logs
  const loadLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('time_logs')
      .select('*, tasks(title), brands(name,color)')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .order('started_at', { ascending: false })
    setLogs((data as TimeLog[]) || [])
    // Check for active timer
    const active = (data as TimeLog[])?.find(l => !l.stopped_at)
    setActiveLog(active || null)
    if (active) {
      const secs = Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000)
      setElapsed(secs)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) loadLogs() }, [user, loadLogs])

  // Tick timer
  useEffect(() => {
    if (activeLog) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setElapsed(0)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeLog])

  const startTimer = async () => {
    if (!selectedTask || !user) return
    setStarting(true)
    const task = tasks.find(t => t.id === selectedTask)
    await supabase.from('time_logs').insert({
      task_id: selectedTask,
      user_id: user.id,
      brand_id: brandId || null,
      started_at: new Date().toISOString(),
      note: note || null,
    })
    setNote('')
    await loadLogs()
    setStarting(false)
  }

  const stopTimer = async () => {
    if (!activeLog) return
    setStopping(true)
    await supabase.from('time_logs').update({ stopped_at: new Date().toISOString() }).eq('id', activeLog.id)
    await loadLogs()
    setStopping(false)
  }

  const fmt = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const fmtDuration = (secs: number | null) => {
    if (!secs) return '—'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const todayTotal = logs.filter(l => l.duration_seconds).reduce((a, l) => a + (l.duration_seconds || 0), 0)

  const inputStyle: React.CSSProperties = {
    background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
    fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Time Tracker</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Log time per task — daily and monthly reports</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F7', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {(['timer', 'today', 'monthly'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {t === 'timer' ? '⏱ Timer' : t === 'today' ? '📅 Today' : '📊 Monthly'}
          </button>
        ))}
      </div>

      {/* ── TIMER TAB ── */}
      {tab === 'timer' && (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Big clock */}
          <div style={{ background: activeLog ? '#1D1D1F' : '#fff', border: '1px solid var(--border-subtle)', borderRadius: 24, padding: '40px 32px', textAlign: 'center', marginBottom: 20, boxShadow: activeLog ? '0 8px 32px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 0.4s' }}>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '0.04em', color: activeLog ? '#fff' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 12, fontFamily: 'var(--font-body)' }}>
              {fmt(elapsed)}
            </div>
            {activeLog && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                {(tasks.find(t => t.id === activeLog.task_id) as any)?.title || 'Running…'}
              </div>
            )}
            {!activeLog && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No timer running</div>
            )}
          </div>

          {!activeLog ? (
            <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Select Task *</label>
                <select style={inputStyle} value={selectedTask} onChange={e => setSelectedTask(e.target.value)}>
                  <option value="">Choose a task…</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{(t.brands as any)?.name ? `[${(t.brands as any).name}] ` : ''}{t.title}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Note (optional)</label>
                <input style={inputStyle} placeholder="What are you working on?" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <button onClick={startTimer} disabled={!selectedTask || starting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 100, background: !selectedTask ? '#E5E5EA' : 'var(--accent)', color: !selectedTask ? 'var(--text-muted)' : '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: !selectedTask ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: selectedTask ? '0 4px 16px rgba(124,58,237,0.35)' : 'none', transition: 'all 0.2s' }}>
                <Play size={16} fill="currentColor" /> {starting ? 'Starting…' : 'Start Timer'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {(tasks.find(t => t.id === activeLog.task_id) as any)?.title}
              </div>
              {activeLog.note && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{activeLog.note}</div>}
              <button onClick={stopTimer} disabled={stopping} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', borderRadius: 100, background: '#FEE2E2', color: '#EF4444', border: '1.5px solid #FECACA', fontSize: 14, fontWeight: 700, cursor: stopping ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>
                <Square size={14} fill="currentColor" /> {stopping ? 'Stopping…' : 'Stop Timer'}
              </button>
            </div>
          )}

          {/* Today summary */}
          {todayTotal > 0 && (
            <div style={{ marginTop: 16, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={14} color="#10B981" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Today: {fmtDuration(todayTotal)} logged</span>
            </div>
          )}
        </div>
      )}

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
              Total: {fmtDuration(todayTotal)}
            </div>
          </div>

          {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div> :
            logs.filter(l => l.stopped_at).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 16, border: '1.5px dashed var(--border-default)', color: 'var(--text-muted)', fontSize: 13 }}>
                No time logged today yet. Start the timer!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {logs.filter(l => l.stopped_at).map(log => (
                  <div key={log.id} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={16} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(log.tasks as any)?.title || '—'}</div>
                      {log.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.note}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(log.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(log.stopped_at!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {fmtDuration(log.duration_seconds)}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── MONTHLY TAB ── */}
      {tab === 'monthly' && user && <MonthlyReport userId={user.id} />}
    </div>
  )
}

// ── Monthly report sub-component ──────────────────────────────────────
function MonthlyReport({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    setLoading(true)
    supabase.from('time_logs')
      .select('*, tasks(title), brands(name,color)')
      .eq('user_id', userId)
      .eq('log_month', currentMonth)
      .not('stopped_at', 'is', null)
      .order('log_date', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [userId, currentMonth])

  const totalSecs = rows.reduce((a, r) => a + (r.duration_seconds || 0), 0)
  const totalHours = (totalSecs / 3600).toFixed(1)

  // Group by date
  const byDate = rows.reduce((acc: Record<string, any[]>, r) => {
    const d = r.log_date
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  const fmtDuration = (secs: number | null) => {
    if (!secs) return '—'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Hours', value: `${totalHours}h`, color: 'var(--accent)' },
          { label: 'Sessions',    value: rows.length,       color: '#10B981'       },
          { label: 'Working Days',value: Object.keys(byDate).length, color: '#3B82F6' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {Object.keys(byDate).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 16, border: '1.5px dashed var(--border-default)', color: 'var(--text-muted)', fontSize: 13 }}>
          No time logged this month yet.
        </div>
      ) : (
        Object.entries(byDate).map(([date, dayLogs]) => {
          const dayTotal = (dayLogs as any[]).reduce((a, l) => a + (l.duration_seconds || 0), 0)
          return (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{fmtDuration(dayTotal)}</div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {(dayLogs as any[]).map(log => (
                  <div key={log.id} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{log.tasks?.title || '—'}</div>
                    {log.brands?.name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.brands.name}</div>}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtDuration(log.duration_seconds)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
