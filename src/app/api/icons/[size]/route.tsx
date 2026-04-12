import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params
  const size = Math.min(Math.max(parseInt(sizeStr) || 192, 32), 512)
  const radius = Math.round(size * 0.22)
  const fontSize = Math.round(size * 0.44)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          낭
        </span>
      </div>
    ),
    { width: size, height: size }
  )
}
