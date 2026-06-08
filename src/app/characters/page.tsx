import { supabaseAdmin } from '@/lib/supabase'
import CharactersClient from './CharactersClient'
import PublicHeader from '@/components/PublicHeader'

export const revalidate = 60

export default async function CharactersPage() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, nickname, role, characters(id, nickname, class, combat_power, server, taba, abyss, geulgi)')
    .order('created_at')

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">길드원 목록</h1>
          <p className="text-sm text-gray-500 mt-1">낭만 길드 전체 캐릭터 목록이에요</p>
        </div>
        <CharactersClient users={users ?? []} />
      </main>
    </div>
  )
}
