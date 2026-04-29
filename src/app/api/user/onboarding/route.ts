import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_ROLES = [
  'am', 'creative_head', 'creative_team',
  'content_writer', 'publishing_team', 'performance', 'tech',
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const { agency_role } = body

  if (!VALID_ROLES.includes(agency_role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { data: config } = await supabaseAdmin
    .from('admin_config')
    .select('value')
    .eq('key', 'admin_emails')
    .single()

  const adminEmails: string[] = (config?.value as string[]) ?? []
  const isAdmin = adminEmails.includes(session.user.email)

  const { error } = await supabaseAdmin
    .from('users')
    .update({ agency_role, onboarding_complete: true, is_admin: isAdmin })
    .eq('email', session.user.email)

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, agency_role, is_admin: isAdmin })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, avatar_url, agency_role, is_admin, onboarding_complete')
    .eq('email', session.user.email)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
