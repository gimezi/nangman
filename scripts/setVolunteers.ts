import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WEEK_DATE = '2026-05-12'
const SCHEDULE_ID = '7aacf928-1cc2-49b5-b4b9-6f3d657542b9'

async function main() {
  const { data, error } = await supabase
    .from('raid_applications')
    .select('character_id')
    .eq('raid_schedule_id', SCHEDULE_ID)
    .eq('week_date', WEEK_DATE)

  if (error || !data?.length) {
    console.error('신청 목록 조회 실패:', error?.message)
    return
  }

  // 랜덤 4개 선택
  const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 4)
  const ids = shuffled.map((r) => r.character_id)

  const { error: updateError } = await supabase
    .from('raid_applications')
    .update({ is_volunteer: true })
    .eq('raid_schedule_id', SCHEDULE_ID)
    .eq('week_date', WEEK_DATE)
    .in('character_id', ids)

  if (updateError) {
    console.error('❌ 업데이트 실패:', updateError.message)
  } else {
    console.log(`✅ 지원(volunteer) 4명 설정 완료`)
  }
}

main().catch(console.error)
