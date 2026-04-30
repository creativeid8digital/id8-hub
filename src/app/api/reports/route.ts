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

  // Verify admin
  const { data: me } = await admin.from('users').select('is_admin').eq('email', session.user.email).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  // All users
  const { data: users } = await admin.from('users').select('id, name, agency_role, avatar_url').not('name', 'is', null).order('name')

  // All tasks that were completed (approved or live) 
  const { data: completedTasks } = await admin.from('tasks')
    .select('id, title, assigned_to, status, due_date, created_at, updated_at, brand_id, brands(name)')
    .in('status', ['approved', 'live'])
    .gte('updated_at', `${month}-01`)
    .lt('updated_at', `${month}-31`)

  // Time logs for the month
  const { data: timeLogs } = await admin.from('time_logs')
    .select('user_id, task_id, duration_seconds')
    .eq('log_month', month)
    .not('stopped_at', 'is', null)

  // All tasks assigned this month (for pending count)
  const { data: allTasks } = await admin.from('tasks')
    .select('id, assigned_to, status, due_date, updated_at')
    .not('assigned_to', 'is', null)

  // Build per-user report
  const report = (users || []).map(user => {
    const myCompleted = (completedTasks || []).filter(t => t.assigned_to === user.id)
    const myTimeLogs = (timeLogs || []).filter(l => l.user_id === user.id)
    const myAllTasks = (allTasks || []).filter(t => t.assigned_to === user.id)
    
    const totalHours = myTimeLogs.reduce((a, l) => a + (l.duration_seconds || 0), 0) / 3600
    const totalSessions = myTimeLogs.length
    
    // On time vs late
    const onTime = myCompleted.filter(t => !t.due_date || new Date(t.updated_at) <= new Date(t.due_date)).length
    const late = myCompleted.filter(t => t.due_date && new Date(t.updated_at) > new Date(t.due_date)).length
    
    // Active tasks
    const active = myAllTasks.filter(t => !['approved', 'live'].includes(t.status)).length
    const overdue = myAllTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['approved', 'live'].includes(t.status)).length

    // Avg time to complete (days from created to approved)
    const completionTimes = myCompleted
      .filter(t => t.created_at && t.updated_at)
      .map(t => (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const avgDays = completionTimes.length ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0

    return {
      user,
      completed: myCompleted.length,
      active,
      overdue,
      onTime,
      late,
      totalHours: Math.round(totalHours * 10) / 10,
      totalSessions,
      avgDays: Math.round(avgDays * 10) / 10,
      recentTasks: myCompleted.slice(0, 5),
    }
  })

  return NextResponse.json({ report, month })
}
