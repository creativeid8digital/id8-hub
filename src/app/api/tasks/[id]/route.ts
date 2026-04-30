import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [{ data: task }, { data: comments }] = await Promise.all([
    admin.from('tasks').select('*, brands(name,color), briefs(title,description,drive_file_url), users!tasks_assigned_to_fkey(id,name,avatar_url)').eq('id', params.id).single(),
    admin.from('task_comments').select('*, users(name,avatar_url)').eq('task_id', params.id).order('created_at', { ascending: true }),
  ])

  return NextResponse.json({ task, comments: comments || [] })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const updates = await req.json()
  const { data, error } = await admin.from('tasks').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
