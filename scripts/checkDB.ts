import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { data: schedules } = await supabase
    .from('raid_schedules')
    .select('id, day_of_week')
    .order('day_of_week')

  const { count } = await supabase
    .from('raid_applications')
    .select('*', { count: 'exact', head: true })

  const { data: sample } = await supabase
    .from('raid_applications')
    .select('id, raid_schedule_id, character_id, week_date')
    .limit(3)

  console.log('schedules:', JSON.stringify(schedules, null, 2))
  console.log('application count:', count)
  console.log('sample:', JSON.stringify(sample, null, 2))
}

main().catch(console.error)
