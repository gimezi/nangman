import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DUMMY_ID = '00000000-0000-0000-0000-000000000000'

async function main() {
  console.log('🗑️  party_members 삭제 중...')
  const { error: e1 } = await supabase.from('party_members').delete().neq('id', DUMMY_ID)
  if (e1) { console.error('❌ party_members 삭제 실패:', e1.message); process.exit(1) }
  console.log('✅ party_members 삭제 완료')

  console.log('🗑️  parties 삭제 중...')
  const { error: e2 } = await supabase.from('parties').delete().neq('id', DUMMY_ID)
  if (e2) { console.error('❌ parties 삭제 실패:', e2.message); process.exit(1) }
  console.log('✅ parties 삭제 완료')

  console.log('🗑️  raid_applications 삭제 중...')
  const { error: e3 } = await supabase.from('raid_applications').delete().neq('id', DUMMY_ID)
  if (e3) { console.error('❌ raid_applications 삭제 실패:', e3.message); process.exit(1) }
  console.log('✅ raid_applications 삭제 완료')

  console.log('🗑️  characters 삭제 중...')
  const { error: e4 } = await supabase.from('characters').delete().neq('id', DUMMY_ID)
  if (e4) { console.error('❌ characters 삭제 실패:', e4.message); process.exit(1) }
  console.log('✅ characters 삭제 완료')

  console.log('\n🎉 초기화 완료! 이제 npm run seed 를 실행하세요.')
}

main().catch(console.error)
