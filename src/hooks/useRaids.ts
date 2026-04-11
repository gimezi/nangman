import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RaidWithSchedules } from '@/types/raid'

async function fetchRaids(): Promise<RaidWithSchedules[]> {
  const res = await fetch('/api/raids')
  if (!res.ok) throw new Error('레이드를 불러오지 못했어요.')
  return res.json()
}

async function fetchApplications(scheduleId: string) {
  const res = await fetch(`/api/raids/${scheduleId}/applications`)
  if (!res.ok) throw new Error('신청 정보를 불러오지 못했어요.')
  return res.json() as Promise<{ weekDate: string; appliedCharacterIds: string[] }>
}

async function applyToRaid({
  scheduleId,
  characterIds,
  weekDate,
}: {
  scheduleId: string
  characterIds: string[]
  weekDate: string
}) {
  const res = await fetch(`/api/raids/${scheduleId}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterIds, weekDate }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '신청에 실패했어요.')
  }
  return res.json()
}

export function useRaids() {
  return useQuery({
    queryKey: ['raids'],
    queryFn: fetchRaids,
  })
}

export function useRaidApplications(scheduleId: string) {
  return useQuery({
    queryKey: ['raid-applications', scheduleId],
    queryFn: () => fetchApplications(scheduleId),
  })
}

export function useApplyToRaid(scheduleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applyToRaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raid-applications', scheduleId] })
      queryClient.invalidateQueries({ queryKey: ['raids'] })
    },
  })
}
