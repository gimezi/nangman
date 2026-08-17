export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { parseRaw, type MissingEntry } from '@/app/api/admin/schedules/[scheduleId]/applications/route'

function parseKoreanTimestamp(ts: string): Date | null {
  const m = ts.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})/)
  if (!m) return null
  let hour = parseInt(m[5])
  if (m[4] === '오후' && hour < 12) hour += 12
  if (m[4] === '오전' && hour === 12) hour = 0
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), hour, parseInt(m[6]), parseInt(m[7]))
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 월요일이면 그대로, 아니면 그 주의 다음 월요일
function toNextMonday(date: Date): Date {
  const day = date.getDay()
  if (day === 1) return date
  const diff = day === 0 ? 1 : 8 - day
  const result = new Date(date)
  result.setDate(date.getDate() + diff)
  return result
}

export type SyncDateResult = {
  date: string
  status: 'ok' | 'no_schedule' | 'error'
  inserted?: number
  skipped?: { nickname: string; rawLine: string }[]
  missing?: MissingEntry[]
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await request.json()
  if (!scheduleId) return NextResponse.json({ error: 'scheduleId가 필요합니다' }, { status: 400 })

  const { data: schedule, error: schedErr } = await supabase
    .from('raid_schedules')
    .select('id, day_of_week, sheet_url')
    .eq('id', scheduleId)
    .single()

  if (schedErr || !schedule) return NextResponse.json({ error: '스케줄을 찾을 수 없습니다' }, { status: 404 })
  if (!schedule.sheet_url) return NextResponse.json({ error: '시트 URL이 설정되지 않았습니다' }, { status: 400 })

  const res = await fetch(schedule.sheet_url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  })
  if (!res.ok) return NextResponse.json({ error: `시트를 불러오지 못했습니다 (${res.status})` }, { status: 500 })

  const csv = await res.text()
  const rows = csv.trim().split('\n').slice(1)

  const byDate = new Map<string, string[]>()
  for (const row of rows) {
    const cols = row.split(',')
    const timestamp = cols[0]?.trim() ?? ''
    const charData = cols[1]?.trim().replace(/^"|"$/g, '') ?? ''
    if (!timestamp || !charData) continue
    const date = parseKoreanTimestamp(timestamp)
    if (!date) continue
    const dateStr = toDateString(toNextMonday(date))
    if (!byDate.has(dateStr)) byDate.set(dateStr, [])
    byDate.get(dateStr)!.push(charData)
  }

  if (byDate.size === 0) {
    return NextResponse.json({ results: [] })
  }

  const results: SyncDateResult[] = []

  for (const [dateStr, charLines] of byDate) {
    const entries = parseRaw(charLines.join('\n'))

    const nicknames = [...new Set(entries.map((e) => e.userNickname))]
    const userIdMap: Record<string, string> = {}
    for (const nickname of nicknames) {
      const { data } = await supabase.from('users').select('id').eq('nickname', nickname).single()
      if (data) userIdMap[nickname] = data.id
    }

    const usedCharIds = new Map<string, string[]>()
    const inserts: { raid_schedule_id: string; character_id: string; week_date: string; is_volunteer: boolean }[] = []
    const skipped: { nickname: string; rawLine: string }[] = []
    const missing: MissingEntry[] = []

    for (const entry of entries) {
      const userId = userIdMap[entry.userNickname]
      if (!userId) {
        skipped.push({ nickname: entry.userNickname, rawLine: entry.rawLine })
        continue
      }

      const key = `${userId}__${entry.cls}`
      const alreadyUsed = usedCharIds.get(key) ?? []

      const { data: chars } = await supabase
        .from('characters')
        .select('id, combat_power, magic_resistance')
        .eq('user_id', userId)
        .eq('class', entry.cls)
        .order('combat_power', { ascending: false })

      const sorted = chars ?? []
      const target = sorted[entry.classIndex] ?? null
      if (!target || alreadyUsed.includes(target.id)) {
        missing.push({ userNickname: entry.userNickname, userId, cls: entry.cls, cp: entry.cp, magic_resistance: entry.magic_resistance, isVolunteer: entry.isVolunteer, rawLine: entry.rawLine, classIndex: entry.classIndex })
        continue
      }

      const char = target
      const updates: Record<string, unknown> = {}
      if (entry.cp > 0) {
        const newCp = Math.round(entry.cp * 10000)
        if (char.combat_power !== newCp) updates.combat_power = newCp
      }
      if (entry.magic_resistance != null && char.magic_resistance !== entry.magic_resistance) updates.magic_resistance = entry.magic_resistance
      if (Object.keys(updates).length > 0) await supabase.from('characters').update(updates).eq('id', char.id)

      usedCharIds.set(key, [...alreadyUsed, char.id])
      inserts.push({ raid_schedule_id: scheduleId, character_id: char.id, week_date: dateStr, is_volunteer: entry.isVolunteer })
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('raid_applications')
        .upsert(inserts, { onConflict: 'raid_schedule_id,character_id,week_date', ignoreDuplicates: true })
      if (error) {
        results.push({ date: dateStr, status: 'error', skipped, missing })
        continue
      }
    }

    results.push({ date: dateStr, status: 'ok', inserted: inserts.length, skipped, missing })
  }

  return NextResponse.json({ results })
}
