import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getWeekDate, formatWeekDate } from '@/lib/weekDate'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scheduleId = new URL(request.url).searchParams.get('scheduleId')
  if (!scheduleId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  const { data: schedule } = await supabase
    .from('raid_schedules')
    .select('day_of_week, deadline_day, deadline_time')
    .eq('id', scheduleId)
    .single()

  if (!schedule) return NextResponse.json({ error: '스케줄 없음' }, { status: 404 })

  // 저장된 파티 중 가장 최근 주차를 우선 사용, 없으면 마감 기준으로 계산
  const { data: latestParty } = await supabase
    .from('parties')
    .select('week_date')
    .eq('raid_schedule_id', scheduleId)
    .order('week_date', { ascending: false })
    .limit(1)
    .single()

  const weekDate = latestParty?.week_date ?? formatWeekDate(
    getWeekDate(schedule.day_of_week, schedule.deadline_day, schedule.deadline_time)
  )
  const currentWeekDate = weekDate

  const [{ data: parties, error }, { data: myCharacters }] = await Promise.all([
    supabase
      .from('parties')
      .select(`
        party_number,
        party_members (
          source_character_id,
          is_duplicate,
          sort_order,
          characters (
            nickname, class, combat_power,
            users ( nickname )
          )
        )
      `)
      .eq('raid_schedule_id', scheduleId)
      .eq('week_date', weekDate)
      .order('party_number', { ascending: true }),
    supabase.from('characters').select('id').eq('user_id', session.userId),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const myIds = new Set((myCharacters ?? []).map((c) => c.id))

  const formatted = (parties ?? []).map((p) => ({
    partyNumber: p.party_number,
    members: [...(p.party_members ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m) => ({
        sourceCharacterId: m.source_character_id,
        isDuplicate: m.is_duplicate ?? false,
        nickname: (m.characters as any)?.nickname ?? '',
        class: (m.characters as any)?.class ?? '',
        combatPower: (m.characters as any)?.combat_power ?? 0,
        userNickname: (m.characters as any)?.users?.nickname ?? '',
        isMe: myIds.has(m.source_character_id),
      })),
  }))

  return NextResponse.json({ parties: formatted, weekDate })
}
