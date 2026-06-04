import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ raidId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { raidId } = await params
  const body = await request.json()

  const { day_of_week, required_cp, recommended_cp, overwhelming_cp, party_size, deadline_day, deadline_time, sheet_url } = body

  if (!day_of_week || !party_size) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('raid_schedules')
    .insert({
      raid_id: raidId,
      day_of_week,
      required_cp: required_cp || null,
      recommended_cp: recommended_cp || null,
      overwhelming_cp: overwhelming_cp || null,
      party_size,
      deadline_day: deadline_day || day_of_week,
      deadline_time: deadline_time || '18:00:00',
      is_active: true,
      sheet_url: sheet_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
