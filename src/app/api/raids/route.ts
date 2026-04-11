import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('raids')
    .select(`
      id,
      name,
      image_url,
      raid_schedules (
        id,
        day_of_week,
        required_cp,
        recommended_cp,
        overwhelming_cp,
        party_size,
        deadline_day,
        deadline_time,
        is_active
      )
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
