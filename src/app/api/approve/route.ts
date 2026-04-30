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

  const { approval_id, action, note } = await req.json()
  // action: 'approve' | 'reject'

  const { data: me } = await admin.from('users').select('id, name').eq('email', session.user.email).single()

  // Get approval + steps
  const { data: approval } = await admin.from('approvals').select('*, tasks:title').eq('id', approval_id).single()
  const { data: steps } = await admin.from('approval_steps').select('*').eq('approval_id', approval_id).order('step_order')

  if (!approval || !steps) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activeStep = steps.find((s: any) => s.status === 'in_review')
  if (!activeStep) return NextResponse.json({ error: 'No active step' }, { status: 400 })

  const now = new Date().toISOString()

  if (action === 'approve') {
    // Mark step approved
    await admin.from('approval_steps').update({ status: 'approved', actioned_by: me?.id, actioned_at: now, note: note || null }).eq('id', activeStep.id)

    // Find next step
    const nextStep = steps.find((s: any) => s.step_order === activeStep.step_order + 1)

    if (nextStep) {
      // Activate next step
      await admin.from('approval_steps').update({ status: 'in_review' }).eq('id', nextStep.id)
      // Update current_stage on approval
      await admin.from('approvals').update({
        creative_approved: activeStep.step_order >= 1 ? true : approval.creative_approved,
        am_approved: activeStep.step_order >= 2 ? true : approval.am_approved,
        current_stage: nextStep.assigned_role || 'am',
      }).eq('id', approval_id)
    } else {
      // All steps done — fully approved
      await admin.from('approvals').update({
        creative_approved: true, am_approved: true, client_approved: true,
      }).eq('id', approval_id)

      // Find the task linked to this approval by title + brand
      const { data: task } = await admin.from('tasks')
        .select('id, assigned_to').eq('title', approval.title).eq('brand_id', approval.brand_id).maybeSingle()

      if (task) {
        // Move task to approved
        await admin.from('tasks').update({ status: 'approved' }).eq('id', task.id)

        // Notify the assignee
        if (task.assigned_to) {
          await admin.from('notifications').insert({
            user_id: task.assigned_to,
            type: 'approved',
            title: `✅ Approved: ${approval.title}`,
            body: `Your work was approved by ${me?.name || 'Creative Head'}`,
            link_type: 'task',
            link_id: task.id,
          })
        }
      }
    }
  } else {
    // Reject — send back
    await admin.from('approval_steps').update({ status: 'rejected', actioned_by: me?.id, actioned_at: now, note: note || null }).eq('id', activeStep.id)

    // Reset all subsequent steps to pending
    await admin.from('approval_steps').update({ status: 'pending' })
      .eq('approval_id', approval_id).gt('step_order', activeStep.step_order)

    // Find task and move back to in_progress
    const { data: task } = await admin.from('tasks')
      .select('id, assigned_to').eq('title', approval.title).eq('brand_id', approval.brand_id).maybeSingle()

    if (task) {
      await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)

      // Notify the assignee with the rejection note
      if (task.assigned_to) {
        await admin.from('notifications').insert({
          user_id: task.assigned_to,
          type: 'rejected',
          title: `↩️ Sent back: ${approval.title}`,
          body: note || `Sent back by ${me?.name || 'Creative Head'} — please revise and resubmit`,
          link_type: 'task',
          link_id: task.id,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
