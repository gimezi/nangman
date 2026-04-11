import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabase } from '@/lib/supabase'

type Params = { params: Promise<{ scheduleId: string }> }

// 신청 인원 조회 포함
export async function GET(_: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params

  const { data, error } = await supabase
    .from('raid_applications')
    .select(`
      character_id,
      week_date,
      characters ( id, nickname, class, combat_power, users(nickname) )
    `)
    .eq('raid_schedule_id', scheduleId)
    .order('week_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('raid_schedules')
    .update(body)
    .eq('id', scheduleId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const { error } = await supabase.from('raid_schedules').delete().eq('id', scheduleId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
