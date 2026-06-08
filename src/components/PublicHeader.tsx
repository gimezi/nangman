import { getSession } from '@/lib/auth'
import Link from 'next/link'

const ADMIN_NAV = [
  { href: '/admin/characters', label: '캐릭터 관리' },
  { href: '/admin/raids', label: '레이드 관리' },
  { href: '/admin/parties', label: '파티 관리' },
]

export default async function PublicHeader() {
  const session = await getSession()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/characters" className="font-bold text-gray-900 shrink-0">
          낭만 길드
        </Link>

        <div className="flex items-center gap-1 min-w-0">
          <Link href="/characters" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">
            캐릭터 목록
          </Link>
          <Link href="/parties" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">
            파티 확인
          </Link>

          {session?.role === 'admin' && (
            <>
              <span className="w-px h-4 bg-gray-200 mx-1 shrink-0" />
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
              <span className="w-px h-4 bg-gray-200 mx-1 shrink-0" />
            </>
          )}

          {session ? (
            <>
              <form action="/api/auth/logout" method="POST">
                <button className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              관리자용
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
