import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q?.trim()) return NextResponse.json({ tasks: [], approvals: [] })
  const term = `%${q}%`
  const [{ data: tasks }, { data: approvals }] = await Promise.all([
    admin.from('tasks').select('id, title, status, brand_id, brands(name)').ilike('title', term).limit(10),
    admin.from('approvals').select('id, title, current_stage, brand_id, brands(name)').ilike('title', term).limit(10),
  ])
  return NextResponse.json({ tasks: tasks || [], approvals: approvals || [] })
}
