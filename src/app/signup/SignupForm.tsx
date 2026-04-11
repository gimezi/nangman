'use client'

import { useActionState, useState } from 'react'
import { signup } from '@/app/actions/auth'

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, null)
  const [step, setStep] = useState<'nickname' | 'password'>('nickname')
  const [nickname, setNickname] = useState('')

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
        <input
          type="text"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="게임 내 닉네임 입력"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-400 mt-1">길드원 목록에 등록된 닉네임을 입력하세요</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          name="password"
          placeholder="숫자 4자리"
          maxLength={4}
          inputMode="numeric"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
        <input
          type="password"
          name="passwordConfirm"
          placeholder="숫자 4자리 재입력"
          maxLength={4}
          inputMode="numeric"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {state?.error && (
        <p className="text-red-500 text-sm text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {isPending ? '처리 중...' : '회원가입'}
      </button>
    </form>
  )
}
