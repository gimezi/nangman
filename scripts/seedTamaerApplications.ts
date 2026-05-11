import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CLASS_MAP: Record<string, string> = {
  힐러: 'healer', 사제: 'priest', 수도사: 'monk', 수도: 'monk',
  전사: 'warrior', 대검전사: 'greatswordWarrior', 대검: 'greatswordWarrior',
  검술사: 'swordsman', 검술: 'swordsman',
  마법사: 'mage', 법사: 'mage',
  화염술사: 'pyromancer', 화염: 'pyromancer', 화법: 'pyromancer',
  빙결술사: 'cryomancer', 빙결: 'cryomancer',
  궁수: 'archer', 석궁사수: 'crossbowman', 석궁: 'crossbowman', 장궁병: 'longbowman',
  음유시인: 'bard', 음유: 'bard', 댄서: 'dancer', 악사: 'musician',
  격투가: 'fighter', 격투: 'fighter', 격가: 'fighter',
  암흑술사: 'darkMage', 암술: 'darkMage',
  전격술사: 'lightningMage', 전격: 'lightningMage',
  도적: 'rogue', 듀얼블레이드: 'dualBlade', 듀블: 'dualBlade',
}

// 유저닉네임 / 직업 / 전투력 (일부는 유저닉네임 / 전투력 / 직업 순서)
const RAW = `모염/화법/6.3
반항/기사/6.4
반항/빙결/5.5
시조유미르/기사/7.0
시조유미르/대검/6.5
시조유미르/빙결/6.4
시조유미르/석궁/6.5
시조유미르/음유/6.5
시조유미르/전사/6.4
체리블라썸/댄서/6.8
체리블라썸/기사/6.0
체리블라썸/검술/6.3
체리블라썸/힐러/6.1
체리블라썸/화법/6.4
체리블라썸/빙결/5.8
반항/빙결/5.6
반항/빙결/5.3
반항/빙결/5.3
반항/빙결/5.0
필릭스용복리/힐러/6.3
필릭스용복리/빙결/5.7
리오앨리/법사/7.1
리오앨리/6.5/전격
리오앨리/6.2/듀블
리오앨리/궁수/4.8
테프론/격가/7.0
테프론/수도/6.8
테프론/기사/6.4
테프론/화법/6.4
테프론/힐러/6.2
테프론/빙결/6.0
강소연/힐러/6.3
강소연/전격술사/5.6
강소연/마법사/5.2
강소연/수도사/5.0
강소연/악사/5.1
강소연/궁수/4.7
섀도/화법/7.0
섀도/음유/6.4
섀도/검술/6.2
나요/기사/6.4
나요/수도사/5.2
유유코/검술/7.3
유유코/힐러/6.3
유유코/사제/6.3
유유코/6.3/수도
유유코/빙결/6.3
유유코/기사/6.0
파닥몬/궁수/5.6
파닥몬/격투/6.6
파닥몬/수도/6.3
파닥몬/검술/6.4
파닥몬/빙결/6.4
파닥몬/힐러/6.1
츄벅/음유/6.8
츄벅/도적/6.4
츄벅/힐러/6.3
츄벅/석궁/6.3
츄벅/암술/6.2
무크롱/검술/6.7
무크롱/빙결/5.8
무크롱/힐러/5.6
구상/기사/5.3
구상/검술/6.3
구상/전사/6.1
구상/전격/5.8
영유아/석궁/7.5
영유아/힐러/6.6
영유아/대검/6.0
영유아/검술/6.0
영유아/수도/6.0
영유아/빙결/6.0
프레시/대검/6.2
프레시/암술/6.3
프레시/궁수/6.6
프레시/수도/6.5
틴느/수도/6.8
틴느/화염/6.7
틴느/빙결/6.0
틴느/힐러/6.1
틴느/검술/6.0`

const WEEK_DATE = '2026-05-12'
const DUMMY_ID = '00000000-0000-0000-0000-000000000000'

function parseRaw() {
  return RAW.trim().split('\n').map((line) => {
    const parts = line.trim().replace(/\(.*?\)/g, '').split('/')
    const [a, b, c] = parts.map((s) => s.trim())
    const bNum = parseFloat(b)
    // 두번째 필드가 숫자면 닉/전투력/직업 순서
    const isReversed = !isNaN(bNum)
    const userNickname = a
    const classLabel = isReversed ? c : b
    const cpRaw = isReversed ? bNum : parseFloat(c)
    const cls = CLASS_MAP[classLabel] ?? classLabel
    const cp = Math.round(cpRaw * 10000)
    return { userNickname, cls, cp, classLabel }
  })
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.')
    console.error('   Supabase 대시보드 → Project Settings → API → service_role 키를 추가해주세요.')
    process.exit(1)
  }

  const entries = parseRaw()

  // 타매어 월요일 스케줄 찾기
  const { data: raids } = await supabase
    .from('raids')
    .select('id, name, raid_schedules(id, day_of_week)')

  const tamaer = raids?.find((r) => r.name.includes('타매어'))
  if (!tamaer) {
    console.error('❌ 타매어 레이드를 찾을 수 없습니다. 관리자 페이지에서 먼저 레이드를 등록해주세요.')
    process.exit(1)
  }

  const monSchedule = (tamaer.raid_schedules as { id: string; day_of_week: string }[])
    .find((s) => s.day_of_week === 'mon')
  if (!monSchedule) {
    console.error('❌ 타매어 월요일 스케줄을 찾을 수 없습니다.')
    process.exit(1)
  }

  console.log(`✅ 스케줄 찾음: ${tamaer.name} 월요일 (id: ${monSchedule.id})`)

  // 유저 목록 가져오기 (없으면 생성)
  const userNicknames = [...new Set(entries.map((e) => e.userNickname))]
  const userIdMap: Record<string, string> = {}

  for (const nickname of userNicknames) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)
      .single()

    if (existing) {
      userIdMap[nickname] = existing.id
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ nickname, password_hash: '', role: 'member' })
        .select('id')
        .single()
      if (error) {
        console.error(`❌ 유저 생성 실패 [${nickname}]:`, error.message)
        continue
      }
      userIdMap[nickname] = newUser.id
      console.log(`➕ 유저 생성: ${nickname}`)
    }
  }

  // 캐릭터 찾기 또는 생성
  // class 기준으로 매칭, 같은 유저+class가 여러 개면 순서대로 사용
  const charIdMap: string[] = []
  // (userId, cls) → 이미 사용한 character_id들 추적
  const usedCharIds: Map<string, string[]> = new Map()

  for (const entry of entries) {
    const userId = userIdMap[entry.userNickname]
    if (!userId) {
      charIdMap.push('')
      continue
    }

    const key = `${userId}__${entry.cls}`
    const alreadyUsed = usedCharIds.get(key) ?? []

    const { data: chars } = await supabase
      .from('characters')
      .select('id, nickname')
      .eq('user_id', userId)
      .eq('class', entry.cls)

    const available = (chars ?? []).filter((c) => !alreadyUsed.includes(c.id))

    if (available.length > 0) {
      const charId = available[0].id
      charIdMap.push(charId)
      usedCharIds.set(key, [...alreadyUsed, charId])
    } else {
      // 해당 class 캐릭터가 없을 때만 새로 생성
      const suffix = alreadyUsed.length > 0 ? `_${alreadyUsed.length + 1}` : ''
      const nickname = `${entry.userNickname}_${entry.classLabel}${suffix}`
      const { data: newChar, error } = await supabase
        .from('characters')
        .insert({ user_id: userId, nickname, class: entry.cls, combat_power: entry.cp })
        .select('id')
        .single()
      if (error) {
        console.error(`❌ 캐릭터 생성 실패 [${nickname}]:`, error.message)
        charIdMap.push('')
        continue
      }
      charIdMap.push(newChar.id)
      usedCharIds.set(key, [...alreadyUsed, newChar.id])
      console.log(`➕ 캐릭터 생성: ${nickname} (${entry.cls}, ${entry.cp})`)
    }
  }

  // 기존 신청 삭제 (이번 스케줄 + 날짜 한정)
  await supabase
    .from('raid_applications')
    .delete()
    .eq('raid_schedule_id', monSchedule.id)
    .eq('week_date', WEEK_DATE)
  console.log('🗑️  기존 신청 초기화 완료')

  // 신청 삽입
  const inserts: { raid_schedule_id: string; character_id: string; week_date: string }[] = []
  for (let i = 0; i < entries.length; i++) {
    if (charIdMap[i]) {
      inserts.push({ raid_schedule_id: monSchedule.id, character_id: charIdMap[i], week_date: WEEK_DATE })
    }
  }

  const { error: appError } = await supabase.from('raid_applications').insert(inserts)
  if (appError) {
    console.error('❌ 신청 삽입 실패:', appError.message)
  } else {
    console.log(`\n🎉 완료! ${inserts.length}개 신청 등록 (${WEEK_DATE} 타매어 월요일)`)
  }
}

main().catch(console.error)
