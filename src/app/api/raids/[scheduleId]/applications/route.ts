import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getWeekDate, formatWeekDate } from '@/lib/weekDate'

type Params = { params: Promise<{ scheduleId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduleId } = await params

  // 이 스케줄의 마감 정보 조회
  const { data: schedule } = await supabase
    .from('raid_schedules')
    .select('raid_day:day_of_week, deadline_day, deadline_time')
    .eq('id', scheduleId)
    .single()

  if (!schedule) return NextResponse.json({ error: '스케줄을 찾을 수 없어요.' }, { status: 404 })

  const weekDate = formatWeekDate(
    getWeekDate(schedule.raid_day, schedule.deadline_day, schedule.deadline_time)
  )

  // 내 캐릭터들의 신청 현황
  const { data: myCharacters } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', session.userId)

  const myCharacterIds = myCharacters?.map((c) => c.id) ?? []

  const { data: applications, error } = await supabase
    .from('raid_applications')
    .select('character_id')
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)
    .in('character_id', myCharacterIds.length > 0 ? myCharacterIds : [''])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    weekDate,
    appliedCharacterIds: applications?.map((a) => a.character_id) ?? [],
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduleId } = await params
  const { characterIds, weekDate } = await request.json()

  if (!characterIds?.length) {
    return NextResponse.json({ error: '캐릭터를 선택해주세요.' }, { status: 400 })
  }

  // 내 캐릭터인지 확인
  const { data: myChars } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', session.userId)
    .in('id', characterIds)

  if (!myChars || myChars.length !== characterIds.length) {
    return NextResponse.json({ error: '잘못된 캐릭터 요청이에요.' }, { status: 403 })
  }

  // 기존 신청 삭제 후 재등록
  await supabase
    .from('raid_applications')
    .delete()
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)
    .in('character_id', myChars.map((c) => c.id))

  if (characterIds.length > 0) {
    const inserts = characterIds.map((characterId: string) => ({
      raid_schedule_id: scheduleId,
      character_id: characterId,
      week_date: weekDate,
    }))

    const { error } = await supabase.from('raid_applications').insert(inserts)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
