import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import type { MissingEntry } from '../route'

type Params = { params: Promise<{ scheduleId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const { weekDate, entries }: { weekDate: string; entries: MissingEntry[] } = await request.json()

  if (!weekDate || !entries?.length) {
    return NextResponse.json({ error: 'weekDate and entries are required' }, { status: 400 })
  }

  const inserts: { raid_schedule_id: string; character_id: string; week_date: string; is_volunteer: boolean }[] = []
  const failed: string[] = []

  for (const entry of entries) {
    const cpValue = entry.cp >= 100 ? Math.round(entry.cp) : Math.round(entry.cp * 10000)

    const { data: char, error: charErr } = await supabase
      .from('characters')
      .insert({ user_id: entry.userId, nickname: entry.userNickname, class: entry.cls, combat_power: cpValue })
      .select('id')
      .single()

    if (charErr || !char) {
      failed.push(`${entry.userNickname}/${entry.cls} (캐릭 생성 실패)`)
      continue
    }

    inserts.push({ raid_schedule_id: scheduleId, character_id: char.id, week_date: weekDate, is_volunteer: entry.isVolunteer })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('raid_applications').insert(inserts)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: inserts.length, failed })
}
