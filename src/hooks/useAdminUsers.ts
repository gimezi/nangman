import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Character } from '@/app/(main)/characters/page'

export type AdminUser = {
  id: string
  nickname: string
  role: 'member' | 'admin'
  created_at: string
  characters: Character[]
}

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('유저 목록을 불러오지 못했어요.')
  return res.json()
}

async function createUser(nickname: string) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }
  return res.json()
}

async function updateUserRole({ id, role }: { id: string; role: 'member' | 'admin' }) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }
  return res.json()
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }
}

async function createCharacter(body: { user_id: string; nickname: string; class: string; combat_power: number; server?: string | null }) {
  const res = await fetch('/api/admin/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }
  return res.json()
}

async function updateCharacter({ id, ...body }: { id: string; nickname: string; class: string; combat_power: number; server?: string | null }) {
  const res = await fetch(`/api/admin/characters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }
  return res.json()
}

async function deleteCharacter(id: string) {
  const res = await fetch(`/api/admin/characters/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('캐릭터 삭제에 실패했어요.')
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useAdminCreateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCharacter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useAdminUpdateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCharacter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useAdminDeleteCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCharacter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

async function syncCp(): Promise<{ created: number; updated: number; deleted: number; skipped: string[] }> {
  const res = await fetch('/api/admin/sync-cp', { method: 'POST' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '전투력 동기화에 실패했어요.')
  }
  return res.json()
}

export function useSyncCp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: syncCp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
