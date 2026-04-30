import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: me } = await admin.from('users').select('is_admin').eq('email', session.user.email).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { data: users } = await admin.from('users').select('id, name, email, agency_role, is_admin, onboarding_complete, avatar_url, created_at').order('created_at')
  return NextResponse.json(users || [])
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: me } = await admin.from('users').select('is_admin').eq('email', session.user.email).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { id, agency_role, is_admin } = await req.json()
  const { data, error } = await admin.from('users').update({ agency_role, is_admin }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
