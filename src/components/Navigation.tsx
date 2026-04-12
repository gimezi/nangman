'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type NavItem = {
  href: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/characters', label: '내 캐릭터' },
  { href: '/raids', label: '레이드 신청' },
  { href: '/parties', label: '파티 확인' },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/characters', label: '캐릭터 관리' },
  { href: '/admin/raids', label: '레이드 관리' },
  { href: '/admin/parties', label: '파티 관리' },
]

type Props = {
  nickname: string
  role: 'member' | 'admin'
}

export default function Navigation({ nickname, role }: Props) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const allItems = [
    ...NAV_ITEMS,
    ...(role === 'admin' ? ADMIN_NAV_ITEMS : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* 로고 */}
          <span className="font-bold text-gray-900">낭만 길드</span>

          {/* 데스크탑 메뉴 */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {role === 'admin' && (
              <>
                <span className="w-px h-4 bg-gray-200 mx-1" />
                {ADMIN_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
            <span className="w-px h-4 bg-gray-200 mx-1" />
            <form action="/api/auth/logout" method="POST">
              <button className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                로그아웃
              </button>
            </form>
          </div>

          {/* 모바일 햄버거 */}
          <button
            className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium px-2 mb-1">{nickname}</p>
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="POST" className="mt-1">
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              로그아웃
            </button>
          </form>
        </div>
      )}
    </nav>
  )
}
