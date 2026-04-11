export type RaidSchedule = {
  id: string
  day_of_week: string
  required_cp: number
  recommended_cp: number
  overwhelming_cp: number
  party_size: number
  deadline_day: string
  deadline_time: string
  is_active: boolean
}

export type RaidWithSchedules = {
  id: string
  name: string
  image_url: string | null
  raid_schedules: RaidSchedule[]
}

export const DAY_LABEL: Record<string, string> = {
  mon: '월요일',
  tue: '화요일',
  wed: '수요일',
  thu: '목요일',
  fri: '금요일',
  sat: '토요일',
  sun: '일요일',
}
