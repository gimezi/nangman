import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 클래스 라벨 → name 매핑 (약어 포함)
const CLASS_LABEL_MAP: Record<string, string> = {
  힐러: 'healer',
  사제: 'priest',
  수도사: 'monk',
  쌘힐러: 'healer', // 힐러로 매핑
  전사: 'warrior',
  대검전사: 'greatswordWarrior',
  대검: 'greatswordWarrior',
  검술사: 'swordsman',
  마법사: 'mage',
  화염술사: 'pyromancer',
  빙결술사: 'cryomancer',
  빙결: 'cryomancer',
  궁수: 'archer',
  석궁사수: 'crossbowman',
  석궁: 'crossbowman',
  장궁병: 'longbowman',
  음유시인: 'bard',
  댄서: 'dancer',
  악사: 'musician',
  격투가: 'fighter',
  암흑술사: 'darkMage',
  전격술사: 'lightningMage',
  전격: 'lightningMage',
  도적: 'rogue',
  듀얼블레이드: 'dualBlade',
  듀블: 'dualBlade',
}

async function fetchCSV(): Promise<string> {
  const res = await fetch(
    'https://docs.google.com/spreadsheets/d/1uC-Ua5WAjzbip_yRmtk94GepJQnpL2bm34SxoV9_Ezk/export?format=csv&gid=880945779'
  )
  return res.text()
}

function parseCSV(csv: string) {
  const lines = csv.trim().split('\n')
  const header = lines[0].split(',')
  console.log('헤더:', header)

  const users: { nickname: string; characters: { nickname: string; class: string; combat_power: number }[] }[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const userNickname = cols[0].trim()
    if (!userNickname) continue

    const characters: { nickname: string; class: string; combat_power: number }[] = []

    // 본캐 (cols[1], cols[2])
    const mainClass = cols[1]?.trim()
    const mainCp = parseFloat(cols[2]?.trim())
    if (mainClass && !isNaN(mainCp)) {
      const mappedClass = CLASS_LABEL_MAP[mainClass]
      if (mappedClass) {
        characters.push({ nickname: userNickname, class: mappedClass, combat_power: Math.round(mainCp * 10000) })
      } else {
        console.warn(`[미등록 직업] ${userNickname} - "${mainClass}"`)
        characters.push({ nickname: userNickname, class: mainClass, combat_power: Math.round(mainCp * 10000) })
      }
    }

    // 부캐 (cols[3]부터 2열씩)
    const maxSubs = Math.floor((cols.length - 3) / 2)
    for (let j = 0; j < maxSubs; j++) {
      const classCol = cols[3 + j * 2]?.trim()
      const cpCol = parseFloat(cols[4 + j * 2]?.trim())
      if (classCol && !isNaN(cpCol)) {
        const mappedClass = CLASS_LABEL_MAP[classCol]
        if (mappedClass) {
          characters.push({ nickname: `${userNickname}_부캐${j + 1}`, class: mappedClass, combat_power: Math.round(cpCol * 10000) })
        } else {
          console.warn(`[미등록 직업] ${userNickname} 부캐${j + 1} - "${classCol}"`)
          characters.push({ nickname: `${userNickname}_부캐${j + 1}`, class: classCol, combat_power: Math.round(cpCol * 10000) })
        }
      }
    }

    users.push({ nickname: userNickname, characters })
  }

  return users
}

async function seed() {
  console.log('📥 스프레드시트 데이터 가져오는 중...')
  const csv = await fetchCSV()
  const users = parseCSV(csv)
  console.log(`✅ ${users.length}명 파싱 완료\n`)

  for (const user of users) {
    // 이미 있으면 id만 가져오고, 없으면 새로 삽입 (password_hash 덮어쓰지 않음)
    let userId: string | null = null

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', user.nickname)
      .single()

    if (existing) {
      userId = existing.id
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ nickname: user.nickname, password_hash: '', role: 'member' })
        .select('id')
        .single()
      if (insertError) {
        console.error(`❌ 유저 삽입 실패 [${user.nickname}]:`, insertError.message)
        continue
      }
      userId = newUser.id
    }

    // 이미 있는 캐릭터 닉네임 확인 후 없는 것만 삽입
    const { data: existingChars } = await supabase
      .from('characters')
      .select('nickname')
      .eq('user_id', userId)

    const existingNicknames = new Set((existingChars ?? []).map((c) => c.nickname))

    const charInserts = user.characters
      .filter((c) => !existingNicknames.has(c.nickname))
      .map((c) => ({
        user_id: userId,
        nickname: c.nickname,
        class: c.class,
        combat_power: c.combat_power,
      }))

    if (charInserts.length === 0) {
      console.log(`⏭️  ${user.nickname} - 이미 등록된 캐릭터`)
      continue
    }

    const { error: charError } = await supabase.from('characters').insert(charInserts)

    if (charError) {
      console.error(`❌ 캐릭터 삽입 실패 [${user.nickname}]:`, charError.message)
    } else {
      console.log(`✅ ${user.nickname} - 캐릭터 ${charInserts.length}개 등록`)
    }
  }

  console.log('\n🎉 시드 완료!')
}

seed().catch(console.error)
