import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ scheduleId: string }> }

export const CLASS_MAP: Record<string, string> = {
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
  기사: 'knight',
}

export function parseRaw(rawText: string) {
  return rawText.trim().split('\n').flatMap((line) => {
    const raw = line.trim()
    if (!raw) return []
    const isVolunteer = raw.includes('(지원)')
    const cleaned = raw.replace(/\(.*?\)/g, '').trim()
    const parts = cleaned.split('/').map((s) => s.trim())
    const [a, b, c] = parts
    if (!a || !b) return []
    const bNum = parseFloat(b)
    const isReversed = !isNaN(bNum)
    const userNickname = a
    const classLabel = isReversed ? c : b
    const cpStr = isReversed ? b : c
    const cp = parseFloat(cpStr ?? '') || 0
    const cls = CLASS_MAP[classLabel] ?? classLabel
    return [{ userNickname, cls, cp, isVolunteer }]
  })
}

export type MissingEntry = {
  userNickname: string
  userId: string
  cls: string
  cp: number
  isVolunteer: boolean
}

export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const { rawText, weekDate, clearExisting } = await request.json()

  if (!rawText || !weekDate) {
    return NextResponse.json({ error: 'rawText and weekDate are required' }, { status: 400 })
  }

  const entries = parseRaw(rawText)

  const nicknames = [...new Set(entries.map((e) => e.userNickname))]
  const userIdMap: Record<string, string> = {}
  for (const nickname of nicknames) {
    const { data } = await supabase.from('users').select('id').eq('nickname', nickname).single()
    if (data) userIdMap[nickname] = data.id
  }

  if (clearExisting) {
    await supabase
      .from('raid_applications')
      .delete()
      .eq('raid_schedule_id', scheduleId)
      .eq('week_date', weekDate)
  }

  const usedCharIds = new Map<string, string[]>()
  const inserts: { raid_schedule_id: string; character_id: string; week_date: string; is_volunteer: boolean }[] = []
  const skipped: string[] = []
  const missing: MissingEntry[] = []

  for (const entry of entries) {
    const userId = userIdMap[entry.userNickname]
    if (!userId) {
      skipped.push(`${entry.userNickname}`)
      continue
    }

    const key = `${userId}__${entry.cls}`
    const alreadyUsed = usedCharIds.get(key) ?? []

    const { data: chars } = await supabase
      .from('characters')
      .select('id, combat_power')
      .eq('user_id', userId)
      .eq('class', entry.cls)

    const available = (chars ?? []).filter((c) => !alreadyUsed.includes(c.id))
    if (available.length === 0) {
      missing.push({ userNickname: entry.userNickname, userId, cls: entry.cls, cp: entry.cp, isVolunteer: entry.isVolunteer })
      continue
    }

    const char = available[0]
    const newCp = Math.round(entry.cp * 10000)
    await supabase.from('characters').update({ combat_power: newCp }).eq('id', char.id)

    usedCharIds.set(key, [...alreadyUsed, char.id])
    inserts.push({ raid_schedule_id: scheduleId, character_id: char.id, week_date: weekDate, is_volunteer: entry.isVolunteer })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('raid_applications').insert(inserts)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: inserts.length, skipped, missing })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const weekDate = searchParams.get('weekDate')

  // weekDate 없으면 해당 스케줄 전체 삭제
  let query = supabase.from('raid_applications').delete().eq('raid_schedule_id', scheduleId)
  if (weekDate) query = query.eq('week_date', weekDate) as typeof query
  if (characterId) query = query.eq('character_id', characterId) as typeof query

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
