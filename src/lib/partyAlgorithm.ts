import { CLASSES } from '@/models/classes'

export type PartyCharacter = {
  id: string
  nickname: string
  class: string
  combat_power: number
  userNickname: string
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
  for (let i = 0; i < subParties.length; i++) {
    const target = subParties[i]
    const hasSupport = target.some((c) => getType(c.class) === 'support')

    if (hasSupport || hasEnoughPowerDealer(target)) continue

    for (let j = 0; j < subParties.length; j++) {
      if (i === j) continue

      const donor = subParties[j]
      const donorSupports = donor.filter((c) => getType(c.class) === 'support')
      if (donorSupports.length <= 1) continue

      const receiverDealers = target.filter((c) => getType(c.class) === 'dealer')
      if (!receiverDealers.length) continue

      const giveSupport = donorSupports[donorSupports.length - 1]
      const takeDealer = receiverDealers[receiverDealers.length - 1]

      swapCharacters(donor, giveSupport, target, takeDealer)
      break
    }
  }
}

function balanceTanks(subParties: PartySlotCharacter[][]) {
  let changed = true

  while (changed) {
    changed = false

    const tankCounts = subParties.map((p) => countType(p, 'tank'))
    const maxTank = Math.max(...tankCounts)
    const minTank = Math.min(...tankCounts)

    if (maxTank - minTank < 2) break

    const richIdx = tankCounts.indexOf(maxTank)
    const poorIdx = tankCounts.indexOf(minTank)

    const richParty = subParties[richIdx]
    const poorParty = subParties[poorIdx]

    const giveTank = richParty
      .filter((c) => getType(c.class) === 'tank')
      .sort((a, b) => a.combat_power - b.combat_power)[0]

    const takeDealer = poorParty
      .filter((c) => getType(c.class) === 'dealer')
      .sort((a, b) => a.combat_power - b.combat_power)[0]

    if (!giveTank || !takeDealer) break

    swapCharacters(richParty, giveTank, poorParty, takeDealer)
    changed = true
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

    swapCharacters(highParty, highDealer, lowParty, lowDealer)
    changed = true
  }
}

function applyClassBalance(subParties: PartySlotCharacter[][], positions: Record<string, number> = {}) {
  ensureSupport(subParties)
  balanceTanks(subParties)
  balanceAverageCp(subParties)
  const hasPositions = Object.keys(positions).length > 0
  subParties.forEach((party) =>
    hasPositions ? sortByPosition(party, positions) : sortByCpDesc(party)
  )
}

function chooseBestPartyIndex(
  parties: PartySlotCharacter[][],
  userNickname: string,
  partySize: number,
  preferNoDuplicateUser: boolean
) {
  const candidates = parties
    .map((party, idx) => ({ party, idx }))
    .filter(({ party }) => party.length < partySize)
    .filter(({ party }) =>
      preferNoDuplicateUser
        ? !party.some((member) => member.userNickname === userNickname)
        : true
    )

  if (!candidates.length) return -1

  candidates.sort((a, b) => {
    if (a.party.length !== b.party.length) return a.party.length - b.party.length

    const avgDiff = avgCp(a.party) - avgCp(b.party)
    if (avgDiff !== 0) return avgDiff

    return a.idx - b.idx
  })

  return candidates[0].idx
}

function buildTeamParties(teamUserList: [string, PartyCharacter[]][], partySize: number, positions: Record<string, number> = {}): PartySlotCharacter[][] {
  const totalCharacters = teamUserList.reduce((sum, [, chars]) => sum + chars.length, 0)
  // 한 유저의 캐릭터 수만큼 파티가 있어야 같은 파티에 중복 배치를 막을 수 있음
  const maxUserCharCount = teamUserList.length > 0
    ? Math.max(...teamUserList.map(([, chars]) => chars.length))
    : 0
  const partyCount = Math.max(1, Math.ceil(totalCharacters / partySize), maxUserCharCount)
  const parties: PartySlotCharacter[][] = Array.from({ length: partyCount }, () => [])

  const sortedUsers = [...teamUserList]
    .map(([userNickname, chars]) => [
      userNickname,
      [...chars].sort((a, b) => b.combat_power - a.combat_power),
    ] as [string, PartyCharacter[]])
    .sort((a, b) => (b[1][0]?.combat_power ?? 0) - (a[1][0]?.combat_power ?? 0))

  for (const [userNickname, chars] of sortedUsers) {
    for (const char of chars) {
      // 1순위: 같은 유저가 아직 없는 파티
      let targetIdx = chooseBestPartyIndex(parties, userNickname, partySize, true)

      // 2순위: 어쩔 수 없으면 같은 유저 있어도 넣음
      if (targetIdx === -1) {
        targetIdx = chooseBestPartyIndex(parties, userNickname, partySize, false)
      }

      if (targetIdx === -1) {
        // 이론상 total capacity는 충분해야 하지만, 혹시 모를 안전장치
        parties.push([makeSlot(char, false)])
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

  for (const teamUserList of teamUsers) {
    if (!teamUserList.length) {
      teams.push([])
      continue
    }

    teams.push(buildTeamParties(teamUserList, partySize, characterPositions))
  }

  return { teams, bench: [] }
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