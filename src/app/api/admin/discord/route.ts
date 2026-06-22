import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { ImageResponse } from 'next/og'
import { buildTeamImage, TEAM_NAMES } from './partyImage'

let cachedFonts: { name: string; data: ArrayBuffer; weight: 400 }[] | null = null

async function getFonts() {
  if (cachedFonts) return cachedFonts
  const [korean, latin] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff').then((r) => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff').then((r) => r.arrayBuffer()),
  ])
  cachedFonts = [
    { name: 'NotoSansKR', data: korean, weight: 400 },
    { name: 'NotoSansKR', data: latin, weight: 400 },
  ]
  return cachedFonts
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { parties, weekDate, raidName } = await request.json()

  const dateLabel = weekDate
    ? (() => {
        const d = new Date(weekDate + 'T00:00:00')
        return `${d.getMonth() + 1}/${d.getDate()}`
      })()
    : ''

  // 팀별 그룹핑
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamMap = new Map<number, { partyNumber: number; members: any[] }[]>()
  for (const party of parties) {
    const teamIdx = Math.floor((party.partyNumber - 1) / 100)
    if (!teamMap.has(teamIdx)) teamMap.set(teamIdx, [])
    teamMap.get(teamIdx)!.push(party)
  }
  const sortedTeams = [...teamMap.entries()].sort(([a], [b]) => a - b)

  let fonts: Awaited<ReturnType<typeof getFonts>>
  try {
    fonts = await getFonts()
  } catch (e) {
    return NextResponse.json({ error: `폰트 로드 실패: ${e}` }, { status: 500 })
  }

  // 팀마다 이미지 생성
  const images: { name: string; buffer: ArrayBuffer }[] = []
  for (const [teamIdx, teamParties] of sortedTeams) {
    try {
      const { element, width, height } = buildTeamImage(teamIdx, teamParties, raidName, dateLabel)
      const img = new ImageResponse(element, { width, height, fonts })
      images.push({
        name: `${TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`}.png`,
        buffer: await img.arrayBuffer(),
      })
    } catch (e) {
      return NextResponse.json({ error: `이미지 생성 실패: ${e}` }, { status: 500 })
    }
  }

  // Discord 포럼 채널에 파일 첨부로 전송
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL!
  const threadName = `${raidName} ${dateLabel} 파티 구성`.trim() || '파티 구성'

  const formData = new FormData()
  formData.append('payload_json', JSON.stringify({ thread_name: threadName }))
  images.forEach(({ name, buffer }, i) => {
    formData.append(`files[${i}]`, new Blob([buffer], { type: 'image/png' }), name)
  })

  try {
    const res = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ error: `Discord 전송 실패: ${e}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
