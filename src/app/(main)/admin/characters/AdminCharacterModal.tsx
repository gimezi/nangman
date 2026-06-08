'use client'

import { useState } from 'react'
import { ClassType } from '@/models/classes'
import { Character } from '@/hooks/useAdminUsers'
import { useAdminCreateCharacter, useAdminUpdateCharacter } from '@/hooks/useAdminUsers'

type Props = {
  mode: 'add' | 'edit'
  userId?: string
  character?: Character
  userNickname: string
  classes: ClassType[]
  onClose: () => void
}

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜러', support: '서포터', tank: '탱커',
}

export default function AdminCharacterModal({ mode, userId, character, userNickname, classes, onClose }: Props) {
  const addMutation = useAdminCreateCharacter()
  const updateMutation = useAdminUpdateCharacter()
  const isPending = addMutation.isPending || updateMutation.isPending
  const error = addMutation.error?.message ?? updateMutation.error?.message

  const [form, setForm] = useState({
    nickname: character?.nickname ?? '',
    class: character?.class ?? '',
    combat_power: character?.combat_power?.toString() ?? '',
    server: character?.server ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      nickname: form.nickname,
      class: form.class,
      combat_power: parseInt(form.combat_power, 10),
      server: form.server.trim() || null,
    }
    if (mode === 'add' && userId) {
      addMutation.mutate({ user_id: userId, ...payload }, { onSuccess: onClose })
    } else if (mode === 'edit' && character) {
      updateMutation.mutate({ id: character.id, ...payload }, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {mode === 'add' ? '캐릭터 추가' : '캐릭터 수정'}
        </h2>
        <p className="text-sm text-gray-500 mb-5">{userNickname}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">캐릭터 닉네임</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="캐릭터 닉네임"
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
                  {classes.filter((c) => c.type === type).map((c) => (
                    <option key={c.name} value={c.name}>{c.label}</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">서버 <span className="text-gray-400 font-normal">(선택)</span></label>
            <input
              type="text"
              value={form.server}
              onChange={(e) => setForm((f) => ({ ...f, server: e.target.value }))}
              placeholder="예: 라사, 몰리"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
              {isPending ? '처리 중...' : mode === 'add' ? '추가' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
