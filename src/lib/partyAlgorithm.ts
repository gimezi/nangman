import { CLASSES } from '@/models/classes'

export type PartyCharacter = {
  id: string
  nickname: string
  class: string
  combat_power: number
  userNickname: string
  isVolunteer?: boolean
  isAdmin?: boolean
}

export type PartySlotCharacter = PartyCharacter & {
  slotId: string
  sourceCharacterId: string
  isDuplicate: boolean
}

export const TEAM_NAMES = ['홍팀', '청팀', '청팀'] as const
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

// v1: 딜러끼리만 스왑
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

// v2: 모든 직업 대상, 차이를 가장 줄이는 스왑 선택
function balanceAverageCpFull(subParties: PartySlotCharacter[][]) {
  if (subParties.length < 2) return

  let changed = true
  let loop = 0

  while (changed && loop < 30) {
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

    let bestSwap: [PartySlotCharacter, PartySlotCharacter] | null = null
    let bestNewDiff = maxAvg - minAvg

    for (const highChar of highParty) {
      for (const lowChar of lowParty) {
        if (wouldCreateUserConflict(highParty, highChar, lowParty, lowChar)) continue
        const newHighAvg = avgCp([...highParty.filter((c) => c.slotId !== highChar.slotId), lowChar])
        const newLowAvg = avgCp([...lowParty.filter((c) => c.slotId !== lowChar.slotId), highChar])
        const newDiff = Math.abs(newHighAvg - newLowAvg)
        if (newDiff < bestNewDiff) {
          bestNewDiff = newDiff
          bestSwap = [highChar, lowChar]
        }
      }
    }

    if (bestSwap) {
      swapCharacters(highParty, bestSwap[0], lowParty, bestSwap[1])
      changed = true
    }
  }
}

// v1: 탱커/서포터 균등 → CP 보정(딜러)
function applyClassBalance(subParties: PartySlotCharacter[][], positions: Record<string, number> = {}) {
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

// v2: 평균 CP 균등화 먼저(모든 직업) → 불균형 직업만 보정
function applyClassBalanceV2(subParties: PartySlotCharacter[][], positions: Record<string, number> = {}) {
  balanceAverageCpFull(subParties)
  balanceTanks(subParties)
  ensureSupport(subParties)
  const hasPositions = Object.keys(positions).length > 0
  subParties.forEach((party) =>
    hasPositions ? sortByPosition(party, positions) : sortByCpDesc(party)
  )
}

// 유저의 charCount개 캐릭터가 들어갈 수 있는 가장 앞의 연속 파티 시작 인덱스를 찾음
function findConsecutiveStart(
  parties: PartySlotCharacter[][],
  charCount: number,
  partySize: number
): number {
  for (let start = 0; ; start++) {
    let valid = true
    for (let i = 0; i < charCount; i++) {
      const pLen = (start + i) < parties.length ? parties[start + i].length : 0
      if (pLen >= partySize) { valid = false; break }
    }
    if (valid) return start
  }
}

// 유저별로 연속된 파티 슬롯에 배치 (1파티 → 2파티 → ... 순서로 앞부터 채움)
function buildTeamParties(
  teamUserList: [string, PartyCharacter[]][],
  partySize: number,
  positions: Record<string, number> = {},
  bench: PartySlotCharacter[] = []
): PartySlotCharacter[][] {
  const sortedUsers = [...teamUserList]
    .map(([userNickname, chars]) => [
      userNickname,
      [...chars].sort((a, b) => b.combat_power - a.combat_power),
    ] as [string, PartyCharacter[]])
    .sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length
      return (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0)
    })

  const parties: PartySlotCharacter[][] = []

  for (const [, chars] of sortedUsers) {
    const charCount = chars.length
    // 이 유저의 캐릭터들이 들어갈 연속 파티 시작 인덱스
    const startIdx = findConsecutiveStart(parties, charCount, partySize)

    while (parties.length < startIdx + charCount) parties.push([])

    // 캐릭터를 연속된 파티에 하나씩 배치 (1파티→2파티→...)
    for (let i = 0; i < charCount; i++) {
      parties[startIdx + i].push(makeSlot(chars[i], false))
    }
  }

  if (!parties.length) return []
  applyClassBalance(parties, positions)
  return parties
}

/**
 * 자동배치:
 * - 다캐릭(≥2) 유저 → 홍팀(0), 단캐릭 유저 → 청팀(1)
 * - 각 팀 내에서 유저 캐릭터는 연속된 파티 슬롯에 배치 (1파티→2파티→...)
 * - 같은 유저 캐릭터는 반드시 서로 다른 파티에 배치
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
    if (!userMap.has(char.userNickname)) userMap.set(char.userNickname, [])
    userMap.get(char.userNickname)!.push(char)
  }

  userMap.forEach((chars) => chars.sort((a, b) => b.combat_power - a.combat_power))

  const sortDesc = (a: [string, PartyCharacter[]], b: [string, PartyCharacter[]]) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length
    return (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0)
  }

  const users = [...userMap.entries()].sort(sortDesc)
  const teamUsers: [string, PartyCharacter[]][][] = Array.from({ length: numTeams }, () => [])

  // 캐릭 많은 순서대로 partySize명씩 팀에 배분
  // 홍팀: 상위 partySize명, 청팀: 다음 partySize명, 나머지는 마지막 팀
  for (let i = 0; i < users.length; i++) {
    const teamIdx = Math.min(Math.floor(i / partySize), numTeams - 1)
    teamUsers[teamIdx].push(users[i])
  }

  const bench: PartySlotCharacter[] = []
  const teams: PartySlotCharacter[][][] = []

  for (const teamUserList of teamUsers) {
    teams.push(
      teamUserList.length
        ? buildTeamParties(teamUserList, partySize, characterPositions, bench)
        : []
    )
  }

  // 유저 → 팀 인덱스 매핑
  const userTeamIdx = new Map<string, number>()
  teams.forEach((team, tIdx) => {
    team.forEach((party) => {
      party.forEach((c) => {
        if (!userTeamIdx.has(c.userNickname)) userTeamIdx.set(c.userNickname, tIdx)
      })
    })
  })

  // 벤치 캐릭터를 자기 팀 빈 슬롯에 재배치
  const finalBench: PartySlotCharacter[] = []
  for (const benchChar of bench) {
    const tIdx = userTeamIdx.get(benchChar.userNickname)
    if (tIdx === undefined) { finalBench.push(benchChar); continue }
    let placed = false
    for (const party of teams[tIdx]) {
      if (party.length < partySize && !party.some((m) => m.userNickname === benchChar.userNickname)) {
        party.push(benchChar)
        placed = true
        break
      }
    }
    if (!placed) finalBench.push(benchChar)
  }
  bench.splice(0, bench.length, ...finalBench)

  return { teams, bench }
}

function buildTeamPartiesV2(
  teamUserList: [string, PartyCharacter[]][],
  partySize: number,
  positions: Record<string, number> = {},
  bench: PartySlotCharacter[] = []
): PartySlotCharacter[][] {
  const sortedUsers = [...teamUserList]
    .map(([userNickname, chars]) => [
      userNickname,
      [...chars].sort((a, b) => b.combat_power - a.combat_power),
    ] as [string, PartyCharacter[]])
    .sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length
      return (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0)
    })

  const parties: PartySlotCharacter[][] = []

  for (const [, chars] of sortedUsers) {
    const charCount = chars.length
    const startIdx = findConsecutiveStart(parties, charCount, partySize)
    while (parties.length < startIdx + charCount) parties.push([])
    for (let i = 0; i < charCount; i++) {
      parties[startIdx + i].push(makeSlot(chars[i], false))
    }
  }

  if (!parties.length) return []
  applyClassBalanceV2(parties, positions)
  return parties
}

/**
 * 자동배치 v2:
 * - 팀 분배 방식은 동일
 * - 파티 내 평균 전투력 균등화 우선 (모든 직업 대상 스왑)
 * - 이후 불균형한 직업만 보정 (diff >= 2)
 */
export function autoAssignTeamsV2(
  characters: PartyCharacter[],
  numTeams: number,
  partySize: number,
  teamPreferences: Record<string, number> = {},
  characterPositions: Record<string, number> = {}
): { teams: PartySlotCharacter[][][]; bench: PartySlotCharacter[] } {
  const userMap = new Map<string, PartyCharacter[]>()

  for (const char of characters) {
    if (!userMap.has(char.userNickname)) userMap.set(char.userNickname, [])
    userMap.get(char.userNickname)!.push(char)
  }

  userMap.forEach((chars) => chars.sort((a, b) => b.combat_power - a.combat_power))

  const sortDesc = (a: [string, PartyCharacter[]], b: [string, PartyCharacter[]]) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length
    return (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0)
  }

  const users = [...userMap.entries()].sort(sortDesc)
  const teamUsers: [string, PartyCharacter[]][][] = Array.from({ length: numTeams }, () => [])

  for (let i = 0; i < users.length; i++) {
    const teamIdx = Math.min(Math.floor(i / partySize), numTeams - 1)
    teamUsers[teamIdx].push(users[i])
  }

  const bench: PartySlotCharacter[] = []
  const teams: PartySlotCharacter[][][] = []

  for (const teamUserList of teamUsers) {
    teams.push(
      teamUserList.length
        ? buildTeamPartiesV2(teamUserList, partySize, characterPositions, bench)
        : []
    )
  }

  const userTeamIdx = new Map<string, number>()
  teams.forEach((team, tIdx) => {
    team.forEach((party) => {
      party.forEach((c) => {
        if (!userTeamIdx.has(c.userNickname)) userTeamIdx.set(c.userNickname, tIdx)
      })
    })
  })

  const finalBench: PartySlotCharacter[] = []
  for (const benchChar of bench) {
    const tIdx = userTeamIdx.get(benchChar.userNickname)
    if (tIdx === undefined) { finalBench.push(benchChar); continue }
    let placed = false
    for (const party of teams[tIdx]) {
      if (party.length < partySize && !party.some((m) => m.userNickname === benchChar.userNickname)) {
        party.push(benchChar)
        placed = true
        break
      }
    }
    if (!placed) finalBench.push(benchChar)
  }
  bench.splice(0, bench.length, ...finalBench)

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