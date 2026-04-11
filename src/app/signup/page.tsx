import SignupForm from './SignupForm'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">회원가입</h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          길드원 목록에 등록된 닉네임으로 가입하세요
        </p>

        <SignupForm />

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            로그인
          </a>
        </p>
      </div>
    </div>
  )
}
