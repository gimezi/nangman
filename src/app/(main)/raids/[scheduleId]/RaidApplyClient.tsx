'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRaidApplications, useApplyToRaid } from '@/hooks/useRaids'
import { Character } from '@/app/(main)/characters/page'
import { ClassType } from '@/models/classes'
import { DAY_LABEL } from '@/types/raid'
import { formatCp } from '@/lib/format'

type Schedule = {
  id: string
  day_of_week: string
  required_cp: number
  recommended_cp: number
  overwhelming_cp: number
  party_size: number
  deadline_day: string
  deadline_time: string
  raids: { name: string }[] | null
}

type Props = {
  schedule: Schedule
  characters: Character[]
  classes: ClassType[]
  userNickname: string
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

export default function RaidApplyClient({ schedule, characters, classes, userNickname }: Props) {
  const router = useRouter()
  const { data: applicationData, isLoading } = useRaidApplications(schedule.id)
  const applyMutation = useApplyToRaid(schedule.id)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [volunteerCharacterId, setVolunteerCharacterId] = useState<string | null>(null)

  // 본캐: 닉네임이 유저 닉네임과 같은 캐릭터
  const mainChar = characters.find((c) => c.nickname === userNickname)

  // 기존 신청 데이터 로드되면 초기 선택 상태 세팅
  useEffect(() => {
    if (applicationData?.appliedCharacterIds) {
      setSelected(new Set(applicationData.appliedCharacterIds))
    }
    if (applicationData?.volunteerCharacterId !== undefined) {
      setVolunteerCharacterId(applicationData.volunteerCharacterId)
    }
  }, [applicationData])

  function toggleCharacter(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // 본캐 선택 해제 시 지원도 해제
        if (id === volunteerCharacterId) setVolunteerCharacterId(null)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleVolunteer(id: string) {
    setVolunteerCharacterId((prev) => (prev === id ? null : id))
  }

  function getClassInfo(className: string) {
    return classes.find((c) => c.name === className)
  }

  async function handleSubmit() {
    if (!applicationData?.weekDate) return
    applyMutation.mutate(
      {
        scheduleId: schedule.id,
        characterIds: Array.from(selected),
        weekDate: applicationData.weekDate,
        volunteerCharacterId: volunteerCharacterId ?? undefined,
      },
      { onSuccess: () => router.push('/raids') }
    )
  }

  const raidName = schedule.raids?.[0]?.name ?? '레이드'

  return (
    <div>
      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {raidName} — {DAY_LABEL[schedule.day_of_week]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            필요 {formatCp(schedule.required_cp)} · 권장 {formatCp(schedule.recommended_cp)} · 압도 {formatCp(schedule.overwhelming_cp)} · {schedule.party_size}인 파티
          </p>
        </div>
      </div>

      {/* 캐릭터 선택 */}
      <p className="text-sm font-medium text-gray-700 mb-3">
        참여할 캐릭터를 선택하세요
        {selected.size > 0 && (
          <span className="ml-2 text-blue-600">{selected.size}개 선택됨</span>
        )}
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {characters.length === 0 ? (
            <p className="text-center text-gray-400 py-12">등록된 캐릭터가 없어요.</p>
          ) : (
            characters.map((char) => {
              const classInfo = getClassInfo(char.class)
              const isSelected = selected.has(char.id)
              const meetsMin = char.combat_power >= schedule.required_cp
              const isMain = char.id === mainChar?.id
              const isVolunteer = volunteerCharacterId === char.id

              return (
                <div
                  key={char.id}
                  className={`w-full rounded-xl border transition-all ${
                    !meetsMin
                      ? 'border-gray-100 bg-gray-50 opacity-40'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    onClick={() => meetsMin && toggleCharacter(char.id)}
                    disabled={!meetsMin}
                    className="w-full text-left px-5 py-4 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      {/* 체크박스 */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{char.nickname}</span>
                          {isMain && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">
                              본캐
                            </span>
                          )}
                          {classInfo && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_BADGE[classInfo.type]}`}>
                              {TYPE_LABEL[classInfo.type]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                          <span>{classInfo?.label ?? char.class}</span>
                          <span className="text-gray-300">|</span>
                          <span className={
                            char.combat_power >= schedule.overwhelming_cp
                              ? 'text-purple-600 font-medium'
                              : char.combat_power >= schedule.recommended_cp
                              ? 'text-gray-700 font-medium'
                              : 'text-gray-600'
                          }>
                            {formatCp(char.combat_power)}
                            {char.combat_power >= schedule.overwhelming_cp && ' ✦'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* 지원 토글 — 본캐이고 선택된 경우에만 표시 */}
                  {isMain && isSelected && (
                    <div className="px-5 pb-3 flex items-center gap-2">
                      <button
                        onClick={() => toggleVolunteer(char.id)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          isVolunteer
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        {isVolunteer && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        지원
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 신청 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={applyMutation.isPending}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
      >
        {applyMutation.isPending
          ? '처리 중...'
          : selected.size === 0
          ? '신청 취소'
          : `${selected.size}개 캐릭터로 신청하기`}
      </button>

      {applyMutation.error && (
        <p className="text-red-500 text-sm text-center mt-3">{applyMutation.error.message}</p>
      )}
    </div>
  )
}
