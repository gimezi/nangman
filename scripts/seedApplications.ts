import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function seedApplications() {
  // 스케줄 가져오기
  const { data: schedules } = await supabase
    .from('raid_schedules')
    .select('id, day_of_week, deadline_day, deadline_time')

  if (!schedules?.length) {
    console.error('스케줄 없음')
    return
  }

  // 모든 캐릭터 가져오기
  const { data: characters } = await supabase
    .from('characters')
    .select('id, nickname, user_id')

  if (!characters?.length) {
    console.error('캐릭터 없음')
    return
  }

  // week_date 계산 (다음 해당 요일)
  const DAY_MAP: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }
  function getWeekDate(raidDay: string, deadlineDay: string, deadlineTime: string): string {
    const now = new Date()
    const todayIdx = now.getDay()
    const deadlineDayIdx = DAY_MAP[deadlineDay]
    let deadlineDiff = deadlineDayIdx - todayIdx
    if (deadlineDiff < 0) deadlineDiff += 7
    const deadlineDate = new Date(now)
    deadlineDate.setDate(now.getDate() + deadlineDiff)
    const [h, m] = deadlineTime.split(':').map(Number)
    deadlineDate.setHours(h, m, 0, 0)
    if (deadlineDiff === 0 && now > deadlineDate) deadlineDiff += 7

    const raidDayIdx = DAY_MAP[raidDay]
    const raidDiff = raidDayIdx - todayIdx + (deadlineDiff >= 7 ? 7 : 0)
    const raidDate = new Date(now)
    raidDate.setDate(now.getDate() + (raidDiff < 0 ? raidDiff + 7 : raidDiff))
    return raidDate.toISOString().split('T')[0]
  }

  // 기존 신청 삭제
  await supabase.from('raid_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('기존 신청 삭제 완료')

  // 각 스케줄에 랜덤으로 캐릭터 신청 (유저당 1~2개)
  const userIds = [...new Set(characters.map((c) => c.user_id))]

  for (const schedule of schedules) {
    const weekDate = getWeekDate(schedule.day_of_week, schedule.deadline_day, schedule.deadline_time)
    const inserts: { raid_schedule_id: string; character_id: string; week_date: string }[] = []

    for (const userId of userIds) {
      const userChars = characters.filter((c) => c.user_id === userId)
      // 유저당 최대 2개 캐릭터 신청
      const pick = userChars.slice(0, Math.min(2, userChars.length))
      for (const char of pick) {
        inserts.push({ raid_schedule_id: schedule.id, character_id: char.id, week_date: weekDate })
      }
    }

    const { error } = await supabase.from('raid_applications').insert(inserts)
    if (error) console.error(`신청 삽입 실패 [${schedule.day_of_week}]:`, error.message)
    else console.log(`✅ ${schedule.day_of_week} 스케줄 - ${inserts.length}개 신청 등록 (${weekDate})`)
  }

  console.log('\n🎉 테스트 신청 데이터 완료!')
}

seedApplications().catch(console.error)
