import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Character = {
  id: string
  nickname: string
  class: string
  combat_power: number
  server?: string | null
}

async function fetchCharacters(): Promise<Character[]> {
  const res = await fetch('/api/characters')
  if (!res.ok) throw new Error('캐릭터를 불러오지 못했어요.')
  return res.json()
}

async function createCharacter(body: Omit<Character, 'id'>) {
  const res = await fetch('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '캐릭터 등록에 실패했어요.')
  }
  return res.json()
}

async function updateCharacter({ id, ...body }: Character) {
  const res = await fetch(`/api/characters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? '캐릭터 수정에 실패했어요.')
  }
  return res.json()
}

async function deleteCharacter(id: string) {
  const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('캐릭터 삭제에 실패했어요.')
}

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: fetchCharacters,
  })
}

export function useAddCharacter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCharacter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  })
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCharacter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  })
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCharacter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  })
}
