import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')
  let weekDate = searchParams.get('weekDate')

  if (!scheduleId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  // weekDate 미제공 시 → 가장 가까운 미래 주차 자동 선택
  if (!weekDate) {
    const { data: weeks } = await supabase
      .from('raid_applications')
      .select('week_date')
      .eq('raid_schedule_id', scheduleId)
      .order('week_date', { ascending: true })

    if (!weeks?.length) return NextResponse.json({ characters: [], weekDate: null })

    const today = new Date().toISOString().split('T')[0]
    const upcoming = weeks.find((w) => w.week_date >= today)
    weekDate = upcoming?.week_date ?? weeks[weeks.length - 1].week_date
  }

  const { data, error } = await supabase
    .from('raid_applications')
    .select(`
      character_id,
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
  })) ?? []

  return NextResponse.json({ characters, weekDate })
}
