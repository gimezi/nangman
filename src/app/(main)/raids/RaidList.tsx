'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRaids } from '@/hooks/useRaids'
import { DAY_LABEL, RaidSchedule } from '@/types/raid'
import { isDeadlinePassed, getWeekDate } from '@/lib/weekDate'
import { formatCp } from '@/lib/format'

function getNextRaidDate(dayOfWeek: string, deadlineDay: string, deadlineTime: string): string {
  const date = getWeekDate(dayOfWeek, deadlineDay, deadlineTime)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function RaidList() {
  const { data: raids = [], isLoading } = useRaids()
  const [activeTab, setActiveTab] = useState(0)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (raids.length === 0) {
    return <p className="text-center text-gray-400 py-16">등록된 레이드가 없어요.</p>
  }

  const activeRaid = raids[activeTab]

  return (
    <div>
      {/* 레이드 탭 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {raids.map((raid, i) => (
          <button
            key={raid.id}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === i
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {raid.name}
          </button>
        ))}
      </div>

      {/* 스케줄 카드 목록 */}
      <div className="flex flex-col gap-3">
        {activeRaid.raid_schedules
          .filter((s) => s.is_active)
          .sort((a, b) => {
            const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
          })
          .map((schedule: RaidSchedule) => {
            const closed = isDeadlinePassed(schedule.deadline_day, schedule.deadline_time)
            const dateStr = getNextRaidDate(schedule.day_of_week, schedule.deadline_day, schedule.deadline_time)

            return (
              <button
                key={schedule.id}
                onClick={() => router.push(`/raids/${schedule.id}`)}
                disabled={closed}
                className={`w-full text-left bg-white rounded-xl border px-5 py-4 transition-colors ${
                  closed
                    ? 'border-gray-100 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {activeRaid.name} — {DAY_LABEL[schedule.day_of_week]}
                      </span>
                      {closed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          신청 마감
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          신청 가능
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{dateStr} 진행</span>
                      <span className="text-gray-300">|</span>
                      <span>권장 {formatCp(schedule.recommended_cp)}</span>
                      <span className="text-gray-300">|</span>
                      <span>파티 {schedule.party_size}인</span>
                    </div>
                  </div>
                  {!closed && (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
      </div>
    </div>
  )
}
