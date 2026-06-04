import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { parseRaw, type MissingEntry } from '@/app/api/admin/schedules/[scheduleId]/applications/route'

function parseSheetUrl(url: string): { sheetId: string; gid: string } | null {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!idMatch) return null
  const gidMatch = url.match(/[#?&]gid=(\d+)/)
  return { sheetId: idMatch[1], gid: gidMatch?.[1] ?? '0' }
}

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
  skipped?: string[]
  missing?: MissingEntry[]
}

export async function POST(request: NextRequest) {
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

  const parsed = parseSheetUrl(schedule.sheet_url)
  if (!parsed) return NextResponse.json({ error: '올바른 구글 시트 URL이 아닙니다' }, { status: 400 })

  const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.sheetId}/export?format=csv&gid=${parsed.gid}`
  const res = await fetch(csvUrl, { redirect: 'follow' })
  if (!res.ok) return NextResponse.json({ error: '시트를 불러오지 못했습니다' }, { status: 500 })

  const csv = await res.text()
  const rows = csv.trim().split('\n').slice(1)

  const byDate = new Map<string, string[]>()
  for (const row of rows) {
    const commaIdx = row.indexOf(',')
    if (commaIdx === -1) continue
    const timestamp = row.slice(0, commaIdx).trim()
    const charData = row.slice(commaIdx + 1).trim().replace(/^"|"$/g, '')
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
    const skipped: string[] = []
    const missing: MissingEntry[] = []

    for (const entry of entries) {
      const userId = userIdMap[entry.userNickname]
      if (!userId) {
        skipped.push(entry.userNickname)
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
