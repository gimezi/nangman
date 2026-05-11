import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLASS_MAP: Record<string, string> = {
  힐러: 'healer', 사제: 'priest', 수도사: 'monk', 수도: 'monk',
  전사: 'warrior', 대검전사: 'greatswordWarrior', 대검: 'greatswordWarrior',
  검술사: 'swordsman', 검술: 'swordsman',
  마법사: 'mage', 법사: 'mage',
  화염술사: 'pyromancer', 화염: 'pyromancer', 화법: 'pyromancer',
  빙결술사: 'cryomancer', 빙결: 'cryomancer',
  궁수: 'archer', 석궁사수: 'crossbowman', 석궁: 'crossbowman',
  장궁병: 'longbowman', 장궁: 'longbowman',
  음유시인: 'bard', 음유: 'bard', 댄서: 'dancer', 악사: 'musician',
  격투가: 'fighter', 격투: 'fighter', 격가: 'fighter',
  암흑술사: 'darkMage', 암술: 'darkMage',
  전격술사: 'lightningMage', 전격: 'lightningMage',
  도적: 'rogue', 듀얼블레이드: 'dualBlade', 듀블: 'dualBlade',
}

const RAW = `금털이/장궁/7.0(지원)
금털이/검술/5.4
체리블라썸/댄서/6.7
체리블라썸/음유/5.7
체리블라썸/6.0/검술
체리블라썸/힐러/6.0
체리블라썸/화법/6.3
체리블라썸/빙결/5.7
Days/화법/6.7
Days/빙결/6.4
Days/검술/6.4
Days/수도/6.2
Days/전사/6.0
Days/궁수/5.6
프레시/빙결/7.0
프레시/수도/6.3
프레시/석궁/6.5
프레시/암술/6.0
프레시/대검/6.0
밍아/화법/6.5
밍아/힐러/6.2
밍아/검술/6.0
시조유미르/수도/7.0
시조유미르/대검/6.4
시조유미르/화법/6.2
시조유미르/석궁/6.4
시조유미르/음유/6.2
시조유미르/격가/6.2
데드풀/장궁/6.4
데드풀/음유/6.2
데드풀/법사/6.2
리오앨리/법사/7.0(지원)
리오앨리/전격/6.3
리오앨리/검술/6.0
깜군/궁수/6.6
키위소스돈까스/검방/6.6(지원)
키위소스돈까스/빙결/5.7(지원)
섀도/화법/6.8
섀도/음유/6.3
섀도/검술/6.1
섀도/힐러/5.8
섀도/격투/6.0
섀도/빙결/5.8
츄벅/음유/6.6
츄벅/도적/6.3
츄벅/석궁/6.2
츄벅/힐러/6.2
츄벅/암술/6.1
모염/화법/6.0
영유아/석궁/7.0
영유아/힐러/6.0
영유아/대검/6.0
영유아/검술/6.0
영유아/수도/6.0
영유아/빙결/6.0
파닥몬/격투/6.5
파닥몬/수도/6.3
파닥몬/검술/6.3
파닥몬/빙결/6.2
파닥몬/힐러/5.9
파닥몬/궁수/4.5(몰리)
송가을/사제/6.5
무크롱/검술/6.6(지원)
무크롱/격가/5.5
무크롱/힐러/5.2
구상/검술/6.3
구상/대검/6.0
구상/전격/5.8
구상/힐러/5.7
구상/전사/5.8
구상/사제/4.8
우치즈/암술/6.8
우치즈/대검/6.2
우치즈/격가/6.2
우치즈/장궁/6.2
우치즈/악사/6.2
우치즈/법사/6.0
필릭스용복리/힐러/6.0
필릭스용복리/빙결/5.4
나요/빙결/6.2
나요/수도/5.1
강소연/힐러/6.1
강소연/전격/5.1`

const WEEK_DATE = '2026-05-12'

function parseRaw() {
  return RAW.trim().split('\n').map((line) => {
    const raw = line.trim()
    const isVolunteer = raw.includes('(지원)')
    const cleaned = raw.replace(/\(.*?\)/g, '').trim()
    const parts = cleaned.split('/').map((s) => s.trim())
    const [a, b, c] = parts
    const bNum = parseFloat(b)
    const isReversed = !isNaN(bNum)
    const userNickname = a
    const classLabel = isReversed ? c : b
    const cls = CLASS_MAP[classLabel] ?? classLabel
    return { userNickname, cls, isVolunteer }
  })
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.')
    process.exit(1)
  }

  // 타매어 화요일 스케줄 찾기
  const { data: raids } = await supabase
    .from('raids')
    .select('id, name, raid_schedules(id, day_of_week)')

  const tamaer = raids?.find((r) => r.name.includes('타매어'))
  if (!tamaer) {
    console.error('❌ 타매어 레이드를 찾을 수 없습니다.')
    process.exit(1)
  }

  const tueSchedule = (tamaer.raid_schedules as { id: string; day_of_week: string }[])
    .find((s) => s.day_of_week === 'tue')
  if (!tueSchedule) {
    console.error('❌ 타매어 화요일 스케줄을 찾을 수 없습니다.')
    process.exit(1)
  }
  console.log(`✅ 스케줄 찾음: ${tamaer.name} 화요일 (id: ${tueSchedule.id})`)

  const entries = parseRaw()

  // 유저 목록 조회 (없으면 패스)
  const userNicknames = [...new Set(entries.map((e) => e.userNickname))]
  const userIdMap: Record<string, string> = {}

  for (const nickname of userNicknames) {
    const { data } = await supabase.from('users').select('id').eq('nickname', nickname).single()
    if (data) {
      userIdMap[nickname] = data.id
    } else {
      console.log(`⏭️  유저 없음 (패스): ${nickname}`)
    }
  }

  // 기존 신청 삭제
  await supabase
    .from('raid_applications')
    .delete()
    .eq('raid_schedule_id', tueSchedule.id)
    .eq('week_date', WEEK_DATE)
  console.log('🗑️  기존 신청 초기화 완료')

  // 신청 처리
  const usedCharIds: Map<string, string[]> = new Map()
  const inserts: { raid_schedule_id: string; character_id: string; week_date: string; is_volunteer: boolean }[] = []

  for (const entry of entries) {
    const userId = userIdMap[entry.userNickname]
    if (!userId) continue

    const key = `${userId}__${entry.cls}`
    const alreadyUsed = usedCharIds.get(key) ?? []

    const { data: chars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', userId)
      .eq('class', entry.cls)

    const available = (chars ?? []).filter((c) => !alreadyUsed.includes(c.id))

    if (available.length === 0) {
      console.log(`⏭️  캐릭터 없음 (패스): ${entry.userNickname} / ${entry.cls}`)
      continue
    }

    const charId = available[0].id
    usedCharIds.set(key, [...alreadyUsed, charId])
    inserts.push({
      raid_schedule_id: tueSchedule.id,
      character_id: charId,
      week_date: WEEK_DATE,
      is_volunteer: entry.isVolunteer,
    })
  }

  const { error } = await supabase.from('raid_applications').insert(inserts)
  if (error) {
    console.error('❌ 신청 삽입 실패:', error.message)
  } else {
    console.log(`\n🎉 완료! ${inserts.length}개 신청 등록 (${WEEK_DATE} 타매어 화요일)`)
  }
}

main().catch(console.error)
