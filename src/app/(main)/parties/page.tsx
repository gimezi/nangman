'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRaids } from '@/hooks/useRaids'
import { DAY_LABEL, RaidSchedule } from '@/types/raid'
import { CLASSES } from '@/models/classes'
import { formatCp } from '@/lib/format'
import { decodePartyNumber, TEAM_NAMES } from '@/lib/partyAlgorithm'

type Member = {
  sourceCharacterId: string
  isDuplicate: boolean
  nickname: string
  class: string
  combatPower: number
  userNickname: string
  isMe: boolean
}

type Party = {
  partyNumber: number
  members: Member[]
}

type PartyResult = {
  parties: Party[]
  weekDate: string
}

const TEAM_STYLES = [
  { label: 'text-red-600', card: 'border-red-200', header: 'bg-red-50' },
  { label: 'text-blue-600', card: 'border-blue-200', header: 'bg-blue-50' },
  { label: 'text-emerald-600', card: 'border-emerald-200', header: 'bg-emerald-50' },
]

const CLASS_COLOR: Record<string, string> = {
  support: 'text-green-600',
  tank: 'text-blue-500',
  dealer: 'text-red-500',
}

async function fetchParties(scheduleId: string) {
  const res = await fetch(`/api/parties?scheduleId=${scheduleId}`)
  if (!res.ok) throw new Error('파티 조회 실패')
  return res.json() as Promise<PartyResult>
}

export default function PartiesPage() {
  const { data: raids = [], isLoading: loadingRaids } = useRaids()
  const [activeRaidTab, setActiveRaidTab] = useState(0)
  const [selectedScheduleId, setSelectedScheduleId] = useState('')

  const activeRaid = raids[activeRaidTab]
  const activeSchedules = (activeRaid?.raid_schedules ?? [])
    .filter((s) => s.is_active)
    .sort((a, b) => {
      const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
    })

  // 레이드 탭 바뀌면 첫 번째 스케줄 자동 선택
  useEffect(() => {
    if (activeSchedules.length > 0) {
      setSelectedScheduleId(activeSchedules[0].id)
    }
  }, [activeRaidTab, raids])

  const { data, isLoading: loadingParties } = useQuery({
    queryKey: ['partyResult', selectedScheduleId],
    queryFn: () => fetchParties(selectedScheduleId),
    enabled: !!selectedScheduleId,
  })

  const parties = data?.parties ?? []
  const weekDate = data?.weekDate ?? ''

  const teamMap = new Map<number, Party[]>()
  for (const party of parties) {
    const { teamIdx } = decodePartyNumber(party.partyNumber)
    if (!teamMap.has(teamIdx)) teamMap.set(teamIdx, [])
    teamMap.get(teamIdx)!.push(party)
  }
  const teams = [...teamMap.entries()].sort(([a], [b]) => a - b)

  const dateLabel = weekDate
    ? (() => {
        const d = new Date(weekDate)
        return `${d.getMonth() + 1}/${d.getDate()}`
      })()
    : ''

  if (loadingRaids) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">파티 확인</h1>
      </div>

      {raids.length === 0 ? (
        <p className="text-center text-gray-400 py-16">등록된 레이드가 없어요.</p>
      ) : (
        <>
          {/* 레이드 탭 */}
          {raids.length > 1 && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {raids.map((raid, i) => (
                <button
                  key={raid.id}
                  onClick={() => setActiveRaidTab(i)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeRaidTab === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {raid.name}
                </button>
              ))}
            </div>
          )}

          {/* 스케줄 탭 */}
          {activeSchedules.length > 1 && (
            <div className="flex gap-2 mb-5">
              {activeSchedules.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScheduleId(s.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedScheduleId === s.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {DAY_LABEL[s.day_of_week]}
                </button>
              ))}
            </div>
          )}

          {/* 날짜 표시 */}
          {dateLabel && (
            <p className="text-sm text-gray-400 mb-5">{dateLabel} 파티 구성</p>
          )}

          {/* 파티 목록 */}
          {loadingParties ? (
            <div className="flex flex-col gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
              ))}
            </div>
          ) : parties.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg font-medium text-gray-500 mb-2">아직 파티가 저장되지 않았습니다!</p>
              <p className="text-sm text-gray-400">관리자가 파티를 구성하면 여기서 확인할 수 있어요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {teams.map(([teamIdx, teamParties]) => {
                const style = TEAM_STYLES[teamIdx] ?? TEAM_STYLES[0]
                const teamName = TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`
                const allMembers = teamParties.flatMap((p) => p.members)
                const teamAvg = allMembers.length
                  ? Math.round(allMembers.reduce((s, m) => s + m.combatPower, 0) / allMembers.length)
                  : 0

                return (
                  <div key={teamIdx}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className={`text-base font-bold ${style.label}`}>{teamName}</span>
                      <span className="text-xs text-gray-400">평균 {formatCp(teamAvg)}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {teamParties.map((party, subIdx) => {
                        const partyAvg = party.members.length
                          ? Math.round(party.members.reduce((s, m) => s + m.combatPower, 0) / party.members.length)
                          : 0
                        const hasMyChar = party.members.some((m) => m.isMe)

                        return (
                          <div
                            key={party.partyNumber}
                            className={`bg-white rounded-xl border overflow-hidden ${
                              hasMyChar ? 'border-indigo-300 shadow-sm' : style.card
                            }`}
                          >
                            <div className={`flex items-center justify-between px-4 py-2.5 ${style.header}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold ${style.label}`}>
                                  {subIdx + 1}파티
                                </span>
                                {hasMyChar && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                                    내 파티
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">평균 {formatCp(partyAvg)}</span>
                            </div>

                            <div className="divide-y divide-gray-50">
                              {party.members.map((member, i) => {
                                const cls = CLASSES.find((c) => c.name === member.class)
                                return (
                                  <div
                                    key={`${member.sourceCharacterId}-${i}`}
                                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                                      member.isMe ? 'bg-indigo-50/60' : ''
                                    }`}
                                  >
                                    <span className={`flex-1 font-medium truncate ${member.isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                                      {member.userNickname}
                                      {member.isDuplicate && (
                                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                                          중복
                                        </span>
                                      )}
                                    </span>
                                    <span className={`text-xs font-medium shrink-0 ${CLASS_COLOR[cls?.type ?? 'dealer']}`}>
                                      {cls?.label ?? member.class}
                                    </span>
                                    <span className="text-xs text-gray-400 tabular-nums shrink-0">
                                      {formatCp(member.combatPower)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
