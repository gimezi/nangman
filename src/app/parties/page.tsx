import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import PublicHeader from '@/components/PublicHeader'
import PartiesPublicClient from './PartiesPublicClient'

export const revalidate = 0

export default async function PartiesPage() {
  const [{ data: raids }, session] = await Promise.all([
    supabase
      .from('raids')
      .select(`id, name, raid_schedules ( id, day_of_week, party_size, deadline_day, deadline_time, is_active )`)
      .order('created_at'),
    getSession(),
  ])

  const isAdmin = session?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">파티 확인</h1>
          <p className="text-sm text-gray-500 mt-1">레이드별 파티 구성을 확인해요</p>
        </div>
        <PartiesPublicClient raids={raids ?? []} isAdmin={isAdmin} />
      </main>
    </div>
  )
}
