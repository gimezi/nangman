'use client'

import { useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PartySlotCharacter, avgCp, decodePartyNumber } from '@/lib/partyAlgorithm'
import { formatCp } from '@/lib/format'
import { CLASSES } from '@/models/classes'

type Props = {
  partyLabel: string
  partyNumber: number
  characters: PartySlotCharacter[]
  partySize: number
  teamColor: 'red' | 'blue' | 'green' | 'gray'
  allParties: { partyNumber: number; label: string; characters: PartySlotCharacter[] }[]
  hoveredNickname: string | null
  onHoverNickname: (n: string | null) => void
  onMoveOut: (char: PartySlotCharacter) => void
  onSwap: (char: PartySlotCharacter, toPartyNumber: number) => void
  onDuplicateTo: (char: PartySlotCharacter, toPartyNumber: number) => void
  onDelete?: () => void
  mainCharSourceIds?: Set<string>
}

const TYPE_COLOR: Record<string, string> = {
  dealer: 'text-red-500',
  support: 'text-green-600',
  tank: 'text-blue-500',
}


const TEAM_COLOR_CLASS = {
  red: { header: 'bg-red-50', text: 'text-red-700' },
  blue: { header: 'bg-blue-50', text: 'text-blue-700' },
  green: { header: 'bg-emerald-50', text: 'text-emerald-700' },
  gray: { header: 'bg-gray-50', text: 'text-gray-700' },
}

type CharRowProps = {
  char: PartySlotCharacter
  teamIdx: number
  subIdx: number
  partyNumber: number
  isSelected: boolean
  isDuplicateUser: boolean
  isHovered: boolean
  isMainChar: boolean
  allParties: Props['allParties']
  onRowClick: (char: PartySlotCharacter) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onMoveOut: () => void
  onSwap: (toPartyNumber: number) => void
  onDuplicateTo: (toPartyNumber: number) => void
}

function DraggableCharRow({
  char,
  teamIdx,
  subIdx,
  partyNumber,
  isSelected,
  isDuplicateUser,
  isHovered,
  isMainChar,
  allParties,
  onRowClick,
  onMouseEnter,
  onMouseLeave,
  onMoveOut,
  onSwap,
  onDuplicateTo,
}: CharRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: char.slotId,
    data: { char, from: { teamIdx, subIdx } },
  })

  const cls = CLASSES.find((c) => c.name === char.class)
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const userTotalChars = allParties.reduce(
    (sum, p) => sum + p.characters.filter((c) => c.userNickname === char.userNickname && !c.isDuplicate).length,
    0
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-30' : ''}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        onClick={() => onRowClick(char)}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-yellow-50'
            : isDuplicateUser
            ? 'bg-red-50 hover:bg-red-100'
            : isHovered
            ? 'bg-blue-100'
            : 'hover:bg-gray-50'
        }`}
      >
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none select-none shrink-0"
        >
          ⠿
        </span>

        <span className="flex-1 truncate text-gray-800 font-medium">
          {char.userNickname}
          {userTotalChars > 1 && (
            <span className="ml-1 text-[11px] font-normal text-gray-400">({userTotalChars})</span>
          )}
        </span>
        <span className={`text-xs font-medium shrink-0 ${cls ? TYPE_COLOR[cls.type] : 'text-gray-500'}`}>
          {cls?.label ?? char.class}
        </span>

        {isMainChar && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold">
            본캐
          </span>
        )}

        {char.isVolunteer && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
            지원
          </span>
        )}

        {char.isDuplicate && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
            중복
          </span>
        )}

        <span className="ml-auto text-xs text-gray-500 tabular-nums">
          {formatCp(char.combat_power)}
        </span>
      </div>

      {isSelected && (
        <div className="flex flex-wrap gap-1 px-3 pb-2 bg-yellow-50">
          {allParties
            .filter((p) => p.partyNumber !== partyNumber)
            .map((p) => (
              <button
                key={`move-${p.partyNumber}`}
                onClick={(e) => { e.stopPropagation(); onSwap(p.partyNumber) }}
                className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              >
                이동 → {p.label}
              </button>
            ))}

          {allParties
            .filter((p) => p.partyNumber !== partyNumber)
            .map((p) => (
              <button
                key={`dup-${p.partyNumber}`}
                onClick={(e) => { e.stopPropagation(); onDuplicateTo(p.partyNumber) }}
                className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                복제 → {p.label}
              </button>
            ))}

          <button
            onClick={(e) => { e.stopPropagation(); onMoveOut() }}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            빼기
          </button>
        </div>
      )}
    </div>
  )
}

export default function PartyBoard({
  partyLabel,
  partyNumber,
  characters,
  partySize,
  teamColor,
  allParties,
  hoveredNickname,
  onHoverNickname,
  onMoveOut,
  onSwap,
  onDuplicateTo,
  onDelete,
  mainCharSourceIds,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { teamIdx, subIdx } = decodePartyNumber(partyNumber)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: String(partyNumber) })

  const OFFICER_EXCEPTION = '필릭스용복리'
  const sorted = [...characters].sort((a, b) => {
    const aOfficer = (a.isAdmin ?? false) && a.userNickname !== OFFICER_EXCEPTION
    const bOfficer = (b.isAdmin ?? false) && b.userNickname !== OFFICER_EXCEPTION
    if (aOfficer !== bOfficer) return aOfficer ? -1 : 1
    return a.userNickname.localeCompare(b.userNickname, 'ko')
  })

  const nicknameCounts = characters.reduce<Record<string, number>>((acc, c) => {
    acc[c.userNickname] = (acc[c.userNickname] ?? 0) + 1
    return acc
  }, {})
  const duplicateUsers = new Set(
    Object.entries(nicknameCounts).filter(([, n]) => n > 1).map(([name]) => name)
  )

  const avg = avgCp(characters)
  const empty = Math.max(0, partySize - characters.length)
  const colorSet = TEAM_COLOR_CLASS[teamColor]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-sm">
      <div className={`flex items-center justify-between px-3 py-2 ${colorSet.header}`}>
        <span className={`font-semibold text-xs ${colorSet.text}`}>{partyLabel}</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            평균 {formatCp(avg)} · {characters.length}/{partySize}
          </span>

          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[11px] px-2 py-1 rounded bg-white/80 text-gray-500 hover:bg-white border border-gray-200"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      <div
        ref={setDropRef}
        className={`divide-y divide-gray-50 min-h-[40px] transition-colors ${isOver ? 'bg-indigo-50/50' : ''}`}
      >
        {sorted.map((char) => (
          <DraggableCharRow
            key={char.slotId}
            char={char}
            teamIdx={teamIdx}
            subIdx={subIdx}
            partyNumber={partyNumber}
            isSelected={selectedId === char.slotId}
            isDuplicateUser={duplicateUsers.has(char.userNickname)}
            isHovered={hoveredNickname === char.userNickname}
            isMainChar={!char.isDuplicate && (mainCharSourceIds?.has(char.sourceCharacterId) ?? false)}
            allParties={allParties}
            onRowClick={(c) => setSelectedId((prev) => (prev === c.slotId ? null : c.slotId))}
            onMouseEnter={() => onHoverNickname(char.userNickname)}
            onMouseLeave={() => onHoverNickname(null)}
            onMoveOut={() => { onMoveOut(char); setSelectedId(null) }}
            onSwap={(pn) => { onSwap(char, pn); setSelectedId(null) }}
            onDuplicateTo={(pn) => { onDuplicateTo(char, pn); setSelectedId(null) }}
          />
        ))}

        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} className="px-3 py-2 text-xs text-gray-300">
            빈 자리
          </div>
        ))}
      </div>
    </div>
  )
}
