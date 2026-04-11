import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminRaidList from './AdminRaidList'

export default async function AdminRaidsPage() {
  const session = await getSession()
  if (session?.role !== 'admin') redirect('/')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">레이드 관리</h1>
        <p className="text-sm text-gray-500 mt-1">레이드 및 스케줄을 관리해요</p>
      </div>
      <AdminRaidList />
    </div>
  )
}
