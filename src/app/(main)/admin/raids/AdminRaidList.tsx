'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  useAdminRaids, useCreateRaid, useDeleteRaid,
  useCreateSchedule, useUpdateSchedule, useDeleteSchedule,
  useScheduleApplications, useCancelApplication,
} from '@/hooks/useAdminRaids'
import { RaidWithSchedules, RaidSchedule, DAY_LABEL } from '@/types/raid'
import { CLASSES } from '@/models/classes'

const CLASS_LABEL: Record<string, string> = Object.fromEntries(CLASSES.map((c) => [c.name, c.label]))
import { formatCp } from '@/lib/format'
import ScheduleModal from './ScheduleModal'

type ScheduleModalState =
  | { type: 'add'; raidId: string }
  | { type: 'edit'; schedule: RaidSchedule; raidId: string }
  | null

export default function AdminRaidList() {
  const { data: raids = [], isLoading } = useAdminRaids()
  const createRaid = useCreateRaid()
  const deleteRaid = useDeleteRaid()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [applicantsScheduleId, setApplicantsScheduleId] = useState<string | null>(null)
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState>(null)
  const [addRaidForm, setAddRaidForm] = useState({ open: false, name: '', image_url: '' })

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isLoading) return <div className="flex flex-col gap-3">{[...Array(2)].map((_, i) => (
    <div key={i} className="bg-white rounded-xl border h-16 animate-pulse" />
  ))}</div>

  return (
    <>
      {/* 레이드 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setAddRaidForm({ open: true, name: '', image_url: '' })}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 레이드 추가
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {raids.map((raid: RaidWithSchedules) => (
          <div key={raid.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 레이드 헤더 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              {raid.image_url && (
                <Image src={raid.image_url} alt={raid.name} width={40} height={40} unoptimized className="rounded-lg object-cover w-10 h-10" />
              )}
              <span className="font-bold text-gray-900 flex-1">{raid.name}</span>
              <button
                onClick={() => { if (confirm(`${raid.name}을 삭제할까요?`)) deleteRaid.mutate(raid.id) }}
                className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >삭제</button>
            </div>

            {/* 스케줄 목록 */}
            <div className="divide-y divide-gray-50">
              {raid.raid_schedules
                .sort((a, b) => {
                  const order = ['mon','tue','wed','thu','fri','sat','sun']
                  return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
                })
                .map((schedule: RaidSchedule) => (
                  <div key={schedule.id}>
                    <div className="flex items-center px-5 py-3 gap-3">
                      <button
                        onClick={() => toggleExpand(schedule.id)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded.has(schedule.id) ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800">{DAY_LABEL[schedule.day_of_week]}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${schedule.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {schedule.is_active ? '활성' : '비활성'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            필요 {formatCp(schedule.required_cp)} · 권장 {formatCp(schedule.recommended_cp)} · 압도 {formatCp(schedule.overwhelming_cp)} · {schedule.party_size}인
                            {schedule.deadline_day && ` · 마감 ${DAY_LABEL[schedule.deadline_day]} ${schedule.deadline_time?.slice(0, 5)}`}
                          </p>
                        </div>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => setApplicantsScheduleId(applicantsScheduleId === schedule.id ? null : schedule.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >신청현황</button>
                        <button
                          onClick={() => setScheduleModal({ type: 'edit', schedule, raidId: raid.id })}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >수정</button>
                      </div>
                    </div>

                    {/* 신청 현황 */}
                    {applicantsScheduleId === schedule.id && (
                      <ApplicantPanel scheduleId={schedule.id} />
                    )}
                  </div>
                ))}
            </div>

            {/* 스케줄 추가 버튼 */}
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setScheduleModal({ type: 'add', raidId: raid.id })}
                className="text-sm text-blue-500 hover:text-blue-700"
              >+ 스케줄 추가</button>
            </div>
          </div>
        ))}
      </div>

      {/* 레이드 추가 모달 */}
      {addRaidForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddRaidForm((f) => ({ ...f, open: false }))} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">레이드 추가</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={addRaidForm.name}
                onChange={(e) => setAddRaidForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="레이드 이름"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={addRaidForm.image_url}
                onChange={(e) => setAddRaidForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="이미지 URL (선택)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {createRaid.error && <p className="text-red-500 text-sm mt-2">{createRaid.error.message}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAddRaidForm((f) => ({ ...f, open: false }))} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">취소</button>
              <button
                onClick={() => createRaid.mutate({ name: addRaidForm.name, image_url: addRaidForm.image_url }, { onSuccess: () => setAddRaidForm({ open: false, name: '', image_url: '' }) })}
                disabled={createRaid.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
              >{createRaid.isPending ? '처리 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 추가/수정 모달 */}
      {scheduleModal && (
        <ScheduleModal
          mode={scheduleModal.type}
          raidId={scheduleModal.raidId}
          schedule={scheduleModal.type === 'edit' ? scheduleModal.schedule : undefined}
          onClose={() => setScheduleModal(null)}
        />
      )}
    </>
  )
}

function ApplicantPanel({ scheduleId }: { scheduleId: string }) {
  const { data, isLoading } = useScheduleApplications(scheduleId)
  const cancelMutation = useCancelApplication(scheduleId)

  if (isLoading) return <div className="px-5 py-3 text-sm text-gray-400 animate-pulse">불러오는 중...</div>

  const byWeek: Record<string, typeof data> = {}
  for (const app of data ?? []) {
    if (!byWeek[app.week_date]) byWeek[app.week_date] = []
    byWeek[app.week_date].push(app)
  }

  const weeks = Object.keys(byWeek).sort().reverse()

  if (weeks.length === 0) return <div className="px-5 py-3 text-sm text-gray-400">신청 인원 없음</div>

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
      {weeks.map((week) => (
        <div key={week} className="mb-3 last:mb-0">
          <p className="text-xs font-medium text-gray-500 mb-1.5">{week} 신청 ({byWeek[week].length}명)</p>
          <div className="flex flex-wrap gap-1.5">
            {byWeek[week].map((app: any) => (
              <span key={app.character_id} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full pl-2.5 pr-1.5 py-1 text-gray-700">
                {app.characters?.users?.nickname} · {CLASS_LABEL[app.characters?.class] ?? app.characters?.class}
                <button
                  onClick={() => cancelMutation.mutate({ scheduleId, characterId: app.character_id, weekDate: app.week_date })}
                  disabled={cancelMutation.isPending}
                  className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                  title="신청 취소"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
