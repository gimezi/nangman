import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/characters', '/parties']
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  const token = request.cookies.get('auth-token')?.value
  const session = token ? await verifyToken(token) : null

  // 토큰 없고 보호된 경로 → 로그인
  if (!session && !isPublic && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 토큰 있고 로그인/회원가입 페이지 → 홈
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|api).*)'],
}
