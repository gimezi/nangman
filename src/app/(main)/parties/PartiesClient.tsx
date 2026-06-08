'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useRaids } from '@/hooks/useRaids'
import { DAY_LABEL } from '@/types/raid'
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
  isAdmin: boolean
  isMe: boolean
}

const OFFICER_EXCEPTION = '필릭스용복리'

function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    const aOfficer = a.isAdmin && a.userNickname !== OFFICER_EXCEPTION
    const bOfficer = b.isAdmin && b.userNickname !== OFFICER_EXCEPTION
    if (aOfficer !== bOfficer) return aOfficer ? -1 : 1
    return a.userNickname.localeCompare(b.userNickname, 'ko')
  })
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

type SnackbarType = 'copy' | 'discord' | null

export default function PartiesClient({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  const { data: raids = [], isLoading: loadingRaids } = useRaids()
  const [activeRaidTab, setActiveRaidTab] = useState(0)
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [snackbar, setSnackbar] = useState<SnackbarType>(null)
  const [discordLoading, setDiscordLoading] = useState(false)

  function showSnackbar(type: SnackbarType) {
    setSnackbar(type)
    setTimeout(() => setSnackbar(null), 2000)
  }

  function copyParty(teamName: string, subIdx: number, members: Member[]) {
    const names = members.map((m) => m.userNickname).join('/')
    const text = `${teamName} ${subIdx + 1}파티 - [${names}]`
    navigator.clipboard.writeText(text).then(() => showSnackbar('copy'))
  }

  async function sendDiscord() {
    if (!selectedScheduleId || !parties.length) return
    setDiscordLoading(true)
    try {
      const res = await fetch('/api/admin/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parties, weekDate, raidName: activeRaid?.name ?? '' }),
      })
      if (res.ok) {
        showSnackbar('discord')
      } else {
        const { error } = await res.json().catch(() => ({ error: `${res.status}` }))
        alert(`디스코드 전송 실패: ${error}`)
      }
    } catch (e) {
      alert(`디스코드 전송 오류: ${e}`)
    } finally {
      setDiscordLoading(false)
    }
  }

  const activeRaid = raids[activeRaidTab]
  const activeSchedules = (activeRaid?.raid_schedules ?? [])
    .filter((s) => s.is_active)
    .sort((a, b) => {
      const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
    })

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">파티 확인</h1>
        {isAdmin && parties.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/parties?scheduleId=${selectedScheduleId}&weekDate=${weekDate}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
              파티 수정
            </button>
            <button
              onClick={sendDiscord}
              disabled={discordLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.054a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              {discordLoading ? '전송 중...' : '디스코드 공유'}
            </button>
          </div>
        )}
      </div>

      {raids.length === 0 ? (
        <p className="text-center text-gray-400 py-16">등록된 레이드가 없어요.</p>
      ) : (
        <>
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

          {dateLabel && (
            <p className="text-sm text-gray-400 mb-5">{dateLabel} 파티 구성</p>
          )}

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
            <div className={`grid gap-4 ${teams.length === 1 ? 'grid-cols-1' : teams.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
                            onClick={() => copyParty(teamName, subIdx, party.members)}
                            className={`bg-white rounded-xl border overflow-hidden cursor-pointer active:opacity-70 transition-opacity ${
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
                              {sortMembers(party.members).map((member, i) => {
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

      {/* 스낵바 */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-full shadow-lg transition-all duration-300 ${
        snackbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        {snackbar === 'discord' ? '디스코드로 전송했습니다' : '복사 완료되었습니다'}
      </div>
    </div>
  )
}
