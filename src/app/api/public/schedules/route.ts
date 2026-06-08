import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('raids')
    .select(`
      id, name,
      raid_schedules ( id, day_of_week, party_size, deadline_day, deadline_time, is_active )
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
