import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')
  let weekDate = searchParams.get('weekDate')

  if (!scheduleId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  // 사용 가능한 날짜 목록 (최신순)
  const { data: weeks } = await supabase
    .from('raid_applications')
    .select('week_date')
    .eq('raid_schedule_id', scheduleId)
    .order('week_date', { ascending: false })

  const availableWeekDates = [...new Set((weeks ?? []).map((w) => w.week_date))]

  if (!availableWeekDates.length) return NextResponse.json({ characters: [], weekDate: null, availableWeekDates: [] })

  // weekDate 미제공 시 → 가장 최신 주차
  if (!weekDate) weekDate = availableWeekDates[0]

  const { data, error } = await supabase
    .from('raid_applications')
    .select(`
      character_id,
      is_volunteer,
      characters ( id, nickname, class, combat_power, users(nickname) )
    `)
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const characters = data?.map((a: any) => ({
    id: a.characters.id,
    nickname: a.characters.nickname,
    class: a.characters.class,
    combat_power: a.characters.combat_power,
    userNickname: a.characters.users?.nickname ?? '',
    isVolunteer: a.is_volunteer ?? false,
  })) ?? []

  return NextResponse.json({ characters, weekDate, availableWeekDates })
}
