import RaidApplyClient from './RaidApplyClient'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { CLASSES } from '@/models/classes'

export default async function RaidApplyPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const session = await getSession()

  const [{ data: schedule }, { data: characters }] = await Promise.all([
    supabase
      .from('raid_schedules')
      .select('id, day_of_week, required_cp, recommended_cp, overwhelming_cp, party_size, deadline_day, deadline_time, raids(name)')
      .eq('id', scheduleId)
      .single(),
    supabase
      .from('characters')
      .select('id, nickname, class, combat_power')
      .eq('user_id', session!.userId)
      .order('combat_power', { ascending: false }),
  ])

  if (!schedule) notFound()

  return (
    <RaidApplyClient
      schedule={schedule}
      characters={characters ?? []}
      classes={CLASSES}
      userNickname={session!.nickname}
    />
  )
}
