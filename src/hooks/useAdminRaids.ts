import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RaidWithSchedules, RaidSchedule } from '@/types/raid'

async function fetchAdminRaids(): Promise<RaidWithSchedules[]> {
  const res = await fetch('/api/admin/raids')
  if (!res.ok) throw new Error('레이드를 불러오지 못했어요.')
  return res.json()
}

async function createRaid(body: { name: string; image_url?: string }) {
  const res = await fetch('/api/admin/raids', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
  return res.json()
}

async function deleteRaid(raidId: string) {
  const res = await fetch(`/api/admin/raids/${raidId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('레이드 삭제 실패')
}

async function createSchedule({ raidId, ...body }: { raidId: string } & Partial<RaidSchedule>) {
  const res = await fetch(`/api/admin/raids/${raidId}/schedules`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
  return res.json()
}

async function updateSchedule({ id, ...body }: { id: string } & Partial<RaidSchedule>) {
  const res = await fetch(`/api/admin/schedules/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
  return res.json()
}

async function deleteSchedule(id: string) {
  const res = await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('스케줄 삭제 실패')
}

async function fetchApplications(scheduleId: string) {
  const res = await fetch(`/api/admin/schedules/${scheduleId}`)
  if (!res.ok) throw new Error('신청 목록을 불러오지 못했어요.')
  return res.json()
}

export function useAdminRaids() {
  return useQuery({ queryKey: ['admin-raids'], queryFn: fetchAdminRaids })
}

export function useScheduleApplications(scheduleId: string | null) {
  return useQuery({
    queryKey: ['schedule-applications', scheduleId],
    queryFn: () => fetchApplications(scheduleId!),
    enabled: !!scheduleId,
  })
}

export function useCreateRaid() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createRaid, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-raids'] }) })
}

export function useDeleteRaid() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteRaid, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-raids'] }) })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createSchedule, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-raids'] }) })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: updateSchedule, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-raids'] }) })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteSchedule, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-raids'] }) })
}
