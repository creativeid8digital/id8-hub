import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get current user's ID and role
  const { data: me } = await admin.from('users').select('id, agency_role').eq('email', session.user.email).single()
  if (!me) return NextResponse.json([])

  // Get tasks assigned to this user
  const { data: myTasks } = await admin
    .from('tasks')
    .select('*, brands(name,color), briefs(title)')
    .eq('assigned_to', me.id)
    .neq('status', 'live')
    .order('due_date', { ascending: true, nullsFirst: false })

  // Get tasks assigned to user's team
  const { data: teamTasks } = me.agency_role ? await admin
    .from('tasks')
    .select('*, brands(name,color), briefs(title)')
    .eq('assigned_team', me.agency_role)
    .neq('status', 'live')
    .order('due_date', { ascending: true, nullsFirst: false }) : { data: [] }

  // Overdue tasks assigned to this user
  const today = new Date().toISOString().split('T')[0]
  const { data: overdue } = await admin
    .from('tasks')
    .select('*, brands(name,color), briefs(title)')
    .eq('assigned_to', me.id)
    .lt('due_date', today)
    .neq('status', 'live')
    .neq('status', 'approved')
    .order('due_date', { ascending: true })

  return NextResponse.json({
    mine: myTasks || [],
    team: teamTasks || [],
    overdue: overdue || [],
    userId: me.id,
    userRole: me.agency_role,
  })
}
