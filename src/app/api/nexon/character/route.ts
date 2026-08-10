import { NextRequest, NextResponse } from 'next/server'

// 서버명 → s 파라미터 매핑
const SERVER_MAP: Record<string, string> = {
  '던컨': '3',
  '리안': '1',
  '에린': '2',
}

export async function POST(req: NextRequest) {
  const { nickname, server } = await req.json()

  const s = SERVER_MAP[server] ?? '3'

  const form = new FormData()
  form.append('t', '1')
  form.append('pageno', '1')
  form.append('s', s)
  form.append('c', '0')
  form.append('search', nickname)

  const res = await fetch('https://mabinogimobile.nexon.com/Ranking/List/rankdata', {
    method: 'POST',
    body: form,
    headers: {
      'Referer': 'https://mabinogimobile.nexon.com/Ranking/List',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: '넥슨 서버 오류' }, { status: 502 })
  }

  const html = await res.text()

  // data-charactername="필릭스용복리" 인 li 찾아서 파싱
  const items = [...html.matchAll(/<li class="item[^"]*">([\s\S]*?)<\/li>/g)]

  for (const [, itemHtml] of items) {
    const nameMatch = itemHtml.match(/data-charactername="([^"]+)"/)
    if (!nameMatch || nameMatch[1] !== nickname) continue

    const classMatch = itemHtml.match(/<dd class="([a-z_]+\d+)">[\s\S]*?<\/dd>/)
    const cpMatch = itemHtml.match(/<dd class="type_1">\s*([\d,]+)\s*<\/dd>/)

    const combat_power = cpMatch ? parseInt(cpMatch[1].replace(/,/g, ''), 10) : null
    const nexon_class = classMatch ? classMatch[1] : null

    return NextResponse.json({ nickname, combat_power, nexon_class })
  }

  return NextResponse.json({ error: '캐릭터를 찾을 수 없어요' }, { status: 404 })
}
