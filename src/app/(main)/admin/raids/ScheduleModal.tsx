'use client'

import { useState } from 'react'
import { RaidSchedule, DAY_LABEL } from '@/types/raid'
import { useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '@/hooks/useAdminRaids'

type Props = {
  mode: 'add' | 'edit'
  raidId: string
  schedule?: RaidSchedule
  onClose: () => void
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export default function ScheduleModal({ mode, raidId, schedule, onClose }: Props) {
  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule()
  const deleteSchedule = useDeleteSchedule()
  const isPending = createSchedule.isPending || updateSchedule.isPending
  const error = createSchedule.error?.message ?? updateSchedule.error?.message

  const [form, setForm] = useState({
    day_of_week: schedule?.day_of_week ?? 'mon',
    required_cp: schedule?.required_cp?.toString() ?? '',
    recommended_cp: schedule?.recommended_cp?.toString() ?? '',
    overwhelming_cp: schedule?.overwhelming_cp?.toString() ?? '',
    party_size: schedule?.party_size?.toString() ?? '4',
    deadline_day: schedule?.deadline_day ?? 'mon',
    deadline_time: schedule?.deadline_time?.slice(0, 5) ?? '18:00',
    is_active: schedule?.is_active ?? true,
  })

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      day_of_week: form.day_of_week,
      required_cp: parseInt(form.required_cp),
      recommended_cp: parseInt(form.recommended_cp),
      overwhelming_cp: parseInt(form.overwhelming_cp),
      party_size: parseInt(form.party_size),
      deadline_day: form.deadline_day,
      deadline_time: form.deadline_time + ':00',
      is_active: form.is_active,
    }
    if (mode === 'add') {
      createSchedule.mutate({ raidId, ...payload }, { onSuccess: onClose })
    } else {
      updateSchedule.mutate({ id: schedule!.id, ...payload }, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {mode === 'add' ? '스케줄 추가' : '스케줄 수정'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">레이드 요일</label>
              <select value={form.day_of_week} onChange={(e) => set('day_of_week', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">파티 인원</label>
              <input type="number" value={form.party_size} onChange={(e) => set('party_size', e.target.value)}
                min="1" max="20"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">필요 전투력</label>
              <input type="number" value={form.required_cp} onChange={(e) => set('required_cp', e.target.value)}
                placeholder="47000" step="100"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">권장 전투력</label>
              <input type="number" value={form.recommended_cp} onChange={(e) => set('recommended_cp', e.target.value)}
                placeholder="54000" step="100"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">압도 전투력</label>
              <input type="number" value={form.overwhelming_cp} onChange={(e) => set('overwhelming_cp', e.target.value)}
                placeholder="62100" step="100"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마감 요일</label>
              <select value={form.deadline_day} onChange={(e) => set('deadline_day', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마감 시간</label>
              <input type="time" value={form.deadline_time} onChange={(e) => set('deadline_time', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">활성화</span>
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 mt-1">
            {mode === 'edit' && (
              <button type="button"
                onClick={() => { if (confirm('스케줄을 삭제할까요?')) deleteSchedule.mutate(schedule!.id, { onSuccess: onClose }) }}
                className="px-4 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50">
                삭제
              </button>
            )}
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
