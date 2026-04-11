import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabase } from '@/lib/supabase'

// 파티 조회
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')
  const weekDate = searchParams.get('weekDate')

  if (!scheduleId || !weekDate) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('parties')
    .select(`
      id,
      party_number,
      party_members (
        id,
        slot_id,
        character_id,
        source_character_id,
        is_duplicate,
        sort_order
      )
    `)
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)
    .order('party_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized =
    data?.map((party) => ({
      ...party,
      party_members: [...(party.party_members ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    })) ?? []

  return NextResponse.json(normalized)
}

// 파티 저장 (기존 삭제 후 재생성)
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json()
  const { scheduleId, weekDate, parties } = body as {
    scheduleId: string
    weekDate: string
    parties: Array<{
      partyNumber: number
      members: Array<{
        slotId: string
        characterId: string
        sourceCharacterId: string
        isDuplicate: boolean
        sortOrder: number
      }>
    }>
  }

  if (!scheduleId || !weekDate || !Array.isArray(parties)) {
    return NextResponse.json({ error: '파라미터 누락 또는 형식 오류' }, { status: 400 })
  }

  const existingPartyIdsRes = await supabase
    .from('parties')
    .select('id')
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)

  if (existingPartyIdsRes.error) {
    return NextResponse.json({ error: existingPartyIdsRes.error.message }, { status: 500 })
  }

  const existingPartyIds = (existingPartyIdsRes.data ?? []).map((p) => p.id)

  if (existingPartyIds.length > 0) {
    const deleteMembersRes = await supabase
      .from('party_members')
      .delete()
      .in('party_id', existingPartyIds)

    if (deleteMembersRes.error) {
      return NextResponse.json({ error: deleteMembersRes.error.message }, { status: 500 })
    }

    const deletePartiesRes = await supabase
      .from('parties')
      .delete()
      .eq('raid_schedule_id', scheduleId)
      .eq('week_date', weekDate)

    if (deletePartiesRes.error) {
      return NextResponse.json({ error: deletePartiesRes.error.message }, { status: 500 })
    }
  }

  for (const party of parties) {
    const { data: newParty, error: partyInsertError } = await supabase
      .from('parties')
      .insert({
        raid_schedule_id: scheduleId,
        week_date: weekDate,
        party_number: party.partyNumber,
      })
      .select('id')
      .single()

    if (partyInsertError || !newParty) {
      return NextResponse.json({ error: partyInsertError?.message ?? '파티 생성 실패' }, { status: 500 })
    }

    if (party.members.length > 0) {
      const memberRows = party.members.map((member) => ({
        party_id: newParty.id,
        character_id: member.characterId,
        slot_id: member.slotId,
        source_character_id: member.sourceCharacterId,
        is_duplicate: member.isDuplicate,
        sort_order: member.sortOrder,
      }))

      const { error: memberInsertError } = await supabase
        .from('party_members')
        .insert(memberRows)

      if (memberInsertError) {
        return NextResponse.json({ error: memberInsertError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}