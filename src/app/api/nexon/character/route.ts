import { NextRequest, NextResponse } from 'next/server'

const SERVER_MAP: Record<string, string> = {
  '던컨': '3',
  '리안': '1',
  '에린': '2',
}

const BASE_URL = 'https://mabinogimobile.nexon.com'
const RANKING_URL = `${BASE_URL}/Ranking/List`
const RANKDATA_URL = `${BASE_URL}/Ranking/List/rankdata`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
}

export async function POST(req: NextRequest) {
  const { nickname, server } = await req.json()
  const s = SERVER_MAP[server] ?? '3'

  // 1단계: 랭킹 페이지 GET → 쿠키 수집
  const getRes = await fetch(RANKING_URL, { headers: HEADERS })
  const rawCookies = getRes.headers.getSetCookie?.() ?? []
  const cookieStr = rawCookies.map((c) => c.split(';')[0]).join('; ')
  console.log('[nexon] 받은 쿠키:', cookieStr)

  // 2단계: 쿠키 포함해서 rankdata POST
  const form = new FormData()
  form.append('t', '1')
  form.append('pageno', '1')
  form.append('s', s)
  form.append('c', '0')
  form.append('search', nickname)

  const res = await fetch(RANKDATA_URL, {
    method: 'POST',
    body: form,
    headers: {
      ...HEADERS,
      'Referer': RANKING_URL,
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookieStr ? { 'Cookie': cookieStr } : {}),
    },
  })

  if (!res.ok) {
    console.log('[nexon] HTTP 오류:', res.status)
    return NextResponse.json({ error: `넥슨 서버 오류 ${res.status}` }, { status: 502 })
  }

  const html = await res.text()
  console.log('[nexon] 응답 길이:', html.length)
  console.log('[nexon] 앞 300자:', html.slice(0, 300))

  const items = [...html.matchAll(/<li class="item[^"]*">([\s\S]*?)<\/li>/g)]
  console.log('[nexon] 파싱된 li 개수:', items.length)

  for (const [, itemHtml] of items) {
    const nameMatch = itemHtml.match(/data-charactername="([^"]+)"/)
    if (!nameMatch || nameMatch[1] !== nickname) continue

    const classMatch = itemHtml.match(/<dd class="([a-z_]+\d+)">/)
    const cpMatch = itemHtml.match(/<dd class="type_1">\s*([\d,]+)\s*<\/dd>/)

    return NextResponse.json({
      nickname,
      combat_power: cpMatch ? parseInt(cpMatch[1].replace(/,/g, ''), 10) : null,
      nexon_class: classMatch ? classMatch[1] : null,
    })
  }

  return NextResponse.json({ error: '캐릭터를 찾을 수 없어요' }, { status: 404 })
}
