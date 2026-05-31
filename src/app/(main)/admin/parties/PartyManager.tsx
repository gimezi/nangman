'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { RaidWithSchedules, DAY_LABEL } from '@/types/raid'
import { useApplicants, useSavedParties, useSaveParties, useTeamPreferences, usePositionPreferences, useAllUsers } from '@/hooks/useAdminParties'
import AllCharactersSidebar from './AllCharactersSidebar'
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

type Props = {
  raids: RaidWithSchedules[]
  initialScheduleId?: string
  initialWeekDate?: string
}

type PartyMoveTarget =
  | 'bench'
  | {
      teamIdx: number
      subIdx: number
    }

type ActiveDragData =
  | { char: PartySlotCharacter; from: 'bench' | { teamIdx: number; subIdx: number } }
  | { char: PartyCharacter; from: 'sidebar' }

// 드래그 중 오버레이에 표시할 캐릭터 카드
function DragCharOverlay({ char }: { char: PartyCharacter }) {
  const cls = CLASSES.find((c) => c.name === char.class)
  return (
    <div className="bg-white shadow-xl rounded-lg border border-indigo-300 px-3 py-2 text-sm flex items-center gap-2 w-72 cursor-grabbing">
      <span className="text-gray-300 select-none">⠿</span>
      <span className="font-medium text-gray-800 truncate">{char.userNickname}</span>
      <span className="text-gray-400 text-xs truncate">· {char.nickname}</span>
      {char.isVolunteer && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold shrink-0">지원</span>
      )}
      <span className="ml-auto text-xs text-gray-500 tabular-nums shrink-0">{formatCp(char.combat_power)}</span>
      {cls && <span className="text-xs text-gray-400 shrink-0">{cls.label}</span>}
    </div>
  )
}

// 벤치의 드래그 가능한 아이템
function DraggableBenchItem({
  char,
  allPartyLabels,
  onMoveTo,
}: {
  char: PartySlotCharacter
  allPartyLabels: { teamIdx: number; subIdx: number; label: string }[]
  onMoveTo: (teamIdx: number, subIdx: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: char.slotId,
    data: { char, from: 'bench' as const },
  })
  const cls = CLASSES.find((c) => c.name === char.class)
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-1 ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* 이름 / 직업 / 투력 행 */}
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none select-none shrink-0"
        >
          ⠿
        </span>
        <span className="text-sm font-medium text-gray-800">{char.userNickname || char.nickname}</span>
        <span className={`text-xs font-medium shrink-0 ${
          cls?.type === 'support' ? 'text-green-600' : cls?.type === 'tank' ? 'text-blue-500' : 'text-red-500'
        }`}>
          {cls?.label ?? char.class}
        </span>
        {char.isVolunteer && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold shrink-0">
            지원
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500 tabular-nums shrink-0">{formatCp(char.combat_power)}</span>
      </div>

      {/* 파티 이동 버튼 행 */}
      <div className="flex flex-wrap gap-1 pl-5 mt-1">
        {allPartyLabels.map((p) => (
          <button
            key={`${p.teamIdx}-${p.subIdx}`}
            onClick={() => onMoveTo(p.teamIdx, p.subIdx)}
            className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// 벤치 드롭존
function DroppableBench({
  children,
  count,
}: {
  children: React.ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-4 mb-4 min-h-15 transition-colors ${
        isOver ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200'
      }`}
    >
      <p className="text-sm font-medium text-gray-700 mb-3">미배치 ({count}명)</p>
      {children}
    </div>
  )
}

export default function PartyManager({ raids, initialScheduleId, initialWeekDate }: Props) {
  const [selectedScheduleId, setSelectedScheduleId] = useState(initialScheduleId ?? '')
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(initialWeekDate ?? '')
  const isFirstScheduleEffect = useRef(true)
  const [numTeams, setNumTeams] = useState<number | null>(null)
  
  const [teams, setTeams] = useState<PartySlotCharacter[][][]>([])
  const [bench, setBench] = useState<PartySlotCharacter[]>([])
  const [initialized, setInitialized] = useState(false)
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null)
  const [hoveredNickname, setHoveredNickname] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const selectedSchedule = raids.flatMap((r) => r.raid_schedules).find((s) => s.id === selectedScheduleId)

  const { data: allUsersData = [] } = useAllUsers()

  const { data: applicantData, isLoading: loadingApplicants } = useApplicants(selectedScheduleId, selectedWeekDate || undefined)
  const applicants = applicantData?.characters ?? []
  const availableWeekDates = applicantData?.availableWeekDates ?? []
  const weekDate = selectedWeekDate || applicantData?.weekDate || ''

  const { data: savedParties = [], isLoading: loadingSaved } = useSavedParties(selectedScheduleId, weekDate)
  const { data: teamPreferences = {} } = useTeamPreferences(selectedScheduleId)
  const { data: characterPositions = {} } = usePositionPreferences(selectedScheduleId)
  const saveParties = useSaveParties()

  const allSchedules = raids.flatMap((r) =>
    r.raid_schedules.filter((s) => s.is_active).map((s) => ({ ...s, raidName: r.name }))
  )

  useEffect(() => {
    if (isFirstScheduleEffect.current) {
      isFirstScheduleEffect.current = false
      return
    }
    setTeams([])
    setBench([])
    setInitialized(false)
    setNumTeams(null)
    setSelectedWeekDate('')
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

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as ActiveDragData | undefined
    if (data) setActiveDragData(data)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragData(null)
    const { active, over } = event
    if (!over) return

    const data = active.data.current as ActiveDragData | undefined
    if (!data) return

    const overId = String(over.id)

    if (data.from === 'sidebar') {
      const newChar: PartySlotCharacter = {
        ...data.char,
        slotId: `${data.char.id}:${crypto.randomUUID()}`,
        sourceCharacterId: data.char.id,
        isDuplicate: false,
      }
      if (overId === 'bench') {
        setBench((prev) => [...prev, newChar])
      } else {
        const partyNum = Number(overId)
        if (isNaN(partyNum)) return
        const { teamIdx, subIdx } = decodePartyNumber(partyNum)
        setTeams((prev) => {
          const next = prev.map((team) => team.map((party) => [...party]))
          if (!next[teamIdx]) next[teamIdx] = []
          if (!next[teamIdx][subIdx]) next[teamIdx][subIdx] = []
          next[teamIdx][subIdx] = [...next[teamIdx][subIdx], newChar]
          return next
        })
      }
      return
    }

    const { char, from } = data
    let to: PartyMoveTarget
    if (overId === 'bench') {
      to = 'bench'
    } else {
      const partyNum = Number(overId)
      if (isNaN(partyNum)) return
      const { teamIdx, subIdx } = decodePartyNumber(partyNum)
      to = { teamIdx, subIdx }
    }

    moveCharacter(char, from, to)
  }

  function handleAutoAssign() {
    if (!selectedSchedule || !numTeams) return

    // 자동배치는 과거 팀 선호도 무시하고 새로 계산
    const result = autoAssignTeams(applicants, numTeams, selectedSchedule.party_size, {}, {})
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

    const result = autoAssignTeams([...allOriginalCharsMap.values()], nextNumTeams, selectedSchedule.party_size, {}, {})
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
    const removed = (teams[teamIdx]?.[subIdx] ?? []).filter((c) => !c.isDuplicate)

    setTeams((prev) => {
      const next = prev.map((team) => team.map((party) => [...party]))
      next[teamIdx] = next[teamIdx].filter((_, i) => i !== subIdx)
      return next.map((team) => team.filter((party) => party))
    })

    setBench((prev) => [...prev, ...removed])
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

  const hasTeams = numTeams != null && teams.some((team) => team.length > 0)
  const applicantIds = new Set(applicants.map((a) => a.id))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragData(null)}
    >
      <div className="flex gap-4 items-start">
        {/* 메인 파티 관리 영역 */}
        <div className="flex-1 min-w-0">
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

              {selectedScheduleId && availableWeekDates.length > 0 && (
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-medium text-gray-500 mb-1">주차</label>
                  <select
                    value={weekDate}
                    onChange={(e) => {
                      setSelectedWeekDate(e.target.value)
                      setTeams([])
                      setBench([])
                      setInitialized(false)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableWeekDates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedScheduleId && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">팀 수</label>
                    <div className="flex gap-1">
                      {[1, 2].map((count) => (
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
                    ? `신청 ${applicants.length}명`
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
                            hoveredNickname={hoveredNickname}
                            onHoverNickname={setHoveredNickname}
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

              <DroppableBench count={bench.length}>
                {bench.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-2">캐릭터를 여기로 드래그하세요</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {bench.map((char) => (
                      <DraggableBenchItem
                        key={char.slotId}
                        char={char}
                        allPartyLabels={allPartyLabels()}
                        onMoveTo={(tIdx, sIdx) => moveCharacter(char, 'bench', { teamIdx: tIdx, subIdx: sIdx })}
                      />
                    ))}
                  </div>
                )}
              </DroppableBench>

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

          {selectedScheduleId && numTeams == null && !loadingApplicants && !loadingSaved && (
            <div className="text-center py-16 text-gray-400">
              팀 수를 먼저 선택해주세요
            </div>
          )}
          {selectedScheduleId && !hasTeams && numTeams && !loadingApplicants && !loadingSaved && (
            <div className="text-center py-16 text-gray-400">
              {applicants.length > 0 ? '자동 배치 버튼을 눌러 파티를 구성해보세요' : '신청 인원이 없어요'}
            </div>
          )}
        </div>

        {/* 전체 캐릭터 사이드바 */}
        <AllCharactersSidebar users={allUsersData} applicantIds={applicantIds} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragData && <DragCharOverlay char={activeDragData.char} />}
      </DragOverlay>
    </DndContext>
  )
}