import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { decodePartyNumber } from '@/lib/partyAlgorithm'

// 스케줄별 가장 최근 저장된 파티에서 유저 → 팀 인덱스 매핑을 반환
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')

  if (!scheduleId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  const { data: parties, error } = await supabase
    .from('parties')
    .select(`
      party_number,
      week_date,
      party_members (
        source_character_id,
        is_duplicate,
        characters ( user_id, users ( nickname ) )
      )
    `)
    .eq('raid_schedule_id', scheduleId)
    .order('week_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 유저별로 가장 최근 주차의 팀 인덱스만 기록
  const preferences: Record<string, number> = {}

  for (const party of (parties ?? [])) {
    const { teamIdx } = decodePartyNumber(party.party_number)

    for (const member of (party.party_members ?? [])) {
      if (member.is_duplicate) continue
      const userNickname = (member.characters as any)?.users?.nickname as string | undefined
      if (!userNickname || preferences[userNickname] !== undefined) continue
      preferences[userNickname] = teamIdx
    }
  }

  return NextResponse.json(preferences)
}
