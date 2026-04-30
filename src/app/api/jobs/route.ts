import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { title, brand_id, description, drive_folder_url, brief_type, deliverables } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  // 1. Create the brief
  const { data: brief, error: briefError } = await admin.from('briefs').insert({
    title: title.trim(),
    brand_id: brand_id || null,
    brief_type: brief_type || 'campaign',
    status: 'in_progress',
    team: 'creative_team',
    description: description || null,
    drive_file_url: drive_folder_url || null,
  }).select().single()

  if (briefError || !brief) {
    return NextResponse.json({ error: briefError?.message || 'Failed to create brief' }, { status: 500 })
  }

  // 2. Create tasks for each deliverable
  const validDeliverables = (deliverables || []).filter((d: any) => d.title?.trim())
  if (validDeliverables.length === 0) {
    return NextResponse.json({ brief, tasks: [] })
  }

  const taskRows = validDeliverables.map((d: any) => ({
    title: d.title.trim(),
    brief_id: brief.id,
    brand_id: brand_id || null,
    assigned_to: d.assigned_to || null,
    due_date: d.due_date || null,
    status: d.assigned_to ? 'assigned' : 'brief',
    priority: 'medium',
    description: description || null,
  }))

  const { data: tasks, error: taskError } = await admin.from('tasks').insert(taskRows).select()
  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  // 3. Send notifications to assigned people
  const notifRows = (tasks || [])
    .filter((t: any) => t.assigned_to)
    .map((t: any) => ({
      user_id: t.assigned_to,
      type: 'task_assigned',
      title: `New task: ${t.title}`,
      body: `${title}${t.due_date ? ` — due ${t.due_date}` : ''}`,
      link_type: 'task',
      link_id: t.id,
    }))

  if (notifRows.length > 0) {
    await admin.from('notifications').insert(notifRows)
  }

  return NextResponse.json({ brief, tasks })
}

// GET all jobs (briefs with their tasks)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await admin
    .from('briefs')
    .select('*, brands(name, color)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
