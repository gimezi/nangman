import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabase } from '@/lib/supabase'

// 스케줄별 가장 최근 저장된 파티에서 캐릭터 → 표시 순서 매핑을 반환
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')

  if (!scheduleId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  const { data: parties, error } = await supabase
    .from('parties')
    .select(`
      week_date,
      party_members (
        source_character_id,
        sort_order,
        is_duplicate
      )
    `)
    .eq('raid_schedule_id', scheduleId)
    .order('week_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 캐릭터별로 가장 최근 주차의 sort_order만 기록
  const positions: Record<string, number> = {}

  for (const party of (parties ?? [])) {
    for (const member of (party.party_members ?? [])) {
      if (member.is_duplicate) continue
      const charId = member.source_character_id
      if (!charId || positions[charId] !== undefined) continue
      positions[charId] = member.sort_order ?? 0
    }
  }

  return NextResponse.json(positions)
}
