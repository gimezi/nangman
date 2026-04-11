'use client'

import { useState } from 'react'
import { useAdminUsers, useCreateUser, useUpdateUserRole, useDeleteUser, AdminUser } from '@/hooks/useAdminUsers'
import { ClassType } from '@/models/classes'
import { formatCp } from '@/lib/format'
import AdminCharacterModal from './AdminCharacterModal'
import { Character } from '@/app/(main)/characters/page'
import { useAdminDeleteCharacter } from '@/hooks/useAdminUsers'

type Props = { classes: ClassType[] }

type ModalState =
  | { type: 'addUser' }
  | { type: 'addCharacter'; userId: string; userNickname: string }
  | { type: 'editCharacter'; character: Character; userNickname: string }
  | null

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜러', support: '서포터', tank: '탱커',
}

export default function AdminCharacterList({ classes }: Props) {
  const { data: users = [], isLoading } = useAdminUsers()
  const createUser = useCreateUser()
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const deleteChar = useAdminDeleteCharacter()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const [newNickname, setNewNickname] = useState('')
  const [search, setSearch] = useState('')

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAddUser() {
    if (!newNickname.trim()) return
    createUser.mutate(newNickname.trim(), {
      onSuccess: () => { setNewNickname(''); setModal(null) },
    })
  }

  const filtered = users.filter((u) =>
    u.nickname.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return <div className="flex flex-col gap-3">{[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border h-14 animate-pulse" />
    ))}</div>
  }

  return (
    <>
      {/* 검색 + 유저 추가 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="닉네임 검색..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setModal({ type: 'addUser' })}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          + 길드원 추가
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">총 {users.length}명 · {users.reduce((s, u) => s + u.characters.length, 0)}개 캐릭터</p>

      {/* 유저 목록 */}
      <div className="flex flex-col gap-2">
        {filtered.map((user: AdminUser) => {
          const isOpen = expanded.has(user.id)
          return (
            <div key={user.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 유저 헤더 */}
              <div className="flex items-center px-4 py-3 gap-3">
                <button
                  onClick={() => toggleExpand(user.id)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-900 truncate">{user.nickname}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role === 'admin' ? '임원' : '길드원'}
                  </span>
                  {!user.characters.length && (
                    <span className="text-xs text-gray-300 shrink-0">미가입</span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{user.characters.length}캐릭</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateRole.mutate({ id: user.id, role: user.role === 'admin' ? 'member' : 'admin' })}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      user.role === 'admin'
                        ? 'border-purple-200 text-purple-600 hover:bg-purple-50'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {user.role === 'admin' ? '임원 해제' : '임원 지정'}
                  </button>
                  <button
                    onClick={() => { if (confirm(`${user.nickname}을 삭제할까요?`)) deleteUser.mutate(user.id) }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 캐릭터 목록 */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {user.characters.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">등록된 캐릭터 없음</p>
                    ) : (
                      user.characters
                        .slice()
                        .sort((a, b) => b.combat_power - a.combat_power)
                        .map((char) => {
                          const cls = classes.find((c) => c.name === char.class)
                          return (
                            <div key={char.id} className="flex items-center gap-3 py-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800 truncate">{char.nickname}</span>
                                  {cls && (
                                    <span className="text-xs text-gray-500 shrink-0">{cls.label}</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{formatCp(char.combat_power)}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setModal({ type: 'editCharacter', character: char, userNickname: user.nickname })}
                                  className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100"
                                >수정</button>
                                <button
                                  onClick={() => { if (confirm('삭제할까요?')) deleteChar.mutate(char.id) }}
                                  className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50"
                                >삭제</button>
                              </div>
                            </div>
                          )
                        })
                    )}
                    <button
                      onClick={() => setModal({ type: 'addCharacter', userId: user.id, userNickname: user.nickname })}
                      className="text-sm text-blue-500 hover:text-blue-700 text-left mt-1"
                    >
                      + 캐릭터 추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 길드원 추가 모달 */}
      {modal?.type === 'addUser' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">길드원 추가</h2>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
              placeholder="닉네임 입력"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            {createUser.error && (
              <p className="text-red-500 text-sm mb-3">{createUser.error.message}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">취소</button>
              <button
                onClick={handleAddUser}
                disabled={createUser.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
              >
                {createUser.isPending ? '처리 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 추가/수정 모달 */}
      {modal && (modal.type === 'addCharacter' || modal.type === 'editCharacter') && (
        <AdminCharacterModal
          mode={modal.type === 'addCharacter' ? 'add' : 'edit'}
          userId={modal.type === 'addCharacter' ? modal.userId : undefined}
          character={modal.type === 'editCharacter' ? modal.character : undefined}
          userNickname={modal.userNickname}
          classes={classes}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
