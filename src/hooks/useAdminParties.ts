import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PartyCharacter } from '@/lib/partyAlgorithm'

export type SavedParty = {
  id: string
  party_number: number
  party_members: {
    id: string
    slot_id: string | null
    character_id: string
    source_character_id: string | null
    is_duplicate: boolean | null
    sort_order: number | null
  }[]
}

async function fetchApplicants(scheduleId: string, weekDate?: string): Promise<{ characters: PartyCharacter[]; weekDate: string | null; availableWeekDates: string[] }> {
  const params = new URLSearchParams({ scheduleId })
  if (weekDate) params.set('weekDate', weekDate)
  const res = await fetch(`/api/admin/parties/applicants?${params}`)
  if (!res.ok) throw new Error('신청 인원 조회 실패')
  return res.json()
}

async function fetchParties(scheduleId: string, weekDate: string): Promise<SavedParty[]> {
  const res = await fetch(`/api/admin/parties?scheduleId=${scheduleId}&weekDate=${weekDate}`)
  if (!res.ok) throw new Error('파티 조회 실패')
  return res.json()
}

async function saveParties(payload: {
  scheduleId: string
  weekDate: string
  parties: {
    partyNumber: number
    members: {
      slotId: string
      characterId: string
      sourceCharacterId: string
      isDuplicate: boolean
      sortOrder: number
    }[]
  }[]
}) {
  const res = await fetch('/api/admin/parties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('파티 저장 실패')
  return res.json()
}

export function useApplicants(scheduleId: string, weekDate?: string) {
  return useQuery({
    queryKey: ['applicants', scheduleId, weekDate],
    queryFn: () => fetchApplicants(scheduleId, weekDate),
    enabled: !!scheduleId,
  })
}

export function useSavedParties(scheduleId: string, weekDate: string) {
  return useQuery({
    queryKey: ['parties', scheduleId, weekDate],
    queryFn: () => fetchParties(scheduleId, weekDate),
    enabled: !!scheduleId && !!weekDate,
  })
}

async function fetchTeamPreferences(scheduleId: string): Promise<Record<string, number>> {
  const res = await fetch(`/api/admin/parties/team-preferences?scheduleId=${scheduleId}`)
  if (!res.ok) throw new Error('팀 선호도 조회 실패')
  return res.json()
}

async function fetchPositionPreferences(scheduleId: string): Promise<Record<string, number>> {
  const res = await fetch(`/api/admin/parties/position-preferences?scheduleId=${scheduleId}`)
  if (!res.ok) throw new Error('위치 선호도 조회 실패')
  return res.json()
}

export function usePositionPreferences(scheduleId: string) {
  return useQuery({
    queryKey: ['positionPreferences', scheduleId],
    queryFn: () => fetchPositionPreferences(scheduleId),
    enabled: !!scheduleId,
  })
}

export function useTeamPreferences(scheduleId: string) {
  return useQuery({
    queryKey: ['teamPreferences', scheduleId],
    queryFn: () => fetchTeamPreferences(scheduleId),
    enabled: !!scheduleId,
  })
}

export function useSaveParties() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveParties,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['parties', vars.scheduleId, vars.weekDate] })
    },
  })
}