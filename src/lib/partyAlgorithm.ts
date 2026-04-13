import { CLASSES } from '@/models/classes'

export type PartyCharacter = {
  id: string
  nickname: string
  class: string
  combat_power: number
  userNickname: string
  isVolunteer?: boolean
}

export type PartySlotCharacter = PartyCharacter & {
  slotId: string
  sourceCharacterId: string
  isDuplicate: boolean
}

export const TEAM_NAMES = ['홍팀', '백팀', '청팀'] as const
export type TeamName = (typeof TEAM_NAMES)[number]

function getType(cls: string): 'support' | 'tank' | 'dealer' {
  return CLASSES.find((c) => c.name === cls)?.type ?? 'dealer'
}

export function avgCp(party: Array<PartyCharacter | PartySlotCharacter>): number {
  if (!party.length) return 0
  return Math.round(party.reduce((sum, c) => sum + c.combat_power, 0) / party.length)
}

function countType(
  party: Array<PartyCharacter | PartySlotCharacter>,
  type: 'support' | 'tank' | 'dealer'
) {
  return party.filter((c) => getType(c.class) === type).length
}

function sortByCpDesc(chars: Array<PartyCharacter | PartySlotCharacter>) {
  chars.sort((a, b) => b.combat_power - a.combat_power)
}

function sortByPosition(
  chars: PartySlotCharacter[],
  positions: Record<string, number>
) {
  chars.sort((a, b) => {
    const posA = positions[a.sourceCharacterId] ?? Number.MAX_SAFE_INTEGER
    const posB = positions[b.sourceCharacterId] ?? Number.MAX_SAFE_INTEGER
    if (posA !== posB) return posA - posB
    return b.combat_power - a.combat_power
  })
}

function makeSlot(char: PartyCharacter, isDuplicate = false): PartySlotCharacter {
  return {
    ...char,
    slotId: `${char.id}:${crypto.randomUUID()}`,
    sourceCharacterId: char.id,
    isDuplicate,
  }
}

function wouldCreateUserConflict(
  partyA: PartySlotCharacter[],
  charA: PartySlotCharacter,
  partyB: PartySlotCharacter[],
  charB: PartySlotCharacter
): boolean {
  const afterA = partyA.filter((c) => c.slotId !== charA.slotId)
  if (afterA.some((c) => c.userNickname === charB.userNickname)) return true
  const afterB = partyB.filter((c) => c.slotId !== charB.slotId)
  if (afterB.some((c) => c.userNickname === charA.userNickname)) return true
  return false
}

function swapCharacters(
  partyA: PartySlotCharacter[],
  charA: PartySlotCharacter,
  partyB: PartySlotCharacter[],
  charB: PartySlotCharacter
) {
  const idxA = partyA.findIndex((c) => c.slotId === charA.slotId)
  const idxB = partyB.findIndex((c) => c.slotId === charB.slotId)
  if (idxA === -1 || idxB === -1) return

  partyA[idxA] = charB
  partyB[idxB] = charA
}

function getStrongDealer(party: PartySlotCharacter[]) {
  return party
    .filter((c) => getType(c.class) === 'dealer')
    .sort((a, b) => b.combat_power - a.combat_power)[0]
}

function hasEnoughPowerDealer(party: PartySlotCharacter[], thresholdRate = 1.2) {
  if (!party.length) return false
  const strongDealer = getStrongDealer(party)
  if (!strongDealer) return false
  return strongDealer.combat_power >= avgCp(party) * thresholdRate
}

function ensureSupport(subParties: PartySlotCharacter[][]) {
  let changed = true
  let loop = 0

  while (changed && loop < 30) {
    loop++
    changed = false

    const supportCounts = subParties.map((p) => countType(p, 'support'))
    const maxSupport = Math.max(...supportCounts)
    const minSupport = Math.min(...supportCounts)

    if (maxSupport - minSupport < 2) break

    // 모든 rich-poor 조합 시도
    outer: for (let richIdx = 0; richIdx < subParties.length; richIdx++) {
      if (supportCounts[richIdx] !== maxSupport) continue
      for (let poorIdx = 0; poorIdx < subParties.length; poorIdx++) {
        if (poorIdx === richIdx || supportCounts[poorIdx] !== minSupport) continue

        const rich = subParties[richIdx]
        const poor = subParties[poorIdx]

        // 줄 서포터: 전투력 낮은 순
        const supports = rich
          .filter((c) => getType(c.class) === 'support')
          .sort((a, b) => a.combat_power - b.combat_power)

        // 받을 비서포터: 전투력 낮은 순
        const nonSupports = poor
          .filter((c) => getType(c.class) !== 'support')
          .sort((a, b) => a.combat_power - b.combat_power)

        for (const support of supports) {
          for (const nonSupport of nonSupports) {
            if (!wouldCreateUserConflict(rich, support, poor, nonSupport)) {
              swapCharacters(rich, support, poor, nonSupport)
              changed = true
              break outer
            }
          }
        }
      }
    }
  }
}

function balanceTanks(subParties: PartySlotCharacter[][]) {
  let changed = true
  let loop = 0

  while (changed && loop < 30) {
    loop++
    changed = false

    const tankCounts = subParties.map((p) => countType(p, 'tank'))
    const maxTank = Math.max(...tankCounts)
    const minTank = Math.min(...tankCounts)

    if (maxTank - minTank < 2) break

    // 모든 rich-poor 조합을 시도
    outer: for (let richIdx = 0; richIdx < subParties.length; richIdx++) {
      if (tankCounts[richIdx] !== maxTank) continue
      for (let poorIdx = 0; poorIdx < subParties.length; poorIdx++) {
        if (poorIdx === richIdx || tankCounts[poorIdx] !== minTank) continue

        const rich = subParties[richIdx]
        const poor = subParties[poorIdx]

        // 줄 탱커: 전투력 낮은 순
        const tanks = rich
          .filter((c) => getType(c.class) === 'tank')
          .sort((a, b) => a.combat_power - b.combat_power)

        // 받을 비탱커: 전투력 낮은 순
        const nonTanks = poor
          .filter((c) => getType(c.class) !== 'tank')
          .sort((a, b) => a.combat_power - b.combat_power)

        for (const tank of tanks) {
          for (const nonTank of nonTanks) {
            if (!wouldCreateUserConflict(rich, tank, poor, nonTank)) {
              swapCharacters(rich, tank, poor, nonTank)
              changed = true
              break outer
            }
          }
        }
      }
    }
  }
}

function balanceAverageCp(subParties: PartySlotCharacter[][]) {
  if (subParties.length < 2) return

  let changed = true
  let loop = 0

  while (changed && loop < 10) {
    loop++
    changed = false

    const avgs = subParties.map(avgCp)
    const maxAvg = Math.max(...avgs)
    const minAvg = Math.min(...avgs)

    if (maxAvg - minAvg < 3000) break

    const highIdx = avgs.indexOf(maxAvg)
    const lowIdx = avgs.indexOf(minAvg)

    const highParty = subParties[highIdx]
    const lowParty = subParties[lowIdx]

    const highDealer = highParty
      .filter((c) => getType(c.class) === 'dealer')
      .sort((a, b) => b.combat_power - a.combat_power)[0]

    const lowDealer = lowParty
      .filter((c) => getType(c.class) === 'dealer')
      .sort((a, b) => a.combat_power - b.combat_power)[0]

    if (!highDealer || !lowDealer) break
    if (highDealer.combat_power <= lowDealer.combat_power) break
    if (wouldCreateUserConflict(highParty, highDealer, lowParty, lowDealer)) break

    swapCharacters(highParty, highDealer, lowParty, lowDealer)
    changed = true
  }
}

function applyClassBalance(subParties: PartySlotCharacter[][], positions: Record<string, number> = {}) {
  // 탱커/서포터 균등 분배 우선, 2패스로 안정화
  balanceTanks(subParties)
  ensureSupport(subParties)
  balanceTanks(subParties)
  ensureSupport(subParties)
  balanceAverageCp(subParties)
  const hasPositions = Object.keys(positions).length > 0
  subParties.forEach((party) =>
    hasPositions ? sortByPosition(party, positions) : sortByCpDesc(party)
  )
}

function chooseBestPartyIndex(
  parties: PartySlotCharacter[][],
  char: PartyCharacter,
  partySize: number,
) {
  const charType = getType(char.class)

  const candidates = parties
    .map((party, idx) => ({ party, idx }))
    .filter(({ party }) => party.length < partySize)
    .filter(({ party }) => !party.some((m) => m.userNickname === char.userNickname))

  if (!candidates.length) return -1

  candidates.sort((a, b) => {
    // 서포터/탱커는 해당 타입이 적은 파티 우선
    if (charType === 'support' || charType === 'tank') {
      const diff = countType(a.party, charType) - countType(b.party, charType)
      if (diff !== 0) return diff
    }

    // 인원 적은 파티 우선
    if (a.party.length !== b.party.length) return a.party.length - b.party.length

    // 평균 전투력 낮은 파티 우선 (강한 캐릭터 고르게 분배)
    return avgCp(a.party) - avgCp(b.party)
  })

  return candidates[0].idx
}

function buildTeamParties(
  teamUserList: [string, PartyCharacter[]][],
  partySize: number,
  positions: Record<string, number> = {},
  bench: PartySlotCharacter[] = []
): PartySlotCharacter[][] {
  const totalCharacters = teamUserList.reduce((sum, [, chars]) => sum + chars.length, 0)
  const maxUserCharCount = teamUserList.length > 0
    ? Math.max(...teamUserList.map(([, chars]) => chars.length))
    : 0
  const partyCount = Math.max(1, Math.floor(totalCharacters / partySize), maxUserCharCount)
  const parties: PartySlotCharacter[][] = Array.from({ length: partyCount }, () => [])

  const sortedUsers = [...teamUserList]
    .map(([userNickname, chars]) => [
      userNickname,
      [...chars].sort((a, b) => b.combat_power - a.combat_power),
    ] as [string, PartyCharacter[]])
    .sort((a, b) => (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0))

  for (const [, chars] of sortedUsers) {
    for (const char of chars) {
      // 같은 유저가 없는 파티에만 배치, 없으면 벤치로
      const targetIdx = chooseBestPartyIndex(parties, char, partySize)

      if (targetIdx === -1) {
        bench.push(makeSlot(char, false))
        continue
      }

      parties[targetIdx].push(makeSlot(char, false))
    }
  }

  applyClassBalance(parties, positions)
  return parties
}

/**
 * 자동배치:
 * - teamPreferences(userNickname → teamIdx)가 있으면 해당 팀으로 고정 배치
 * - 나머지 유저는 스네이크 드래프트로 배분
 * - 각 팀의 모든 캐릭터를 다 사용
 * - 팀별로 필요한 파티 수를 자동 계산
 * - 같은 유저 캐릭터는 반드시 서로 다른 파티에 배치
 * - bench는 항상 빈 배열
 */
export function autoAssignTeams(
  characters: PartyCharacter[],
  numTeams: number,
  partySize: number,
  teamPreferences: Record<string, number> = {},
  characterPositions: Record<string, number> = {}
): { teams: PartySlotCharacter[][][]; bench: PartySlotCharacter[] } {
  const userMap = new Map<string, PartyCharacter[]>()

  for (const char of characters) {
    if (!userMap.has(char.userNickname)) {
      userMap.set(char.userNickname, [])
    }
    userMap.get(char.userNickname)!.push(char)
  }

  userMap.forEach((chars) => chars.sort((a, b) => b.combat_power - a.combat_power))

  const users = [...userMap.entries()].sort(
    (a, b) => (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0)
  )

  const teamUsers: [string, PartyCharacter[]][][] = Array.from({ length: numTeams }, () => [])

  // 팀 고정 유저와 아닌 유저 분리
  const preferredUsers: typeof users = []
  const unpreferredUsers: typeof users = []

  for (const user of users) {
    const pref = teamPreferences[user[0]]
    if (pref !== undefined && pref >= 0 && pref < numTeams) {
      preferredUsers.push(user)
    } else {
      unpreferredUsers.push(user)
    }
  }

  // 팀 고정 유저 먼저 배치
  for (const [nick, chars] of preferredUsers) {
    teamUsers[teamPreferences[nick]].push([nick, chars])
  }

  // 나머지 유저는 스네이크 드래프트
  for (let i = 0; i < unpreferredUsers.length; i++) {
    const round = Math.floor(i / numTeams)
    const pos = i % numTeams
    const teamIdx = round % 2 === 0 ? pos : numTeams - 1 - pos
    teamUsers[teamIdx].push(unpreferredUsers[i])
  }

  const teams: PartySlotCharacter[][][] = []
  const bench: PartySlotCharacter[] = []

  for (const teamUserList of teamUsers) {
    if (!teamUserList.length) {
      teams.push([])
      continue
    }

    teams.push(buildTeamParties(teamUserList, partySize, characterPositions, bench))
  }

  return { teams, bench }
}

export function encodePartyNumber(teamIdx: number, subIdx: number): number {
  return teamIdx * 100 + subIdx + 1
}

export function decodePartyNumber(partyNumber: number): { teamIdx: number; subIdx: number } {
  return {
    teamIdx: Math.floor((partyNumber - 1) / 100),
    subIdx: (partyNumber - 1) % 100,
  }
}

export function duplicateSlot(char: PartyCharacter | PartySlotCharacter): PartySlotCharacter {
  return makeSlot(
    {
      id: 'sourceCharacterId' in char ? char.sourceCharacterId : char.id,
      nickname: char.nickname,
      class: char.class,
      combat_power: char.combat_power,
      userNickname: char.userNickname,
    },
    true
  )
}