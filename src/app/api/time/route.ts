import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch today's logs + active timer for current user on a task
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('task_id')

  const { data: me } = await admin.from('users').select('id').eq('email', session.user.email).single()
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check for active timer (any task)
  const { data: active } = await admin.from('time_logs')
    .select('*').eq('user_id', me.id).is('stopped_at', null).single()

  // Today's logs for this task
  const today = new Date().toISOString().split('T')[0]
  const { data: todayLogs } = taskId ? await admin.from('time_logs')
    .select('*').eq('user_id', me.id).eq('task_id', taskId).eq('log_date', today)
    .order('started_at', { ascending: false }) : { data: [] }

  return NextResponse.json({ active, todayLogs: todayLogs || [], userId: me.id })
}

// POST — start timer
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { task_id, brand_id } = await req.json()
  const { data: me } = await admin.from('users').select('id').eq('email', session.user.email).single()
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Stop any existing active timer first
  await admin.from('time_logs').update({ stopped_at: new Date().toISOString() })
    .eq('user_id', me.id).is('stopped_at', null)

  // Start new timer
  const { data, error } = await admin.from('time_logs').insert({
    task_id, user_id: me.id, brand_id: brand_id || null,
    started_at: new Date().toISOString(),
    log_date: new Date().toISOString().split('T')[0],
    log_month: new Date().toISOString().slice(0, 7),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT — stop timer
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { log_id } = await req.json()
  const stoppedAt = new Date().toISOString()

  const { data: log } = await admin.from('time_logs').select('started_at').eq('id', log_id).single()
  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  const duration = Math.floor((new Date(stoppedAt).getTime() - new Date(log.started_at).getTime()) / 1000)

  const { data, error } = await admin.from('time_logs')
    .update({ stopped_at: stoppedAt, duration_seconds: duration })
    .eq('id', log_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
