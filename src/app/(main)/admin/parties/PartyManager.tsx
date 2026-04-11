'use client'

import { useState, useEffect } from 'react'
import { RaidWithSchedules, DAY_LABEL } from '@/types/raid'
import { useApplicants, useSavedParties, useSaveParties } from '@/hooks/useAdminParties'
import {
  autoAssignTeams,
  PartyCharacter,
  PartySlotCharacter,
  avgCp,
  encodePartyNumber,
  decodePartyNumber,
  TEAM_NAMES,
  duplicateSlot,
} from '@/lib/partyAlgorithm'
import { formatCp } from '@/lib/format'
import { CLASSES } from '@/models/classes'
import PartyBoard from './PartyBoard'

type Props = { raids: RaidWithSchedules[] }

type PartyMoveTarget =
  | 'bench'
  | {
      teamIdx: number
      subIdx: number
    }

export default function PartyManager({ raids }: Props) {
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [numTeams, setNumTeams] = useState(2)
  const [teams, setTeams] = useState<PartySlotCharacter[][][]>([])
  const [bench, setBench] = useState<PartySlotCharacter[]>([])
  const [initialized, setInitialized] = useState(false)

  const selectedSchedule = raids.flatMap((r) => r.raid_schedules).find((s) => s.id === selectedScheduleId)

  const { data: applicantData, isLoading: loadingApplicants } = useApplicants(selectedScheduleId)
  const applicants = applicantData?.characters ?? []
  const weekDate = applicantData?.weekDate ?? ''

  const { data: savedParties = [], isLoading: loadingSaved } = useSavedParties(selectedScheduleId, weekDate)
  const saveParties = useSaveParties()

  const allSchedules = raids.flatMap((r) =>
    r.raid_schedules.filter((s) => s.is_active).map((s) => ({ ...s, raidName: r.name }))
  )

  useEffect(() => {
    setTeams([])
    setBench([])
    setInitialized(false)
  }, [selectedScheduleId])

  useEffect(() => {
    if (!savedParties.length || !applicants.length || initialized) return

    const maxTeamIdx = Math.max(0, ...savedParties.map((sp) => decodePartyNumber(sp.party_number).teamIdx))
    const loadedTeams: PartySlotCharacter[][][] = Array.from({ length: maxTeamIdx + 1 }, () => [])

    for (const sp of savedParties) {
      const { teamIdx, subIdx } = decodePartyNumber(sp.party_number)

      if (!loadedTeams[teamIdx]) loadedTeams[teamIdx] = []
      if (!loadedTeams[teamIdx][subIdx]) loadedTeams[teamIdx][subIdx] = []

      loadedTeams[teamIdx][subIdx] = sp.party_members
        .map((pm) => {
          const found = applicants.find((a) => a.id === pm.character_id)
          if (!found) return null

          return {
            ...found,
            slotId: pm.slot_id ?? `${pm.character_id}:${crypto.randomUUID()}`,
            sourceCharacterId: pm.source_character_id ?? pm.character_id,
            isDuplicate: pm.is_duplicate ?? false,
          } satisfies PartySlotCharacter
        })
        .filter(Boolean) as PartySlotCharacter[]
    }

    const normalizedTeams = loadedTeams.map((team) => team.filter((party) => party))
    const usedOriginalIds = new Set(
      normalizedTeams.flat(2).filter((c) => !c.isDuplicate).map((c) => c.sourceCharacterId)
    )

    setTeams(normalizedTeams)

    setBench(
      applicants
        .filter((a) => !usedOriginalIds.has(a.id))
        .map((a) => ({
          ...a,
          slotId: `${a.id}:${crypto.randomUUID()}`,
          sourceCharacterId: a.id,
          isDuplicate: false,
        }))
    )

    setNumTeams(Math.max(1, normalizedTeams.length))
    setInitialized(true)
  }, [savedParties, applicants, initialized])

  function handleAutoAssign() {
    if (!selectedSchedule) return

    const result = autoAssignTeams(applicants, numTeams, selectedSchedule.party_size)
    setTeams(result.teams)
    setBench(result.bench)
    setInitialized(true)
  }

  function handleNumTeamsChange(nextNumTeams: number) {
    setNumTeams(nextNumTeams)

    if (!selectedSchedule) return

    const allOriginalCharsMap = new Map<string, PartyCharacter>()

    for (const slot of [...teams.flat(2), ...bench]) {
      if (!allOriginalCharsMap.has(slot.sourceCharacterId)) {
        allOriginalCharsMap.set(slot.sourceCharacterId, {
          id: slot.sourceCharacterId,
          nickname: slot.nickname,
          class: slot.class,
          combat_power: slot.combat_power,
          userNickname: slot.userNickname,
        })
      }
    }

    const result = autoAssignTeams([...allOriginalCharsMap.values()], nextNumTeams, selectedSchedule.party_size)
    setTeams(result.teams)
    setBench(result.bench)
    setInitialized(true)
  }

  function moveCharacter(char: PartySlotCharacter, from: PartyMoveTarget, to: PartyMoveTarget) {
    if (from === 'bench' && to === 'bench') return

    if (from !== 'bench' && to !== 'bench' && from.teamIdx === to.teamIdx && from.subIdx === to.subIdx) {
      return
    }

    setTeams((prev) => {
      const next = prev.map((team) => team.map((party) => [...party]))

      if (from !== 'bench') {
        next[from.teamIdx][from.subIdx] = next[from.teamIdx][from.subIdx].filter((c) => c.slotId !== char.slotId)
      }

      if (to !== 'bench') {
        if (!next[to.teamIdx]) next[to.teamIdx] = []
        if (!next[to.teamIdx][to.subIdx]) next[to.teamIdx][to.subIdx] = []
        next[to.teamIdx][to.subIdx] = [...next[to.teamIdx][to.subIdx], char]
      }

      return next.map((team) => team.filter((party) => party))
    })

    setBench((prev) => {
      let next = [...prev]
      if (from === 'bench') next = next.filter((c) => c.slotId !== char.slotId)
      if (to === 'bench') next = [...next, char]
      return next
    })
  }

  function duplicateCharacterToParty(char: PartySlotCharacter, to: { teamIdx: number; subIdx: number }) {
    const copied = duplicateSlot(char)

    setTeams((prev) => {
      const next = prev.map((team) => team.map((party) => [...party]))
      if (!next[to.teamIdx]) next[to.teamIdx] = []
      if (!next[to.teamIdx][to.subIdx]) next[to.teamIdx][to.subIdx] = []
      next[to.teamIdx][to.subIdx] = [...next[to.teamIdx][to.subIdx], copied]
      return next
    })
  }

  function addParty(teamIdx: number) {
    setTeams((prev) => {
      const next = prev.map((team) => [...team])
      if (!next[teamIdx]) next[teamIdx] = []
      next[teamIdx].push([])
      return next
    })
  }

  function removeParty(teamIdx: number, subIdx: number) {
    setTeams((prev) => {
      const next = prev.map((team) => team.map((party) => [...party]))
      const removed = next[teamIdx]?.[subIdx] ?? []

      next[teamIdx] = next[teamIdx].filter((_, i) => i !== subIdx)

      setBench((benchPrev) => [
        ...benchPrev,
        ...removed.filter((c) => !c.isDuplicate),
      ])

      return next.map((team) => team.filter((party) => party))
    })
  }

  function handleSave() {
    if (!weekDate) return

    saveParties.mutate({
      scheduleId: selectedScheduleId,
      weekDate,
      parties: teams.flatMap((team, teamIdx) =>
        team.map((party, subIdx) => ({
          partyNumber: encodePartyNumber(teamIdx, subIdx),
          members: party.map((c, index) => ({
            slotId: c.slotId,
            characterId: c.sourceCharacterId,
            sourceCharacterId: c.sourceCharacterId,
            isDuplicate: c.isDuplicate,
            sortOrder: index,
          })),
        }))
      ),
    })
  }

  function allPartyLabels() {
    return teams.flatMap((team, teamIdx) =>
      team.map((party, subIdx) => ({
        teamIdx,
        subIdx,
        label: `${TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`} ${subIdx + 1}파티`,
        characters: party,
      }))
    )
  }

  const hasTeams = teams.some((team) => team.length > 0)

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">레이드 선택</label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택하세요</option>
              {allSchedules.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.raidName} — {DAY_LABEL[s.day_of_week]}
                </option>
              ))}
            </select>
          </div>

          {selectedScheduleId && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">팀 수</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleNumTeamsChange(count)}
                      className={`w-10 h-9 rounded-lg text-sm font-medium border transition-colors ${
                        numTeams === count
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAutoAssign}
                disabled={loadingApplicants || !applicants.length}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              >
                자동 배치
              </button>
            </>
          )}
        </div>

        {selectedScheduleId && (
          <p className="text-xs text-gray-400 mt-2">
            {loadingApplicants || loadingSaved
              ? '불러오는 중...'
              : weekDate
                ? `${weekDate} 기준 · 신청 ${applicants.length}명`
                : '신청 데이터 없음'}
          </p>
        )}
      </div>

      {hasTeams && (
        <>
          <div
            className={`grid gap-4 mb-4 ${
              numTeams === 1 ? 'grid-cols-1' : numTeams === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {teams.map((team, teamIdx) => {
              const teamAvg = avgCp(team.flat())
              const teamName = TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`
              const teamColorClass =
                teamIdx === 0 ? 'text-red-600' : teamIdx === 1 ? 'text-blue-600' : 'text-emerald-600'
              const teamColor = teamIdx === 0 ? 'red' : teamIdx === 1 ? 'blue' : 'green'

              return (
                <div key={teamIdx}>
                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${teamColorClass}`}>{teamName}</span>
                      <span className="text-xs text-gray-400">평균 {formatCp(teamAvg)}</span>
                    </div>

                    <button
                      onClick={() => addParty(teamIdx)}
                      className="text-xs px-2 py-1 rounded border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                    >
                      + 파티 추가
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {team.map((party, subIdx) => (
                      <PartyBoard
                        key={`${teamIdx}-${subIdx}`}
                        partyLabel={`${teamName} ${subIdx + 1}파티`}
                        partyNumber={encodePartyNumber(teamIdx, subIdx)}
                        characters={party}
                        partySize={selectedSchedule?.party_size ?? 4}
                        teamColor={teamColor}
                        allParties={allPartyLabels().map((p) => ({
                          partyNumber: encodePartyNumber(p.teamIdx, p.subIdx),
                          label: p.label,
                          characters: p.characters,
                        }))}
                        onMoveOut={(char) => moveCharacter(char, { teamIdx, subIdx }, 'bench')}
                        onSwap={(char, toPartyNumber) => {
                          const { teamIdx: toTeamIdx, subIdx: toSubIdx } = decodePartyNumber(toPartyNumber)
                          moveCharacter(char, { teamIdx, subIdx }, { teamIdx: toTeamIdx, subIdx: toSubIdx })
                        }}
                        onDuplicateTo={(char, toPartyNumber) => {
                          const { teamIdx: toTeamIdx, subIdx: toSubIdx } = decodePartyNumber(toPartyNumber)
                          duplicateCharacterToParty(char, { teamIdx: toTeamIdx, subIdx: toSubIdx })
                        }}
                        onDelete={() => removeParty(teamIdx, subIdx)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {bench.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">미배치 ({bench.length}명)</p>

              <div className="flex flex-col gap-2">
                {bench.map((char) => {
                  const cls = CLASSES.find((c) => c.name === char.class)

                  return (
                    <div key={char.slotId} className="flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-gray-800">{char.userNickname}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-600">{char.nickname}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {cls?.label} {formatCp(char.combat_power)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {allPartyLabels().map((p) => (
                          <button
                            key={`${p.teamIdx}-${p.subIdx}`}
                            onClick={() =>
                              moveCharacter(char, 'bench', {
                                teamIdx: p.teamIdx,
                                subIdx: p.subIdx,
                              })
                            }
                            className={`text-xs px-2 py-1 rounded ${
                              p.teamIdx === 0
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : p.teamIdx === 1
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saveParties.isPending || !weekDate}
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {saveParties.isPending ? '저장 중...' : '파티 구성 저장'}
          </button>

          {saveParties.isSuccess && <p className="text-green-600 text-sm text-center mt-2">저장됐어요!</p>}
        </>
      )}

      {selectedScheduleId && !hasTeams && !loadingApplicants && !loadingSaved && (
        <div className="text-center py-16 text-gray-400">
          {applicants.length > 0 ? '자동 배치 버튼을 눌러 파티를 구성해보세요' : '신청 인원이 없어요'}
        </div>
      )}
    </div>
  )
}