'use client'

import { useState } from 'react'
import { Character } from './page'
import { ClassType } from '@/models/classes'
import { useAddCharacter, useUpdateCharacter } from '@/hooks/useCharacters'

type Props = {
  character: Character | null
  classes: ClassType[]
  onClose: () => void
}

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜러',
  support: '서포터',
  tank: '탱커',
}

export default function CharacterModal({ character, classes, onClose }: Props) {
  const addMutation = useAddCharacter()
  const updateMutation = useUpdateCharacter()
  const isPending = addMutation.isPending || updateMutation.isPending
  const error = addMutation.error?.message ?? updateMutation.error?.message ?? ''

  const [form, setForm] = useState({
    nickname: character?.nickname ?? '',
    class: character?.class ?? '',
    combat_power: character?.combat_power?.toString() ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      nickname: form.nickname,
      class: form.class,
      combat_power: parseInt(form.combat_power, 10),
    }

    if (character) {
      updateMutation.mutate({ id: character.id, ...payload }, { onSuccess: onClose })
    } else {
      addMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {character ? '캐릭터 수정' : '캐릭터 추가'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">캐릭터 닉네임</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="캐릭터 닉네임 입력"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직업</label>
            <select
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">직업 선택</option>
              {(['support', 'tank', 'dealer'] as const).map((type) => (
                <optgroup key={type} label={TYPE_LABEL[type]}>
                  {classes
                    .filter((c) => c.type === type)
                    .map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전투력</label>
            <input
              type="number"
              value={form.combat_power}
              onChange={(e) => setForm((f) => ({ ...f, combat_power: e.target.value }))}
              placeholder="예: 68000"
              step="100"
              min="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? '처리 중...' : character ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
