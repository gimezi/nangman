import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { CLASS_MAP } from '@/app/api/admin/schedules/[scheduleId]/applications/route'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const SHEET_GID = process.env.GOOGLE_SHEET_CP_GID!

type SheetChar = { charNickname: string; cls: string; cp: number; server: string | null; magic_resistance: number | null }

function extractClassAndServer(raw: string | undefined): { cls: string; server: string | null } {
  if (!raw) return { cls: '', server: null }
  const match = raw.match(/\(([^)]+)\)/)
  const server = match?.[1] ?? null
  const cls = raw.replace(/\(.*?\)/g, '').trim()
  return { cls, server }
}

function parseMr(raw: string | undefined): number | null {
  if (!raw) return null
  const n = parseFloat(raw)
  return isNaN(n) ? null : n
}

// 시트 구조: col[0]=유저닉네임, col[1]=본캐직업, col[2]=투력, col[3]=마도저항,
//            col[4+j*3]=부캐j직업, col[5+j*3]=투력, col[6+j*3]=마도저항, ...
function parseSheet(csv: string): Map<string, SheetChar[]> {
  const byUser = new Map<string, SheetChar[]>()
  const lines = csv.trim().split('\n').slice(1)

  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const userNickname = cols[0]
    if (!userNickname) continue

    const chars: SheetChar[] = []

    const { cls: mainCls, server: mainServer } = extractClassAndServer(cols[1])
    const mainCp = parseFloat(cols[2])
    if (mainCls && !isNaN(mainCp)) {
      chars.push({
        charNickname: userNickname,
        cls: CLASS_MAP[mainCls] ?? mainCls,
        cp: Math.round(mainCp * 10000),
        server: mainServer,
        magic_resistance: parseMr(cols[3]),
      })
    }

    const maxSubs = Math.floor((cols.length - 4) / 3)
    for (let j = 0; j < maxSubs; j++) {
      const { cls, server } = extractClassAndServer(cols[4 + j * 3])
      const cp = parseFloat(cols[5 + j * 3])
      if (cls && !isNaN(cp)) {
        chars.push({
          charNickname: `${userNickname}_부캐${j + 1}`,
          cls: CLASS_MAP[cls] ?? cls,
          cp: Math.round(cp * 10000),
          server,
          magic_resistance: parseMr(cols[6 + j * 3]),
        })
      }
    }

    if (chars.length > 0) byUser.set(userNickname, chars)
  }

  return byUser
}

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return NextResponse.json({ error: '시트를 불러오지 못했습니다' }, { status: 500 })

  const csv = await res.text()
  const sheetByUser = parseSheet(csv)

  let created = 0
  let updated = 0
  let deleted = 0
  const skipped: string[] = []

  for (const [userNickname, sheetChars] of sheetByUser) {
    const { data: user } = await supabase.from('users').select('id').eq('nickname', userNickname).single()
    if (!user) {
      skipped.push(userNickname)
      continue
    }

    const { data: dbChars } = await supabase
      .from('characters')
      .select('id, nickname, class, combat_power, server, magic_resistance')
      .eq('user_id', user.id)

    const dbByNickname = new Map((dbChars ?? []).map((c) => [c.nickname, c]))
    const sheetNicknames = new Set(sheetChars.map((c) => c.charNickname))

    for (const sc of sheetChars) {
      const existing = dbByNickname.get(sc.charNickname)
      if (!existing) {
        await supabase.from('characters').insert({
          user_id: user.id,
          nickname: sc.charNickname,
          class: sc.cls,
          combat_power: sc.cp,
          server: sc.server,
          magic_resistance: sc.magic_resistance,
        })
        created++
      } else if (
        existing.class !== sc.cls ||
        existing.combat_power !== sc.cp ||
        existing.server !== sc.server ||
        (existing.magic_resistance ?? null) !== sc.magic_resistance
      ) {
        await supabase
          .from('characters')
          .update({ class: sc.cls, combat_power: sc.cp, server: sc.server, magic_resistance: sc.magic_resistance })
          .eq('id', existing.id)
        updated++
      }
    }

    for (const dbChar of dbChars ?? []) {
      if (!sheetNicknames.has(dbChar.nickname)) {
        await supabase.from('characters').delete().eq('id', dbChar.id)
        deleted++
      }
    }
  }

  return NextResponse.json({ created, updated, deleted, skipped })
}
