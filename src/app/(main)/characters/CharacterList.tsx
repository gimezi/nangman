'use client'

import { useState } from 'react'
import { ClassType } from '@/models/classes'
import CharacterModal from './CharacterModal'
import { useCharacters, useDeleteCharacter } from '@/hooks/useCharacters'
import { formatCp } from '@/lib/format'
import { Character } from './page'

type Props = {
  classes: ClassType[]
}

const TYPE_BADGE: Record<string, string> = {
  dealer: 'bg-red-50 text-red-600',
  support: 'bg-green-50 text-green-600',
  tank: 'bg-blue-50 text-blue-600',
}

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜러',
  support: '서포터',
  tank: '탱커',
}

export default function CharacterList({ classes }: Props) {
  const { data: characters = [], isLoading } = useCharacters()
  const deleteMutation = useDeleteCharacter()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Character | null>(null)

  function getClassInfo(className: string) {
    return classes.find((c) => c.name === className)
  }

  function handleEdit(character: Character) {
    setEditTarget(character)
    setModalOpen(true)
  }

  function handleAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 h-16 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {characters.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">등록된 캐릭터가 없어요</p>
            <p className="text-sm mt-1">아래 버튼으로 캐릭터를 추가해보세요</p>
          </div>
        ) : (
          characters.map((char) => {
            const classInfo = getClassInfo(char.class)
            return (
              <div
                key={char.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{char.nickname}</span>
                    {classInfo && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[classInfo.type]}`}>
                        {TYPE_LABEL[classInfo.type]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{classInfo?.label ?? char.class}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium text-gray-700">{formatCp(char.combat_power)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(char)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('캐릭터를 삭제할까요?')) deleteMutation.mutate(char.id)
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })
        )}

        <button
          onClick={handleAdd}
          className="mt-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + 캐릭터 추가
        </button>
      </div>

      {modalOpen && (
        <CharacterModal
          character={editTarget}
          classes={classes}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
