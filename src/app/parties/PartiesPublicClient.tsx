'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CLASSES } from '@/models/classes'
import { formatCp } from '@/lib/format'
import { decodePartyNumber } from '@/lib/partyAlgorithm'

type Schedule = {
  id: string
  day_of_week: string
  party_size: number
}

type Raid = {
  id: string
  name: string
  raid_schedules: Schedule[]
}

type Member = {
  nickname: string
  class: string
  combatPower: number
  userNickname: string
  isAdmin: boolean
  isDuplicate: boolean
}

type Party = {
  partyNumber: number
  members: Member[]
}

const DAY_LABEL: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}

const TEAM_LABEL = ['홍팀', '청팀', '녹팀', '황팀', '백팀']
const TEAM_COLOR = [
  { header: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  { header: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  { header: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  { header: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  { header: 'bg-gray-50 border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
]

const TYPE_COLOR: Record<string, string> = {
  dealer: 'text-red-500',
  support: 'text-green-600',
  tank: 'text-blue-500',
}

function avgCp(members: Member[]) {
  if (!members.length) return 0
  return Math.round(members.reduce((s, m) => s + m.combatPower, 0) / members.length)
}

export default function PartiesPublicClient({ raids, isAdmin }: { raids: Raid[]; isAdmin: boolean }) {
  const router = useRouter()
  const allSchedules = raids.flatMap((r) =>
    r.raid_schedules.map((s) => ({ ...s, raidName: r.name }))
  )

  const [selectedId, setSelectedId] = useState(allSchedules[0]?.id ?? '')
  const [parties, setParties] = useState<Party[]>([])
  const [weekDate, setWeekDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [snackbar, setSnackbar] = useState('')

  async function handleDiscord() {
    setDiscordLoading(true)
    try {
      const raidName = allSchedules.find((s) => s.id === selectedId)?.raidName ?? ''
      const res = await fetch('/api/admin/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parties, weekDate, raidName }),
      })
      if (res.ok) {
        setSnackbar('디스코드에 공유했어요!')
      } else {
        const { error } = await res.json().catch(() => ({ error: '알 수 없는 오류' }))
        setSnackbar(`오류: ${error}`)
      }
    } catch {
      setSnackbar('요청 실패')
    } finally {
      setDiscordLoading(false)
      setTimeout(() => setSnackbar(''), 3000)
    }
  }

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    fetch(`/api/public/parties?scheduleId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        setParties(d.parties ?? [])
        setWeekDate(d.weekDate ?? '')
      })
      .finally(() => setLoading(false))
  }, [selectedId])

  // 팀별로 파티 그룹핑
  const teamGroups = parties.reduce<Map<number, Party[]>>((map, p) => {
    const { teamIdx } = decodePartyNumber(p.partyNumber)
    if (!map.has(teamIdx)) map.set(teamIdx, [])
    map.get(teamIdx)!.push(p)
    return map
  }, new Map())

  const teamKeys = [...teamGroups.keys()].sort()

  const selectedSchedule = allSchedules.find((s) => s.id === selectedId)

  return (
    <>
      {/* 레이드 탭 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {allSchedules.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedId === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.raidName} ({DAY_LABEL[s.day_of_week]}요일)
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => router.push(`/admin/parties?scheduleId=${selectedId}&weekDate=${weekDate}`)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            파티 수정
          </button>
          <button
            onClick={handleDiscord}
            disabled={discordLoading || parties.length === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {discordLoading ? '공유 중...' : '디스코드 공유'}
          </button>
        </div>
      )}

      {snackbar && (
        <div
          className="text-sm rounded-lg shadow-lg"
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1f2937', color: '#ffffff', padding: '8px 16px', whiteSpace: 'nowrap' }}
        >
          {snackbar}
        </div>
      )}

      {weekDate && (
        <p className="text-sm text-gray-400 mb-4">{weekDate.replace(/-/g, '.')} 기준</p>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && parties.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          등록된 파티가 없어요
        </div>
      )}

      {!loading && teamKeys.map((teamIdx) => {
        const color = TEAM_COLOR[teamIdx] ?? TEAM_COLOR[TEAM_COLOR.length - 1]
        const teamParties = teamGroups.get(teamIdx)!
        const partySize = selectedSchedule?.party_size ?? 6

        return (
          <div key={teamIdx} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${color.badge}`}>
                {TEAM_LABEL[teamIdx] ?? `${teamIdx + 1}팀`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamParties.map((party) => {
                const { subIdx } = decodePartyNumber(party.partyNumber)
                const avg = avgCp(party.members)
                const empty = Math.max(0, partySize - party.members.length)

                const handleCopy = isAdmin
                  ? async () => {
                      const label = `${TEAM_LABEL[teamIdx] ?? `${teamIdx + 1}팀`} ${subIdx + 1}파티`
                      const names = party.members.map((m) => m.userNickname).join(' / ')
                      const text = `${label} - [${names}]`
                      try {
                        await navigator.clipboard.writeText(text)
                      } catch {
                        const ta = document.createElement('textarea')
                        ta.value = text
                        ta.style.position = 'fixed'
                        ta.style.opacity = '0'
                        document.body.appendChild(ta)
                        ta.select()
                        document.execCommand('copy')
                        document.body.removeChild(ta)
                      }
                      setSnackbar(`${label} 복사됨!`)
                      setTimeout(() => setSnackbar(''), 3000)
                    }
                  : undefined

                return (
                  <div
                    key={party.partyNumber}
                    onClick={handleCopy}
                    className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${isAdmin ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${color.header}`}>
                      <span className={`text-xs font-semibold ${color.text}`}>
                        {TEAM_LABEL[teamIdx] ?? `${teamIdx + 1}팀`} {subIdx + 1}파티
                      </span>
                      <span className="text-xs text-gray-500">
                        평균 {formatCp(avg)} · {party.members.length}/{partySize}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {party.members.map((m, i) => {
                        const cls = CLASSES.find((c) => c.name === m.class)
                        return (
                          <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                            <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                              {m.userNickname}
                              {m.isDuplicate && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">중복</span>
                              )}
                              {m.isAdmin && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">임원</span>
                              )}
                            </span>
                            {cls && (
                              <span className={`text-xs font-medium shrink-0 ${TYPE_COLOR[cls.type]}`}>
                                {cls.label}
                              </span>
                            )}
                            <span className="text-xs tabular-nums text-gray-400 shrink-0">
                              {formatCp(m.combatPower)}
                            </span>
                          </div>
                        )
                      })}
                      {Array.from({ length: empty }).map((_, i) => (
                        <div key={`e${i}`} className="px-4 py-2.5 text-xs text-gray-300">빈 자리</div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
