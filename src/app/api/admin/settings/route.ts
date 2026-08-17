import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { data, error } = await supabase.from('app_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])))
}

export async function PUT(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { key, value } = await request.json()
  if (!key) return NextResponse.json({ error: 'key가 필요합니다' }, { status: 400 })

  const { error } = await supabase.from('app_settings').upsert({ key, value })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
