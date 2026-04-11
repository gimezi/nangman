import LoginForm from './LoginForm'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const session = await getSession()
  if (session) redirect('/')

  const { registered } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">낭만 길드</h1>
        <p className="text-center text-gray-500 text-sm mb-8">길드 관리 시스템</p>

        {registered && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
            회원가입이 완료됐어요! 로그인해주세요.
          </div>
        )}

        <LoginForm />

        <p className="text-center text-sm text-gray-500 mt-6">
          처음이신가요?{' '}
          <a href="/signup" className="text-blue-600 font-medium hover:underline">
            회원가입
          </a>
        </p>
      </div>
    </div>
  )
}
