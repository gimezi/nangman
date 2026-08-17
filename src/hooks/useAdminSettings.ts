'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch('/api/admin/settings')
  if (!res.ok) throw new Error('설정을 불러오지 못했습니다')
  return res.json()
}

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin-settings'], queryFn: fetchSettings })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? '저장 실패') }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })
}
