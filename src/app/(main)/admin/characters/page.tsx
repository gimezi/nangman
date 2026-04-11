import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminCharacterList from './AdminCharacterList'
import { CLASSES } from '@/models/classes'

export default async function AdminCharactersPage() {
  const session = await getSession()
  if (session?.role !== 'admin') redirect('/')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">캐릭터 관리</h1>
        <p className="text-sm text-gray-500 mt-1">전체 길드원 캐릭터를 관리해요</p>
      </div>
      <AdminCharacterList classes={CLASSES} />
    </div>
  )
}
