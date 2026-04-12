import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { error } = await supabase
    .from('raid_applications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    console.error('삭제 실패:', error.message)
  } else {
    console.log('✅ raid_applications 전체 삭제 완료')
  }
}

main().catch(console.error)
