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
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brand_id')

  let q = admin.from('tasks').select('*, brands(name,color), briefs(title)').order('created_at', { ascending: false })
  if (brandId) q = q.eq('brand_id', brandId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tasks = data || []
  const assignedIds: string[] = []
  tasks.forEach((t: any) => { if (t.assigned_to && !assignedIds.includes(t.assigned_to)) assignedIds.push(t.assigned_to) })

  const userMap: Record<string, any> = {}
  if (assignedIds.length > 0) {
    const { data: users } = await admin.from('users').select('id, name, avatar_url').in('id', assignedIds)
    if (users) users.forEach((u: any) => { userMap[u.id] = u })
  }

  return NextResponse.json(tasks.map((t: any) => ({ ...t, users: t.assigned_to ? userMap[t.assigned_to] : null })))
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id, ...updates } = await req.json()
  const { data, error } = await admin.from('tasks').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
