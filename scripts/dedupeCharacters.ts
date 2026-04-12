import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function dedupeCharacters() {
  const { data: chars, error } = await supabase
    .from('characters')
    .select('id, user_id, nickname, class, combat_power')
    .order('created_at', { ascending: true })

  if (error || !chars) {
    console.error('캐릭터 조회 실패:', error?.message)
    return
  }

  console.log(`전체 캐릭터 수: ${chars.length}`)

  // user_id + nickname 기준으로 중복 탐지 → 먼저 삽입된 것(id 오름차순) 유지, 나머지 삭제
  const seen = new Map<string, string>() // key → 유지할 id
  const toDelete: string[] = []

  for (const char of chars) {
    const key = `${char.user_id}::${char.nickname}`
    if (seen.has(key)) {
      toDelete.push(char.id)
    } else {
      seen.set(key, char.id)
    }
  }

  if (toDelete.length === 0) {
    console.log('중복 없음!')
    return
  }

  console.log(`중복 ${toDelete.length}개 삭제 중...`)

  // raid_applications 먼저 정리
  const { error: appErr } = await supabase
    .from('raid_applications')
    .delete()
    .in('character_id', toDelete)

  if (appErr) console.error('신청 삭제 오류:', appErr.message)

  // 캐릭터 삭제
  const { error: delErr } = await supabase
    .from('characters')
    .delete()
    .in('id', toDelete)

  if (delErr) {
    console.error('삭제 실패:', delErr.message)
    return
  }

  console.log(`✅ ${toDelete.length}개 중복 삭제 완료 (남은 캐릭터: ${chars.length - toDelete.length}개)`)
}

dedupeCharacters().catch(console.error)
