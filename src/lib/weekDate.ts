const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

/**
 * 다음으로 돌아오는 해당 요일의 마감 시각을 반환.
 * (오늘이 마감 요일이고 아직 마감 전이면 오늘을, 지났으면 다음 주를 반환)
 */
function getNextDeadline(deadlineDay: string, deadlineTime: string): Date {
  const now = new Date()
  const todayIndex = now.getDay()
  const deadlineDayIndex = DAY_MAP[deadlineDay]

  let diff = deadlineDayIndex - todayIndex
  if (diff < 0) diff += 7 // 이번 주 마감이 지났으면 다음 주 기준

  const deadlineDate = new Date(now)
  deadlineDate.setDate(now.getDate() + diff)
  const [h, m] = deadlineTime.split(':').map(Number)
  deadlineDate.setHours(h, m, 0, 0)

  // 오늘이 마감 요일인데 시간이 이미 지난 경우 → 다음 주로
  if (diff === 0 && now > deadlineDate) {
    deadlineDate.setDate(deadlineDate.getDate() + 7)
  }

  return deadlineDate
}

/**
 * 신청 기준 week_date 반환 (마감 전이면 이번 주, 마감 후면 다음 주 레이드 날짜)
 */
export function getWeekDate(
  raidDay: string,
  deadlineDay: string,
  deadlineTime: string
): Date {
  const now = new Date()
  const todayIndex = now.getDay()
  const raidDayIndex = DAY_MAP[raidDay]
  const nextDeadline = getNextDeadline(deadlineDay, deadlineTime)

  // 다음 마감 기준으로 같은 주의 레이드 날짜 계산
  const deadlineWeekStart = new Date(nextDeadline)
  deadlineWeekStart.setDate(nextDeadline.getDate() - nextDeadline.getDay()) // 해당 주 일요일

  const raidDate = new Date(deadlineWeekStart)
  raidDate.setDate(deadlineWeekStart.getDate() + raidDayIndex)
  raidDate.setHours(0, 0, 0, 0)

  return raidDate
}

export function formatWeekDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isDeadlinePassed(deadlineDay: string, deadlineTime: string): boolean {
  const now = new Date()
  const todayIndex = now.getDay()
  const deadlineDayIndex = DAY_MAP[deadlineDay]

  let diff = deadlineDayIndex - todayIndex
  if (diff < 0) diff += 7

  const deadlineDate = new Date(now)
  deadlineDate.setDate(now.getDate() + diff)
  const [h, m] = deadlineTime.split(':').map(Number)
  deadlineDate.setHours(h, m, 0, 0)

  // 오늘이 마감 요일이고 시간이 지났으면 → 마감 (다음 주 신청 기간 중)
  if (diff === 0 && now > deadlineDate) return true

  // 마감 요일이 아직 안 왔으면 → 신청 가능
  return false
}
