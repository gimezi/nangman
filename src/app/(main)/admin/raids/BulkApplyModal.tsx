'use client'

import { useState, useRef, useEffect } from 'react'
import { useBulkApply, useCreateAndApply, type MissingEntry } from '@/hooks/useAdminRaids'
import { CLASSES } from '@/models/classes'

const CLASS_LABEL = Object.fromEntries(CLASSES.map((c) => [c.name, c.label]))

const DOW_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DOW_KO = ['일','월','화','수','목','금','토']

function toDateString(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getNextOccurrence(targetDow: number): string {
  const today = new Date()
  const daysAhead = (targetDow - today.getDay() + 7) % 7
  const result = new Date(today)
  result.setDate(today.getDate() + daysAhead)
  return toDateString(result.getFullYear(), result.getMonth(), result.getDate())
}

function DatePicker({ value, onChange, targetDow }: {
  value: string
  onChange: (v: string) => void
  targetDow: number
}) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() =>
    value ? parseInt(value.slice(0, 4)) : new Date().getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(() =>
    value ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth()
  )
  const ref = useRef<HTMLDivElement>(null)
  const today = new Date()
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate())

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function selectDate(dateStr: string) {
    onChange(dateStr)
    setOpen(false)
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const displayValue = value
    ? `${value} (${DOW_KO[new Date(value + 'T00:00:00').getDay()]})`
    : '날짜 선택'

  return (
    <div ref={ref} className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={
          'w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm transition-colors ' +
          (open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-gray-400') +
          (value ? ' text-gray-900 font-medium' : ' text-gray-400')
        }
      >
        <span>{displayValue}</span>
        <svg className={'w-4 h-4 text-gray-400 transition-transform ' + (open ? 'rotate-180' : '')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 캘린더 드롭다운 */}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {viewYear}년 {MONTH_KO[viewMonth]}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DOW_KO.map((d, i) => (
              <div key={i} className={
                'py-2 text-center text-xs font-semibold ' +
                (i === targetDow ? 'text-blue-600' : 'text-gray-400')
              }>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 p-2 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-9" />

              const col = i % 7
              const isTarget = col === targetDow
              const dateStr = toDateString(viewYear, viewMonth, day)
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr

              let cls = 'h-9 w-full flex items-center justify-center rounded-full text-sm transition-colors '
              if (isSelected) {
                cls += 'bg-blue-600 text-white font-bold'
              } else if (isToday && isTarget) {
                cls += 'border-2 border-blue-400 text-blue-600 font-semibold hover:bg-blue-50 cursor-pointer'
              } else if (isTarget) {
                cls += 'text-gray-800 hover:bg-blue-100 hover:text-blue-700 cursor-pointer'
              } else {
                cls += 'text-gray-200 cursor-default'
              }

              return (
                <button key={i} type="button" onClick={() => isTarget && selectDate(dateStr)}
                  disabled={!isTarget} className={cls}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

type BulkResult = { inserted: number; skipped: string[]; missing: MissingEntry[] }

type Props = {
  scheduleId: string
  scheduleLabel: string
  dayOfWeek: string
  onClose: () => void
}

export default function BulkApplyModal({ scheduleId, scheduleLabel, dayOfWeek, onClose }: Props) {
  const targetDow = DOW_MAP[dayOfWeek] ?? 1
  const [rawText, setRawText] = useState('')
  const [weekDate, setWeekDate] = useState(() => getNextOccurrence(targetDow))
  const [clearExisting, setClearExisting] = useState(true)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [selectedMissing, setSelectedMissing] = useState<Set<number>>(new Set())
  const [createResult, setCreateResult] = useState<{ created: number; failed: string[] } | null>(null)

  const bulkApply = useBulkApply(scheduleId)
  const createAndApply = useCreateAndApply(scheduleId)

  function handleSubmit() {
    if (!rawText.trim() || !weekDate) return
    setResult(null)
    setCreateResult(null)
    setSelectedMissing(new Set())
    bulkApply.mutate(
      { scheduleId, rawText, weekDate, clearExisting },
      {
        onSuccess: (data) => {
          setResult(data)
          setSelectedMissing(new Set(data.missing.map((_, i) => i)))
          if (data.missing.length === 0) setTimeout(onClose, 1500)
        },
      }
    )
  }

  function toggleMissing(idx: number) {
    setSelectedMissing((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function handleCreateMissing() {
    if (!result || selectedMissing.size === 0) return
    const entries = result.missing.filter((_, i) => selectedMissing.has(i))
    setCreateResult(null)
    createAndApply.mutate(
      { scheduleId, weekDate, entries },
      { onSuccess: (data) => { setCreateResult(data); setTimeout(onClose, 1500) } }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">신청 일괄 등록</h2>
          <p className="text-xs text-gray-400 mt-0.5">{scheduleLabel}</p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">주차 날짜</label>
            <DatePicker value={weekDate} onChange={setWeekDate} targetDow={targetDow} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              신청 목록
              <span className="text-gray-400 font-normal ml-1">
                닉네임/직업/전투력 · <span className="text-indigo-500">(지원)</span> 태그 있으면 지원자로 표시
              </span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'모염/화법/6.3\n무크롱/검술/6.7(지원)\n리오앨리/6.5/전격\n...'}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="rounded"
            />
            기존 신청 삭제 후 등록
          </label>

          {bulkApply.error && (
            <p className="text-sm text-red-500">{bulkApply.error.message}</p>
          )}

          {result && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
                <p className="font-medium text-green-700">
                  {result.inserted}개 등록 완료
                  <span className="text-xs font-normal text-green-600 ml-1.5">
                    (지원 태그는 파티 화면에서 "지원" 뱃지로 표시)
                  </span>
                </p>
              </div>

              {result.skipped.length > 0 && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
                  <p className="font-medium text-gray-500 mb-1.5">유저 없음 — {result.skipped.length}명 패스</p>
                  <div className="flex flex-wrap gap-1">
                    {result.skipped.map((s, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.missing.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-amber-700">캐릭터 없음 — {result.missing.length}개</p>
                    <button
                      onClick={() =>
                        setSelectedMissing(
                          selectedMissing.size === result.missing.length
                            ? new Set()
                            : new Set(result.missing.map((_, i) => i))
                        )
                      }
                      className="text-xs text-amber-600 hover:underline"
                    >
                      {selectedMissing.size === result.missing.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    {result.missing.map((m, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedMissing.has(i)}
                          onChange={() => toggleMissing(i)}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">
                          <span className="font-medium">{m.userNickname}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          {CLASS_LABEL[m.cls] ?? m.cls}
                          <span className="text-gray-400 mx-1">·</span>
                          {m.cp}만
                          {m.isVolunteer && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">지원</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleCreateMissing}
                    disabled={createAndApply.isPending || selectedMissing.size === 0}
                    className="w-full py-2 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:bg-amber-300"
                  >
                    {createAndApply.isPending
                      ? '처리 중...'
                      : `선택 항목 ${selectedMissing.size}개 캐릭 생성 후 등록`}
                  </button>
                </div>
              )}

              {createResult && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
                  <p className="font-medium text-green-700">{createResult.created}개 캐릭 생성 및 등록 완료</p>
                  {createResult.failed.length > 0 && (
                    <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                      {createResult.failed.map((f, i) => <li key={i}>· {f}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            닫기
          </button>
          <button
            onClick={handleSubmit}
            disabled={bulkApply.isPending || !rawText.trim() || !weekDate}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {bulkApply.isPending ? '처리 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
