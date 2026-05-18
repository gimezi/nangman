import React from 'react'
import { CLASSES } from '@/models/classes'

const CLASS_LABEL = Object.fromEntries(CLASSES.map((c) => [c.name, c.label]))
const CLASS_TYPE = Object.fromEntries(CLASSES.map((c) => [c.name, c.type]))

export const TEAM_NAMES = ['홍팀', '청팀', '청팀']
const TEAM_BG = ['#fff5f5', '#eff6ff', '#f0fdf4']
const TEAM_HEADER_BG = ['#fee2e2', '#dbeafe', '#dcfce7']
const TEAM_COLOR = ['#dc2626', '#2563eb', '#16a34a']

function cp(val: number) {
  return `${(val / 10000).toFixed(1)}만`
}

export function buildTeamImage(
  teamIdx: number,
  teamParties: { partyNumber: number; members: any[] }[],
  raidName: string,
  dateLabel: string
): { element: React.ReactElement; width: number; height: number } {
  const n = teamParties.length
  const teamName = TEAM_NAMES[teamIdx] ?? `팀${teamIdx + 1}`
  const color = TEAM_COLOR[teamIdx] ?? '#6b7280'
  const headerBg = TEAM_HEADER_BG[teamIdx] ?? '#f3f4f6'
  const bg = TEAM_BG[teamIdx] ?? '#f9fafb'

  const maxMembers = Math.max(...teamParties.map((p) => p.members.length), 1)
  const W = 36 + n * 246
  const H = 130 + maxMembers * 38
  const partyW = Math.floor((W - 48 - (n - 1) * 12) / n)

  const element = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: bg,
        padding: '20px 24px 24px',
        fontFamily: 'NotoSansKR',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{teamName}</span>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>
          {raidName} {dateLabel}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {teamParties.map((party, subIdx) => {
          const avg = party.members.length
            ? Math.round(
                party.members.reduce((s: number, m: any) => s + m.combatPower, 0) /
                  party.members.length
              )
            : 0

          return (
            <div
              key={subIdx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: `${partyW}px`,
                background: 'white',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 14px',
                  background: headerBg,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{subIdx + 1}파티</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>평균 {cp(avg)}</span>
              </div>

              {party.members.map((m: any, i: number) => {
                const type = CLASS_TYPE[m.class] ?? 'dealer'
                const typeColor =
                  type === 'support' ? '#16a34a' : type === 'tank' ? '#3b82f6' : '#ef4444'

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '7px 14px',
                      borderBottom: '1px solid #f3f4f6',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{ flex: 1, fontSize: 12, color: '#111827', fontWeight: 500 }}
                    >
                      {m.userNickname}
                    </span>
                    <span style={{ fontSize: 10, color: typeColor, fontWeight: 600 }}>
                      {CLASS_LABEL[m.class] ?? m.class}
                    </span>
                    <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: '4px' }}>
                      {cp(m.combatPower)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )

  return { element, width: W, height: H }
}
