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
  const { task_id, content } = await req.json()
  const { data: me } = await admin.from('users').select('id').eq('email', session.user.email).single()
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const { data, error } = await admin.from('task_comments').insert({ task_id, user_id: me.id, content }).select('*, users(name,avatar_url)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
