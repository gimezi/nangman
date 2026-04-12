import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
  const { data } = await supabase
    .from('characters')
    .select('id, nickname, class, user_id, users(nickname)')
    .order('created_at')
    .limit(80)

  // 유저별로 그룹핑
  const byUser: Record<string, { userNick: string; chars: { id: string; nickname: string; class: string }[] }> = {}
  for (const c of data ?? []) {
    const un = (c.users as any)?.nickname ?? 'unknown'
    if (!byUser[un]) byUser[un] = { userNick: un, chars: [] }
    byUser[un].chars.push({ id: c.id, nickname: c.nickname, class: c.class })
  }
  // 11명만 출력
  const users = Object.values(byUser).slice(0, 11)
  console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error)
