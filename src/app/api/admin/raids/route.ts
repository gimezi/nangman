import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { data, error } = await supabase
    .from('raids')
    .select(`
      id, name, image_url, created_at,
      raid_schedules (
        id, day_of_week, required_cp, recommended_cp, overwhelming_cp,
        party_size, deadline_day, deadline_time, is_active, sheet_url
      )
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { name, image_url } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '레이드 이름을 입력해주세요.' }, { status: 400 })

  const { data, error } = await supabase
    .from('raids')
    .insert({ name: name.trim(), image_url: image_url || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
