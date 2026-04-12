import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { CLASSES } from '@/models/classes'
import { formatCp } from '@/lib/format'
import { decodePartyNumber, TEAM_NAMES, avgCp } from '@/lib/partyAlgorithm'
import { DAY_LABEL } from '@/types/raid'
import { getWeekDate, formatWeekDate } from '@/lib/weekDate'

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

type Member = {
  sourceCharacterId: string
  isDuplicate: boolean
  sortOrder: number
  nickname: string
  class: string
  combatPower: number
  userNickname: string
}

type Party = {
  partyNumber: number
  members: Member[]
}

export default async function PartyResultPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const session = await getSession()

  const [{ data: schedule }, { data: myCharacters }] = await Promise.all([
    supabase
      .from('raid_schedules')
      .select('id, day_of_week, deadline_day, deadline_time, raids(name)')
      .eq('id', scheduleId)
      .single(),
    session
      ? supabase.from('characters').select('id').eq('user_id', session.userId)
      : Promise.resolve({ data: [] }),
  ])

  if (!schedule) notFound()

  const weekDate = formatWeekDate(
    getWeekDate(schedule.day_of_week, schedule.deadline_day, schedule.deadline_time)
  )

  const { data: rawParties } = await supabase
    .from('parties')
    .select(`
      party_number,
      party_members (
        source_character_id,
        is_duplicate,
        sort_order,
        characters (
          nickname,
          class,
          combat_power,
          users ( nickname )
        )
      )
    `)
    .eq('raid_schedule_id', scheduleId)
    .eq('week_date', weekDate)
    .order('party_number', { ascending: true })

  const raidName = (schedule.raids as any)?.name ?? '레이드'
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id))

  // 파티 데이터 정리
  const parties: Party[] = (rawParties ?? []).map((p) => ({
    partyNumber: p.party_number,
    members: [...(p.party_members ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m) => ({
        sourceCharacterId: m.source_character_id,
        isDuplicate: m.is_duplicate ?? false,
        sortOrder: m.sort_order ?? 0,
        nickname: (m.characters as any)?.nickname ?? '',
        class: (m.characters as any)?.class ?? '',
        combatPower: (m.characters as any)?.combat_power ?? 0,
        userNickname: (m.characters as any)?.users?.nickname ?? '',
      })),
  }))

  // 팀별로 그룹핑
  const teamMap = new Map<number, Party[]>()
  for (const party of parties) {
    const { teamIdx } = decodePartyNumber(party.partyNumber)
    if (!teamMap.has(teamIdx)) teamMap.set(teamIdx, [])
    teamMap.get(teamIdx)!.push(party)
  }
  const teams = [...teamMap.entries()].sort(([a], [b]) => a - b)

  const dateObj = new Date(weekDate)
  const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/raids" className="text-gray-400 hover:text-gray-600 text-sm">
          ← 레이드
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {raidName} — {DAY_LABEL[schedule.day_of_week]}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{dateLabel} 파티 구성</p>
      </div>

      {parties.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">아직 파티가 배치되지 않았어요</p>
          <p className="text-sm">관리자가 파티를 구성하면 여기서 확인할 수 있어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {teams.map(([teamIdx, teamParties]) => {
            const style = TEAM_STYLES[teamIdx] ?? TEAM_STYLES[0]
            const teamName = TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`
            const allMembers = teamParties.flatMap((p) => p.members)
            const teamAvgCp = allMembers.length
              ? Math.round(allMembers.reduce((s, m) => s + m.combatPower, 0) / allMembers.length)
              : 0

            return (
              <div key={teamIdx}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`text-base font-bold ${style.label}`}>{teamName}</span>
                  <span className="text-xs text-gray-400">평균 {formatCp(teamAvgCp)}</span>
                </div>

                <div className="flex flex-col gap-3">
                  {teamParties.map((party, subIdx) => {
                    const partyAvg = party.members.length
                      ? Math.round(party.members.reduce((s, m) => s + m.combatPower, 0) / party.members.length)
                      : 0
                    const hasMyChar = party.members.some((m) => myCharacterIds.has(m.sourceCharacterId))

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
                            const isMe = myCharacterIds.has(member.sourceCharacterId)

                            return (
                              <div
                                key={`${member.sourceCharacterId}-${i}`}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                                  isMe ? 'bg-indigo-50/60' : ''
                                }`}
                              >
                                <span className={`flex-1 font-medium truncate ${isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
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
    </div>
  )
}
