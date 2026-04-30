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

  const { task_id } = await req.json()

  // Get task details
  const { data: task } = await admin.from('tasks')
    .select('*, brands(name), briefs(title)')
    .eq('id', task_id).single()
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Get submitter
  const { data: submitter } = await admin.from('users')
    .select('id, name').eq('email', session.user.email).single()

  // 1. Move task to in_review
  await admin.from('tasks').update({ status: 'in_review' }).eq('id', task_id)

  // 2. Create approval linked to this task
  const { data: approval } = await admin.from('approvals').insert({
    title: task.title,
    brand_id: task.brand_id,
    current_stage: 'creative',
    creative_approved: false,
    am_approved: false,
    client_approved: false,
    notes: `Submitted by ${submitter?.name || 'Team member'} for review`,
    drive_file_url: task.drive_file_url,
  }).select().single()

  if (approval) {
    // 3. Create approval steps
    await admin.from('approval_steps').insert([
      { approval_id: approval.id, step_order: 1, step_name: 'Creative Head Review', assigned_role: 'creative_head', status: 'in_review' },
      { approval_id: approval.id, step_order: 2, step_name: 'Account Manager Check', assigned_role: 'am', status: 'pending' },
    ])

    // 4. Notify all Creative Heads
    const { data: creativeHeads } = await admin.from('users')
      .select('id').eq('agency_role', 'creative_head')
    if (creativeHeads && creativeHeads.length > 0) {
      await admin.from('notifications').insert(
        creativeHeads.map(u => ({
          user_id: u.id,
          type: 'approval_needed',
          title: `Review needed: ${task.title}`,
          body: `${submitter?.name || 'Team member'} submitted work for review${(task.brands as any)?.name ? ` · ${(task.brands as any).name}` : ''}`,
          link_type: 'approval',
          link_id: approval.id,
        }))
      )
    }
  }

  return NextResponse.json({ ok: true, approval })
}
