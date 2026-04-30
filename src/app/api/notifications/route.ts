import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: me } = await admin.from('users').select('id').eq('email', session.user.email).single()
  if (!me) return NextResponse.json([])
  const { data, error } = await admin.from('notifications').select('*')
    .eq('user_id', me.id).order('created_at', { ascending: false }).limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await req.json()
  const { data: me } = await admin.from('users').select('id').eq('email', session.user.email).single()
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (id) {
    await admin.from('notifications').update({ read: true }).eq('id', id).eq('user_id', me.id)
  } else {
    await admin.from('notifications').update({ read: true }).eq('user_id', me.id)
  }
  return NextResponse.json({ ok: true })
}
