'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CLASSES } from '@/models/classes'
import { formatCp } from '@/lib/format'
import { PartyCharacter } from '@/lib/partyAlgorithm'
import { UserWithCharacters } from '@/hooks/useAdminParties'

type Props = {
  users: UserWithCharacters[]
  applicantIds: Set<string>
}

function DraggableSidebarChar({
  char,
  disabled,
  isMain,
}: {
  char: PartyCharacter
  disabled: boolean
  isMain?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar:${char.id}`,
    data: { char, from: 'sidebar' as const },
    disabled,
  })
  const cls = CLASSES.find((c) => c.name === char.class)
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
        disabled ? 'opacity-35' : isDragging ? 'opacity-30' : 'hover:bg-gray-100'
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className={`touch-none select-none shrink-0 ${
          disabled
            ? 'text-gray-200 cursor-default'
            : 'text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing'
        }`}
      >
        ⠿
      </span>
      <span className="font-medium text-gray-800 truncate flex-1">{char.nickname}</span>
      {isMain && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold shrink-0">
          본캐
        </span>
      )}
      <span
        className={`shrink-0 font-medium ${
          cls?.type === 'support'
            ? 'text-green-600'
            : cls?.type === 'tank'
            ? 'text-blue-500'
            : 'text-red-500'
        }`}
      >
        {cls?.label ?? char.class}
      </span>
      <span className="text-gray-400 tabular-nums shrink-0">{formatCp(char.combat_power)}</span>
    </div>
  )
}

export default function AllCharactersSidebar({ users, applicantIds }: Props) {
  const [openUsers, setOpenUsers] = useState<Set<string>>(new Set())

  function toggleUser(userId: string) {
    setOpenUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const filtered = users.filter((u) => u.characters.length > 0)
  const totalChars = filtered.reduce((sum, u) => sum + u.characters.length, 0)

  return (
    <div className="w-52 shrink-0 bg-white rounded-xl border border-gray-200 self-start sticky top-4">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-600">전체 캐릭터</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{totalChars}개 · 신청자 비활성</p>
      </div>
      <div className="overflow-y-auto max-h-[70vh]">
        {filtered.map((user) => {
          const isOpen = openUsers.has(user.id)
          return (
            <div key={user.id} className="border-b border-gray-50 last:border-b-0">
              <button
                onClick={() => toggleUser(user.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
              >
                <span className="text-xs font-medium text-gray-700">{user.nickname}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">{user.characters.length}</span>
                  <span className="text-[10px] text-gray-400">{isOpen ? '▴' : '▾'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="pb-1 bg-gray-50/40">
                  {user.characters
                    .slice()
                    .sort((a, b) => b.combat_power - a.combat_power)
                    .map((char, idx) => (
                      <DraggableSidebarChar
                        key={char.id}
                        char={{ ...char, userNickname: user.nickname }}
                        disabled={applicantIds.has(char.id)}
                        isMain={user.characters.length > 1 && idx === 0}
                      />
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
