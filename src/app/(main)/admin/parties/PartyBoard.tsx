'use client'

import { useState } from 'react'
import { PartySlotCharacter, avgCp } from '@/lib/partyAlgorithm'
import { formatCp } from '@/lib/format'
import { CLASSES } from '@/models/classes'

type Props = {
  partyLabel: string
  partyNumber: number
  characters: PartySlotCharacter[]
  partySize: number
  teamColor: 'red' | 'blue' | 'green' | 'gray'
  allParties: { partyNumber: number; label: string; characters: PartySlotCharacter[] }[]
  onMoveOut: (char: PartySlotCharacter) => void
  onSwap: (char: PartySlotCharacter, toPartyNumber: number) => void
  onDuplicateTo: (char: PartySlotCharacter, toPartyNumber: number) => void
  onDelete?: () => void
}

const TYPE_COLOR: Record<string, string> = {
  dealer: 'text-red-500',
  support: 'text-green-600',
  tank: 'text-blue-500',
}

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜',
  support: '서포',
  tank: '탱',
}

const TEAM_COLOR_CLASS = {
  red: {
    header: 'bg-red-50',
    text: 'text-red-700',
  },
  blue: {
    header: 'bg-blue-50',
    text: 'text-blue-700',
  },
  green: {
    header: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  gray: {
    header: 'bg-gray-50',
    text: 'text-gray-700',
  },
}

export default function PartyBoard({
  partyLabel,
  partyNumber,
  characters,
  partySize,
  teamColor,
  allParties,
  onMoveOut,
  onSwap,
  onDuplicateTo,
  onDelete,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const avg = avgCp(characters)
  const empty = Math.max(0, partySize - characters.length)
  const colorSet = TEAM_COLOR_CLASS[teamColor]

  function handleRowClick(char: PartySlotCharacter) {
    setSelectedId((prev) => (prev === char.slotId ? null : char.slotId))
  }

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

      <div className="divide-y divide-gray-50">
        {characters.map((char) => {
          const cls = CLASSES.find((c) => c.name === char.class)
          const isSelected = selectedId === char.slotId

          return (
            <div key={char.slotId}>
              <div
                onClick={() => handleRowClick(char)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                  isSelected ? 'bg-yellow-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-20 truncate text-gray-800 font-medium">{char.userNickname}</span>
                <span className="w-20 truncate text-gray-400 text-xs">· {char.nickname}</span>
                <span className={`w-12 text-xs font-medium ${cls ? TYPE_COLOR[cls.type] : ''}`}>
                  {cls ? TYPE_LABEL[cls.type] : ''}{' '}
                  {cls?.label ? cls.label.slice(0, 3) : char.class.slice(0, 3)}
                </span>

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
                        onClick={() => {
                          onSwap(char, p.partyNumber)
                          setSelectedId(null)
                        }}
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
                        onClick={() => {
                          onDuplicateTo(char, p.partyNumber)
                          setSelectedId(null)
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        복제 → {p.label}
                      </button>
                    ))}

                  <button
                    onClick={() => {
                      onMoveOut(char)
                      setSelectedId(null)
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    빼기
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} className="px-3 py-2 text-xs text-gray-300">
            빈 자리
          </div>
        ))}
      </div>
    </div>
  )
}