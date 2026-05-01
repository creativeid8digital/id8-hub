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

  const { data: me } = await admin.from('users').select('id, name').eq('email', session.user.email).single()
  const { data: approval } = await admin.from('approvals').select('*').eq('id', approval_id).single()
  const { data: steps } = await admin.from('approval_steps').select('*').eq('approval_id', approval_id).order('step_order')

  if (!approval || !steps) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activeStep = steps.find((s: any) => s.status === 'in_review')
  if (!activeStep) return NextResponse.json({ error: 'No active step' }, { status: 400 })

  const now = new Date().toISOString()

  if (action === 'approve') {
    await admin.from('approval_steps').update({
      status: 'approved', actioned_by: me?.id, actioned_at: now, note: note || null
    }).eq('id', activeStep.id)

    const nextStep = steps.find((s: any) => s.step_order === activeStep.step_order + 1)

    if (nextStep) {
      await admin.from('approval_steps').update({ status: 'in_review' }).eq('id', nextStep.id)
      await admin.from('approvals').update({
        creative_approved: activeStep.step_order >= 1,
        current_stage: nextStep.assigned_role || 'am',
      }).eq('id', approval_id)
    } else {
      // All steps done — use task_id directly
      await admin.from('approvals').update({
        creative_approved: true, am_approved: true, client_approved: true,
      }).eq('id', approval_id)

      if (approval.task_id) {
        const { data: task } = await admin.from('tasks').select('id, assigned_to').eq('id', approval.task_id).single()
        if (task) {
          await admin.from('tasks').update({ status: 'approved' }).eq('id', task.id)
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
    }
  } else {
    // Reject — use task_id directly
    await admin.from('approval_steps').update({
      status: 'rejected', actioned_by: me?.id, actioned_at: now, note: note || null
    }).eq('id', activeStep.id)

    await admin.from('approval_steps').update({ status: 'pending' })
      .eq('approval_id', approval_id).gt('step_order', activeStep.step_order)

    if (approval.task_id) {
      const { data: task } = await admin.from('tasks').select('id, assigned_to').eq('id', approval.task_id).single()
      if (task) {
        await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)
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
  }

  return NextResponse.json({ ok: true })
}
