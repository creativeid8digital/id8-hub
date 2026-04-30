import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: me } = await admin.from('users').select('is_admin').eq('email', session.user.email).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const userId = searchParams.get('user_id') // for detail view

  // ── DETAIL MODE — one user's full task breakdown ──────────────────
  if (userId) {
    const { data: timeLogs } = await admin
      .from('time_logs')
      .select('*, tasks(id, title, status, due_date, brands(name))')
      .eq('user_id', userId)
      .eq('log_month', month)
      .not('stopped_at', 'is', null)
      .order('started_at', { ascending: false })

    // Group by task
    const taskMap: Record<string, any> = {}
    for (const log of (timeLogs || [])) {
      const task = (log as any).tasks
      if (!task) continue
      if (!taskMap[task.id]) {
        taskMap[task.id] = {
          task,
          sessions: [],
          totalSeconds: 0,
        }
      }
      taskMap[task.id].sessions.push(log)
      taskMap[task.id].totalSeconds += log.duration_seconds || 0
    }

    return NextResponse.json({
      taskBreakdown: Object.values(taskMap).sort((a: any, b: any) => b.totalSeconds - a.totalSeconds),
      month,
    })
  }

  // ── SUMMARY MODE — all users ──────────────────────────────────────
  const { data: users } = await admin
    .from('users').select('id, name, agency_role, avatar_url')
    .not('name', 'is', null).order('name')

  const { data: allTasks } = await admin
    .from('tasks').select('id, title, assigned_to, status, due_date, created_at, updated_at, brands(name)')
    .not('assigned_to', 'is', null)

  const { data: timeLogs } = await admin
    .from('time_logs').select('user_id, task_id, duration_seconds')
    .eq('log_month', month).not('stopped_at', 'is', null)

  const report = (users || []).map(user => {
    const myTasks = (allTasks || []).filter((t: any) => t.assigned_to === user.id)
    const myLogs  = (timeLogs  || []).filter((l: any) => l.user_id   === user.id)

    const completed = myTasks.filter((t: any) => ['approved','live'].includes(t.status))
    const active    = myTasks.filter((t: any) => !['approved','live'].includes(t.status))
    const overdue   = active.filter((t: any) => t.due_date && new Date(t.due_date) < new Date())

    const onTime = completed.filter((t: any) => !t.due_date || new Date(t.updated_at) <= new Date(t.due_date)).length
    const late   = completed.filter((t: any) =>  t.due_date && new Date(t.updated_at) >  new Date(t.due_date)).length

    const totalSeconds  = myLogs.reduce((a: number, l: any) => a + (l.duration_seconds || 0), 0)
    const totalHours    = Math.round(totalSeconds / 360) / 10
    const totalSessions = myLogs.length

    const completionTimes = completed
      .filter((t: any) => t.created_at && t.updated_at)
      .map((t: any) => (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 86400000)
    const avgDays = completionTimes.length
      ? Math.round(completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length * 10) / 10
      : 0

    return {
      user,
      completed: completed.length,
      active: active.length,
      overdue: overdue.length,
      onTime, late,
      totalHours, totalSessions, avgDays,
    }
  })

  return NextResponse.json({ report, month })
}
