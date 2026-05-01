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
  if (!brandId) return NextResponse.json({ error: 'brand_id required' }, { status: 400 })
  const { data } = await admin.from('brand_manual').select('*').eq('brand_id', brandId).maybeSingle()
  return NextResponse.json(data || null)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { brand_id, ...fields } = body
  // Upsert
  const { data, error } = await admin.from('brand_manual')
    .upsert({ brand_id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'brand_id' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
