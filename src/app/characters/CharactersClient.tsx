'use client'

import { useState } from 'react'
import { CLASSES } from '@/models/classes'
import { formatCp } from '@/lib/format'

type Character = {
  id: string
  nickname: string
  class: string
  combat_power: number
  server?: string | null
  bulgari?: boolean
  taba?: boolean
  seokyu?: boolean
  eirel?: boolean
  abyss?: boolean
}

type User = {
  id: string
  nickname: string
  role: 'member' | 'admin'
  characters: Character[]
}

const TYPE_COLOR: Record<string, string> = {
  dealer: 'bg-red-50 text-red-600',
  support: 'bg-green-50 text-green-600',
  tank: 'bg-blue-50 text-blue-600',
}

const TYPE_LABEL: Record<string, string> = {
  dealer: '딜러', support: '서포터', tank: '탱커',
}

type EditState =
  | { type: 'nickname'; charId: string; value: string }
  | { type: 'class'; charId: string; top: number; left: number }
  | { type: 'combat_power'; charId: string; value: string }
  | { type: 'server'; charId: string; value: string }
  | null

async function patchCharacter(id: string, body: Record<string, unknown>) {
  await fetch(`/api/public/characters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── 닉네임 수정 모달 ───────────────────────────────────────────
function NicknameModal({
  charId, initial, onSave, onClose,
}: { charId: string; initial: string; onSave: (id: string, v: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial)

  function handleSave() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initial) onSave(charId, trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">캐릭터 이름 변경</h2>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 직업 선택 팝오버 ───────────────────────────────────────────
function ClassPopover({
  charId, current, top, left, onSave, onClose,
}: { charId: string; current: string; top: number; left: number; onSave: (id: string, v: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')

  const groups = (['support', 'tank', 'dealer'] as const).flatMap((type) => {
    const classes = CLASSES.filter(
      (c) => c.type === type && (c.label.includes(search) || TYPE_LABEL[type].includes(search))
    )
    return classes.length ? [{ type, classes }] : []
  })

  function handleSelect(name: string) {
    if (name !== current) onSave(charId, name)
    onClose()
  }

  // 화면 아래로 넘치면 위쪽에 표시
  const popoverHeight = 320
  const adjustedTop = top + popoverHeight > window.innerHeight ? top - popoverHeight - 8 : top

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-52 overflow-hidden"
        style={{ top: adjustedTop, left: Math.min(left, window.innerWidth - 220) }}
      >
        <div className="p-2 border-b border-gray-100">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="직업 검색..."
            className="w-full px-3 py-1.5 text-sm bg-gray-50 rounded-lg focus:outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {groups.map(({ type, classes }) => (
            <div key={type}>
              <p className="px-3 py-1 text-xs text-gray-400 font-semibold">{TYPE_LABEL[type]}</p>
              {classes.map((cls) => (
                <button
                  key={cls.name}
                  onClick={() => handleSelect(cls.name)}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 ${cls.name === current ? 'bg-blue-50/60' : ''}`}
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[cls.type]}`}>{cls.label}</span>
                  {cls.name === current && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">검색 결과 없음</p>
          )}
        </div>
      </div>
    </>
  )
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function CharactersClient({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<EditState>(null)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateChar(charId: string, updates: Partial<Character>) {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        characters: u.characters.map((c) => (c.id === charId ? { ...c, ...updates } : c)),
      }))
    )
  }

  function saveNickname(charId: string, nickname: string) {
    updateChar(charId, { nickname })
    patchCharacter(charId, { nickname })
  }

  function saveClass(charId: string, cls: string) {
    updateChar(charId, { class: cls })
    patchCharacter(charId, { class: cls })
  }

  function saveCp(charId: string, raw: string) {
    const cp = Math.round(parseInt(raw, 10) / 1000) * 1000
    if (isNaN(cp) || cp <= 0) return
    updateChar(charId, { combat_power: cp })
    patchCharacter(charId, { combat_power: cp })
  }

  function saveServer(charId: string, server: string) {
    const val = server.trim() || null
    updateChar(charId, { server: val })
    patchCharacter(charId, { server: val })
  }

  function toggleRaid(charId: string, field: 'bulgari' | 'taba' | 'seokyu' | 'eirel' | 'abyss') {
    const char = users.flatMap((u) => u.characters).find((c) => c.id === charId)
    if (!char) return
    const next = !char[field]
    updateChar(charId, { [field]: next })
    patchCharacter(charId, { [field]: next })
  }

  function openClass(e: React.MouseEvent, charId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setEditing({ type: 'class', charId, top: rect.bottom + 4, left: rect.left })
  }

  const filtered = users.filter((u) =>
    u.nickname.toLowerCase().includes(search.toLowerCase()) ||
    u.characters.some((c) => c.nickname.toLowerCase().includes(search.toLowerCase()))
  )

  const totalChars = users.reduce((s, u) => s + u.characters.length, 0)

  function renderCharCells(char: Character) {
    const cls = CLASSES.find((c) => c.name === char.class)
    const isEditingCp = editing?.type === 'combat_power' && editing.charId === char.id
    const isEditingServer = editing?.type === 'server' && editing.charId === char.id

    return (
      <>
        {/* 캐릭터 이름 */}
        <td className="px-4 py-2.5">
          <button
            onClick={() => { setEditing({ type: 'nickname', charId: char.id, value: char.nickname }) }}
            className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
          >
            {char.nickname}
          </button>
        </td>

        {/* 직업 */}
        <td className="px-4 py-2.5">
          <button onClick={(e) => openClass(e, char.id)} className="hover:opacity-75 transition-opacity">
            {cls
              ? <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[cls.type]}`}>{cls.label}</span>
              : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">선택</span>
            }
          </button>
        </td>

        {/* 전투력 */}
        <td className="px-4 py-2.5 text-right">
          {isEditingCp ? (
            <input
              autoFocus
              type="number"
              step={1000}
              value={(editing as { value: string }).value}
              onChange={(e) => setEditing({ type: 'combat_power', charId: char.id, value: e.target.value })}
              onBlur={() => { saveCp(char.id, (editing as { value: string }).value); setEditing(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { saveCp(char.id, (editing as { value: string }).value); setEditing(null) }
                if (e.key === 'Escape') setEditing(null)
              }}
              className="w-24 text-right px-2 py-1 border border-blue-400 rounded-lg text-sm focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { setEditing({ type: 'combat_power', charId: char.id, value: char.combat_power.toString() }) }}
              className="tabular-nums text-gray-600 hover:text-blue-600 transition-colors"
            >
              {formatCp(char.combat_power)}
            </button>
          )}
        </td>

        {/* 서버 */}
        <td className="px-4 py-2.5 hidden sm:table-cell">
          {isEditingServer ? (
            <input
              autoFocus
              type="text"
              value={(editing as { value: string }).value}
              onChange={(e) => setEditing({ type: 'server', charId: char.id, value: e.target.value })}
              onBlur={() => { saveServer(char.id, (editing as { value: string }).value); setEditing(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { saveServer(char.id, (editing as { value: string }).value); setEditing(null) }
                if (e.key === 'Escape') setEditing(null)
              }}
              className="w-20 px-2 py-1 border border-blue-400 rounded-lg text-sm focus:outline-none"
              placeholder="서버"
            />
          ) : (
            <button
              onClick={() => { setEditing({ type: 'server', charId: char.id, value: char.server ?? '' }) }}
              className="text-gray-400 hover:text-blue-600 transition-colors text-left"
            >
              {char.server || <span className="text-gray-200">—</span>}
            </button>
          )}
        </td>

        {/* 레이드 참여 토글 */}
        {(['bulgari', 'taba', 'seokyu', 'eirel', 'abyss'] as const).map((field) => (
          <td key={field} className="px-2 py-2.5 text-center">
            <button
              onClick={() => { toggleRaid(char.id, field) }}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                char[field]
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
              }`}
            >
              {char[field] ? '✓' : ''}
            </button>
          </td>
        ))}
      </>
    )
  }

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="닉네임 검색..."
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />
      <p className="text-xs text-gray-400 mb-3">총 {users.length}명 · {totalChars}개 캐릭터</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">캐릭터</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">직업</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">전투력</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">서버</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">붉라리</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">타바</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">서큐</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">에이렐</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">어비스</th>
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((user) => {
                const isOpen = expanded.has(user.id)
                const chars = [...user.characters].sort((a, b) => b.combat_power - a.combat_power)
                const main = chars[0]
                const canExpand = chars.length > 1

                if (!isOpen || !canExpand) {
                  return [
                    <tr
                      key={user.id}
                      onClick={(e) => {
                        if (!canExpand) return
                        if ((e.target as HTMLElement).closest('button, input')) return
                        toggle(user.id)
                      }}
                      className={`border-t border-gray-100 first:border-t-0 ${canExpand ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <td className="pl-3 pr-1 py-2.5 text-center">
                        {canExpand && (
                          <svg className="w-3.5 h-3.5 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </td>
                      {main ? renderCharCells(main) : (
                        <>
                          <td className="px-4 py-2.5 text-gray-300">—</td>
                          <td /><td /><td className="hidden sm:table-cell" />
                          <td /><td /><td /><td /><td />
                        </>
                      )}
                    </tr>,
                  ]
                }

                return chars.map((char, idx) => (
                  <tr
                    key={char.id}
                    onClick={(e) => {
                      if (idx !== 0) return
                      if ((e.target as HTMLElement).closest('button, input')) return
                      toggle(user.id)
                    }}
                    className={`border-t ${idx === 0 ? 'border-gray-100 first:border-t-0 cursor-pointer hover:bg-gray-50' : 'border-gray-50'}`}
                  >
                    <td className="pl-3 pr-1 py-2.5 text-center">
                      {idx === 0 && (
                        <svg className="w-3.5 h-3.5 text-gray-400 rotate-90 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </td>
                    {renderCharCells(char)}
                  </tr>
                ))
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">검색 결과 없음</div>
          )}
        </div>
      </div>

      {/* 닉네임 수정 모달 */}
      {editing?.type === 'nickname' && (
        <NicknameModal
          charId={editing.charId}
          initial={editing.value}
          onSave={saveNickname}
          onClose={() => setEditing(null)}
        />
      )}

      {/* 직업 선택 팝오버 */}
      {editing?.type === 'class' && (
        <ClassPopover
          charId={editing.charId}
          current={users.flatMap((u) => u.characters).find((c) => c.id === editing.charId)?.class ?? ''}
          top={editing.top}
          left={editing.left}
          onSave={saveClass}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
