'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  useAdminRaids, useCreateRaid, useDeleteRaid,
  useCreateSchedule, useUpdateSchedule, useDeleteSchedule,
  useScheduleApplications, useCancelApplication, useClearWeek, useClearAllApplications,
  useSyncSheet,
} from '@/hooks/useAdminRaids'
import type { SyncDateResult } from '@/app/api/admin/sync-sheet/route'
import { RaidWithSchedules, RaidSchedule, DAY_LABEL } from '@/types/raid'
import { CLASSES } from '@/models/classes'

const CLASS_LABEL: Record<string, string> = Object.fromEntries(CLASSES.map((c) => [c.name, c.label]))
import { formatCp } from '@/lib/format'
import ScheduleModal from './ScheduleModal'
import BulkApplyModal from './BulkApplyModal'

type ScheduleModalState =
  | { type: 'add'; raidId: string }
  | { type: 'edit'; schedule: RaidSchedule; raidId: string }
  | null

type BulkApplyState = { scheduleId: string; label: string; dayOfWeek: string } | null
type ClearConfirmState = { scheduleId: string; label: string } | null

export default function AdminRaidList() {
  const { data: raids = [], isLoading } = useAdminRaids()
  const createRaid = useCreateRaid()
  const deleteRaid = useDeleteRaid()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState>(null)
  const [bulkApply, setBulkApply] = useState<BulkApplyState>(null)
  const [clearConfirm, setClearConfirm] = useState<ClearConfirmState>(null)
  const [addRaidForm, setAddRaidForm] = useState({ open: false, name: '', image_url: '' })
  const [syncResult, setSyncResult] = useState<SyncDateResult[] | null>(null)
  const syncSheet = useSyncSheet()

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
      {/* 상단 버튼 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() =>
            syncSheet.mutate(undefined, {
              onSuccess: (data) => setSyncResult(data.results),
            })
          }
          disabled={syncSheet.isPending}
          className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors"
        >
          {syncSheet.isPending ? '동기화 중...' : '구글 시트 동기화'}
        </button>
        <button
          onClick={() => setAddRaidForm({ open: true, name: '', image_url: '' })}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 레이드 추가
        </button>
      </div>

      {/* 동기화 결과 */}
      {syncResult && (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">동기화 결과</p>
            <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          {syncResult.length === 0 ? (
            <p className="text-sm text-gray-400">시트에 데이터가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {syncResult.map((r) => (
                <div key={r.date} className={`rounded-lg px-3 py-2 text-sm ${r.status === 'ok' ? 'bg-green-50 border border-green-200' : r.status === 'no_schedule' ? 'bg-gray-50 border border-gray-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className="font-medium">{r.date}</span>
                  {r.status === 'ok' && (
                    <span className="text-green-700 ml-2">{r.inserted}명 등록
                      {r.skipped && r.skipped.length > 0 && <span className="text-gray-500 ml-1">· 유저없음 {r.skipped.length}명</span>}
                      {r.missing && r.missing.length > 0 && <span className="text-amber-600 ml-1">· 캐릭없음 {r.missing.length}개</span>}
                    </span>
                  )}
                  {r.status === 'no_schedule' && <span className="text-gray-500 ml-2">해당 요일 스케줄 없음</span>}
                  {r.status === 'error' && <span className="text-red-600 ml-2">등록 오류</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {syncSheet.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {syncSheet.error.message}
        </div>
      )}

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
                          onClick={() => setBulkApply({ scheduleId: schedule.id, label: `${raid.name} ${DAY_LABEL[schedule.day_of_week]}`, dayOfWeek: schedule.day_of_week })}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-blue-500 hover:bg-blue-50"
                        >신청 등록</button>
                        <button
                          onClick={() => setClearConfirm({ scheduleId: schedule.id, label: `${raid.name} ${DAY_LABEL[schedule.day_of_week]}` })}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"
                        >일괄 삭제</button>
                        <button
                          onClick={() => setScheduleModal({ type: 'edit', schedule, raidId: raid.id })}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >수정</button>
                      </div>
                    </div>

                    {expanded.has(schedule.id) && (
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

      {/* 신청 일괄 등록 모달 */}
      {bulkApply && (
        <BulkApplyModal
          scheduleId={bulkApply.scheduleId}
          scheduleLabel={bulkApply.label}
          dayOfWeek={bulkApply.dayOfWeek}
          onClose={() => setBulkApply(null)}
        />
      )}

      {/* 신청 일괄 삭제 확인 모달 */}
      {clearConfirm && (
        <ClearConfirmModal
          scheduleId={clearConfirm.scheduleId}
          label={clearConfirm.label}
          onClose={() => setClearConfirm(null)}
        />
      )}
    </>
  )
}

function ApplicantPanel({ scheduleId }: { scheduleId: string }) {
  const { data, isLoading } = useScheduleApplications(scheduleId)
  const cancelMutation = useCancelApplication(scheduleId)
  const clearWeek = useClearWeek(scheduleId)

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
          <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500">{week} 신청 ({byWeek[week].length}명)</p>
              <button
                onClick={() => { if (confirm(`${week} 신청현황을 전체 삭제할까요?`)) clearWeek.mutate({ scheduleId, weekDate: week }) }}
                disabled={clearWeek.isPending}
                className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-50"
              >전체 삭제</button>
            </div>
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

function ClearConfirmModal({ scheduleId, label, onClose }: { scheduleId: string; label: string; onClose: () => void }) {
  const clearAll = useClearAllApplications(scheduleId)

  function handleConfirm() {
    clearAll.mutate(undefined, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">신청현황 일괄 삭제</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{label}</span>의 모든 주차 신청현황을 삭제합니다.
        </p>
        <p className="text-xs text-red-500 mt-1">이 작업은 되돌릴 수 없습니다.</p>
        {clearAll.error && <p className="text-xs text-red-500 mt-2">{clearAll.error.message}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >취소</button>
          <button
            onClick={handleConfirm}
            disabled={clearAll.isPending}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:bg-red-300"
          >{clearAll.isPending ? '삭제 중...' : '전체 삭제'}</button>
        </div>
      </div>
    </div>
  )
}
