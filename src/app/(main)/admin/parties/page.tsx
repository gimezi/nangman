import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PartyManager from './PartyManager'
import { RaidWithSchedules } from '@/types/raid'

export default async function AdminPartiesPage() {
  const session = await getSession()
  if (session?.role !== 'admin') redirect('/')

  const { data: raids } = await supabase
    .from('raids')
    .select('id, name, image_url, raid_schedules(id, day_of_week, party_size, deadline_day, deadline_time, is_active)')
    .order('created_at')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">파티 관리</h1>
        <p className="text-sm text-gray-500 mt-1">레이드 파티를 자동 배치하고 조정해요</p>
      </div>
      <PartyManager raids={(raids ?? []) as RaidWithSchedules[]} />
    </div>
  )
}
